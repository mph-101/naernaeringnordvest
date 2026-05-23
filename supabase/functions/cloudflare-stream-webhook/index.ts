import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Receives webhook events from Cloudflare Stream about live inputs.
// Cloudflare posts JSON like:
//   {
//     "input_id": "<uid>",
//     "event_type": "live_input.connected" | "live_input.disconnected" | ...,
//     "meta": { "user_id": "<our supabase user uuid>" }
//   }
//
// Signature verification: Cloudflare signs the body with HMAC-SHA256 using
// a webhook secret we configure on their side. They send:
//   webhook-signature: time=<unix>,sig1=<hex>
// If CLOUDFLARE_WEBHOOK_SECRET is set we require a valid signature;
// otherwise we accept (useful during initial setup but should be enabled
// before going live).
//
// On stream_start: set status='live', started_at=now(), insert a
// 'user_stream_start' notification for every follower.
// On stream_end: set status='ended', ended_at=now(). No notification.

async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get("CLOUDFLARE_WEBHOOK_SECRET");
  if (!secret) {
    // Not configured yet - accept but log loudly
    console.warn("cloudflare-stream-webhook: CLOUDFLARE_WEBHOOK_SECRET not set, accepting unverified");
    return true;
  }
  const sigHeader = req.headers.get("webhook-signature");
  if (!sigHeader) {
    console.warn("cloudflare-stream-webhook: missing webhook-signature header");
    return false;
  }
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v?.trim()];
    })
  );
  if (!parts.time || !parts.sig1) return false;

  const data = `${parts.time}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const computed = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === parts.sig1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const rawBody = await req.text();
    const ok = await verifySignature(req, rawBody);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    let payload: any = {};
    try { payload = JSON.parse(rawBody); } catch { /* tolerate empty */ }

    const inputUid: string | undefined = payload?.input_id || payload?.uid;
    const eventType: string | undefined = payload?.event_type || payload?.notificationName;
    if (!inputUid || !eventType) {
      return new Response(JSON.stringify({ ok: true, message: "Nothing to do" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up our live_streams row by Cloudflare UID
    const { data: streamRow } = await sb
      .from("live_streams")
      .select("id, user_id, title, status")
      .eq("provider_input_uid", inputUid)
      .maybeSingle();

    if (!streamRow) {
      console.warn(`cloudflare-stream-webhook: unknown input ${inputUid}`);
      return new Response(JSON.stringify({ ok: true, message: "Unknown input" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const isStart =
      eventType === "live_input.connected" ||
      eventType === "live_input.live" ||
      eventType === "live.started";
    const isEnd =
      eventType === "live_input.disconnected" ||
      eventType === "live_input.ended" ||
      eventType === "live.ended";

    if (isStart) {
      // Only emit notifications on the transition idle/ended -> live
      const wasLive = streamRow.status === "live";

      await sb
        .from("live_streams")
        .update({ status: "live", started_at: new Date().toISOString(), ended_at: null })
        .eq("id", streamRow.id);

      if (!wasLive) {
        // Get the journalist's username so notifications can deep-link
        const { data: profile } = await sb
          .from("profiles")
          .select("username, display_name")
          .eq("user_id", streamRow.user_id)
          .maybeSingle();

        const { data: followers } = await sb
          .from("user_follows")
          .select("follower_id")
          .eq("followee_id", streamRow.user_id);

        if (followers && followers.length > 0) {
          const inserts = followers.map((f: any) => ({
            user_id: f.follower_id,
            type: "user_stream_start",
            orgnr: null,
            company_name: null,
            payload: {
              stream_id: streamRow.id,
              title: streamRow.title,
              by_user_id: streamRow.user_id,
              by_display_name: (profile as any)?.display_name,
              by_username: (profile as any)?.username,
            },
          }));
          await sb.from("notifications").insert(inserts);
        }
      }

      return new Response(JSON.stringify({ ok: true, action: "started" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (isEnd) {
      await sb
        .from("live_streams")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", streamRow.id);

      return new Response(JSON.stringify({ ok: true, action: "ended" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, action: "ignored", event_type: eventType }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cloudflare-stream-webhook:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
