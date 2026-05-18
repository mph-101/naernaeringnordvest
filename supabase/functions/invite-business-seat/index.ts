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

    const { data: account } = await sbAdmin
      .from("business_accounts")
      .select("id, owner_user_id, seat_count, status")
      .eq("id", parsed.data.businessAccountId)
      .maybeSingle();

    if (!account) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (account.owner_user_id !== ownerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Check seat capacity
    const { count } = await sbAdmin
      .from("business_seats")
      .select("*", { count: "exact", head: true })
      .eq("business_account_id", account.id);
    if ((count ?? 0) >= (account.seat_count ?? 1)) {
      return new Response(
        JSON.stringify({ error: `Du har brukt alle ${account.seat_count} seter. Oppgrader for flere.` }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();

    // Look up existing user by email
    const { data: usersList } = await sbAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = (usersList?.users ?? []).find(
      (u) => (u.email ?? "").toLowerCase() === email
    );

    const inviteToken = genToken();
    await sbAdmin.from("business_seats").upsert(
      {
        business_account_id: account.id,
        email,
        user_id: existingUser?.id ?? null,
        invite_token: existingUser ? null : inviteToken,
        accepted_at: existingUser ? new Date().toISOString() : null,
        source: "invite",
      },
      { onConflict: "business_account_id,email" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        linkedDirectly: !!existingUser,
        inviteToken: existingUser ? null : inviteToken,
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