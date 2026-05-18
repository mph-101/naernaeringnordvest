import { createClient } from "npm:@supabase/supabase-js@2";
import sodium from "npm:libsodium-wrappers-sumo@0.7.15";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Verify caller identity and role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create a client with the caller's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check role via service client
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roles } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "journalist"]);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin or journalist role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { tip_id, private_key } = await req.json();
    if (!tip_id || !private_key) {
      return new Response(
        JSON.stringify({ error: "tip_id and private_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch encrypted email
    const { data: tip, error: tipError } = await serviceClient
      .from("tips")
      .select("follow_up_email_encrypted")
      .eq("id", tip_id)
      .single();

    if (tipError || !tip) {
      return new Response(
        JSON.stringify({ error: "Tip not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tip.follow_up_email_encrypted) {
      return new Response(
        JSON.stringify({ error: "No encrypted email for this tip" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt
    await sodium.ready;
    const publicKeyB64 = Deno.env.get("TIP_ENCRYPTION_PUBLIC_KEY");
    if (!publicKeyB64) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const publicKey = sodium.from_base64(publicKeyB64, sodium.base64_variants.ORIGINAL);
    const secretKey = sodium.from_base64(private_key, sodium.base64_variants.ORIGINAL);

    // Supabase returns bytea as hex string prefixed with \x
    const hexStr = tip.follow_up_email_encrypted.replace(/^\\x/, "");
    const ciphertext = new Uint8Array(
      hexStr.match(/.{2}/g)!.map((b: string) => parseInt(b, 16))
    );

    const decrypted = sodium.crypto_box_seal_open(ciphertext, publicKey, secretKey);
    const email = sodium.to_string(decrypted);

    return new Response(
      JSON.stringify({ email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Decryption error:", error);
    return new Response(
      JSON.stringify({ error: "Decryption failed — invalid key or corrupted data" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
