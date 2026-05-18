import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ALLOWED_TOPICS = new Set([
  "morning_brief",
  "weekly_brief",
  "sector_brief",
  "articles",
  "jobs",
  "job_changes",
]);
const ALLOWED_FREQ = new Set(["daily", "weekly"]);

function isValidToken(t: unknown): t is string {
  return typeof t === "string" && /^[a-f0-9]{32,128}$/i.test(t);
}

function sanitizeTopics(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const v of input) {
    if (typeof v !== "string" || v.length > 64) continue;
    if (ALLOWED_TOPICS.has(v) || v.startsWith("sector:")) out.push(v);
  }
  return Array.from(new Set(out)).slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!isValidToken(token)) {
        return json({ error: "invalid_token" }, 400);
      }
      const { data, error } = await supabase
        .from("newsletter_subscriptions")
        .select("email, topics, frequency, unsubscribed_at")
        .eq("unsubscribe_token", token)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "not_found" }, 404);
      return json(data);
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "invalid_body" }, 400);
      const { token, action } = body as { token?: unknown; action?: unknown };
      if (!isValidToken(token)) return json({ error: "invalid_token" }, 400);

      if (action === "unsubscribe") {
        const { error } = await supabase
          .from("newsletter_subscriptions")
          .update({ unsubscribed_at: new Date().toISOString() })
          .eq("unsubscribe_token", token);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, unsubscribed: true });
      }

      if (action === "update") {
        const topics = sanitizeTopics((body as any).topics);
        const frequencyRaw = (body as any).frequency;
        const frequency = ALLOWED_FREQ.has(frequencyRaw) ? frequencyRaw : "weekly";
        if (topics.length === 0) {
          return json({ error: "no_topics" }, 400);
        }
        const { error } = await supabase
          .from("newsletter_subscriptions")
          .update({ topics, frequency, unsubscribed_at: null })
          .eq("unsubscribe_token", token);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      return json({ error: "invalid_action" }, 400);
    }

    return json({ error: "method_not_allowed" }, 405);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}