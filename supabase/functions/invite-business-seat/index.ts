import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

import { corsHeaders } from "../_shared/cors.ts";

const BodySchema = z.object({
  businessAccountId: z.string().uuid(),
  email: z.string().email().max(200),
});

function genToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Owner of a business account invites a colleague by email.
 * Creates a pending business_seats row with an invite_token.
 * If the email matches an existing user, the seat is linked immediately.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const sbUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await sbUser.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const ownerId = claimsData.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const sbAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const email = parsed.data.email.toLowerCase().trim();
    const inviteToken = genToken();

    // Atomic claim: ownership check, capacity check, existing-user lookup and
    // seat insert/update happen in ONE statement behind a row lock on the
    // account (claim_business_seat RPC). Replaces the racy count-then-upsert
    // and the O(all-users) listUsers scan.
    const { data: claim, error: claimErr } = await sbAdmin.rpc("claim_business_seat", {
      _account_id: parsed.data.businessAccountId,
      _owner_id: ownerId,
      _email: email,
      _invite_token: inviteToken,
    });
    if (claimErr) throw new Error(`claim_business_seat failed: ${claimErr.message}`);

    const result = Array.isArray(claim) ? claim[0] : claim;
    if (!result || result.status === "not_found") {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (result.status === "forbidden") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (result.status === "full") {
      return new Response(
        JSON.stringify({ error: "Du har brukt alle setene dine. Oppgrader for flere." }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const linkedDirectly = !!result.linked;
    return new Response(
      JSON.stringify({
        success: true,
        linkedDirectly,
        inviteToken: linkedDirectly ? null : inviteToken,
      }),
      { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("invite-business-seat error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});