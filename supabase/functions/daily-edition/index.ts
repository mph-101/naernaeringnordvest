// Returnerer dagens kø av publiserte artikler for region.
// Input: { regionSlug?: string }
// Output: { articles: [{id, title, author, excerpt, region_slug, image_url, premium}], hasVoiceSupport: bool }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const regionSlug: string | undefined = body.regionSlug;

    // Hent siste 24t publiserte saker, evt filtrert på region
    const since = new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString();
    let q = admin
      .from("articles")
      .select("id, title, excerpt, author, premium, region_slug, image_url, published_at")
      .eq("published", true)
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(20);
    if (regionSlug) q = q.eq("region_slug", regionSlug);

    const { data: articles, error } = await q;
    if (error) return json({ error: error.message }, 500);

    const hasVoiceSupport = !!Deno.env.get("ELEVENLABS_API_KEY");

    return json({
      articles: articles ?? [],
      hasVoiceSupport,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("daily-edition error:", err);
    return json({ error: err.message ?? String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
