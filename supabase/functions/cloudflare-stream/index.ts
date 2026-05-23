import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Cloudflare Stream Live wrapper. Action-based pattern matches brreg-proxy.
//
// Required secrets:
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_STREAM_API_TOKEN  - must have Stream:Edit permission
//
// Actions:
//   create_input  POST {title?, description?}
//     - creates a Cloudflare Live Input
//     - inserts a row into live_streams owned by the caller
//     - returns { id, rtmps_url, stream_key, playback_id, ... }
//
//   list (default for GET)
//     - returns the caller's streams
//
//   delete  DELETE /id
//     - deletes the Cloudflare input and sets status='disabled' locally

const CF_API = "https://api.cloudflare.com/client/v4";
const PUBLIC_ROLES = new Set(["journalist", "contributor", "editor"]);

function bad(req: Request, status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

async function verifyJournalist(req: Request): Promise<{ userId: string } | Response> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return bad(req, 401, "Missing Authorization");

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: u, error } = await userClient.auth.getUser();
  if (error || !u?.user) return bad(req, 401, "Invalid token");

  const { data: roles } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id);
  const ok = (roles || []).some((r: any) => PUBLIC_ROLES.has(r.role));
  if (!ok) return bad(req, 403, "Forbidden: requires journalist/contributor/editor role");

  return { userId: u.user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (req.method === "POST" ? "create_input" : "list");

    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");
    if (!accountId || !apiToken) {
      return bad(req, 500, "Cloudflare Stream not configured (set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN)");
    }

    const auth = await verifyJournalist(req);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const sbAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ----- create_input -----
    if (action === "create_input") {
      let payload: any = {};
      try { payload = await req.json(); } catch { /* no body is fine */ }
      const title = (payload?.title || "").toString().slice(0, 200) || null;
      const description = (payload?.description || "").toString().slice(0, 2000) || null;

      // Tell Cloudflare to create a Live Input. The `meta.user_id` field is
      // echoed back in webhook payloads, which is how we map events back
      // to a Supabase user.
      const cfRes = await fetch(`${CF_API}/accounts/${accountId}/stream/live_inputs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meta: { user_id: userId, name: title || `Stream for ${userId}` },
          recording: { mode: "automatic", timeoutSeconds: 30 },
          defaultCreator: userId,
        }),
      });

      if (!cfRes.ok) {
        const errText = await cfRes.text();
        return bad(req, 502, `Cloudflare error ${cfRes.status}: ${errText}`);
      }

      const cfData = await cfRes.json();
      const result = cfData?.result;
      if (!result?.uid) {
        return bad(req, 502, "Cloudflare did not return a live input UID");
      }

      const rtmps = result.rtmps?.url || null;
      const streamKey = result.rtmps?.streamKey || null;
      const playbackId = result.uid;  // Cloudflare uses the UID as playback ID

      const { data: inserted, error: insErr } = await sbAdmin
        .from("live_streams")
        .insert({
          user_id: userId,
          provider: "cloudflare",
          provider_input_uid: result.uid,
          rtmps_url: rtmps,
          stream_key: streamKey,
          playback_id: playbackId,
          title,
          description,
          status: "idle",
        })
        .select()
        .single();

      if (insErr) {
        return bad(req, 500, `DB insert failed: ${insErr.message}`);
      }

      return new Response(JSON.stringify({ ok: true, stream: inserted }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ----- list -----
    if (action === "list") {
      const { data, error } = await sbAdmin
        .from("live_streams")
        .select("*")
        .eq("user_id", userId)
        .neq("status", "disabled")
        .order("created_at", { ascending: false });
      if (error) return bad(req, 500, error.message);
      return new Response(JSON.stringify({ streams: data || [] }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ----- delete -----
    if (action === "delete") {
      const id = url.searchParams.get("id");
      if (!id) return bad(req, 400, "id required");

      const { data: existing } = await sbAdmin
        .from("live_streams")
        .select("user_id, provider_input_uid")
        .eq("id", id)
        .maybeSingle();
      if (!existing) return bad(req, 404, "Not found");
      if (existing.user_id !== userId) return bad(req, 403, "Forbidden");

      // Delete from Cloudflare first; ignore errors so a broken Cloudflare
      // input still gets disabled locally.
      await fetch(`${CF_API}/accounts/${accountId}/stream/live_inputs/${existing.provider_input_uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiToken}` },
      }).catch(() => {});

      await sbAdmin
        .from("live_streams")
        .update({ status: "disabled", stream_key: null, rtmps_url: null })
        .eq("id", id);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return bad(req, 400, `Unknown action: ${action}`);
  } catch (e) {
    console.error("cloudflare-stream:", e);
    return bad(req, 500, e instanceof Error ? e.message : String(e));
  }
});
