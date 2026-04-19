// Backfill / refresh pgvector embeddings for published articles.
// Call without args to embed every published article missing an embedding,
// or pass {"article_id": "<uuid>"} to (re)embed a single article.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBED_MODEL = "google/text-embedding-004";

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildText(a: { title: string; excerpt: string; body: string; category?: string | null }) {
  const text = `${a.title}\n\n${a.excerpt}\n\n${stripHtml(a.body || "")}`;
  // Embedding models have token limits — keep it generous but bounded.
  return text.slice(0, 8000);
}

async function embedOne(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Embedding failed (${resp.status}): ${t}`);
  }
  const json = await resp.json();
  const vec = json?.data?.[0]?.embedding as number[] | undefined;
  if (!vec || !Array.isArray(vec)) throw new Error("No embedding returned");
  return vec;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Missing required env vars");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    let body: { article_id?: string; limit?: number; force?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // empty body OK
    }

    let query = supabase
      .from("articles")
      .select("id, title, excerpt, body, category, embedding_updated_at, updated_at")
      .eq("published", true);

    if (body.article_id) {
      query = query.eq("id", body.article_id);
    } else if (!body.force) {
      // Only rows that need embedding (never embedded, or article changed since last embed)
      query = query.or("embedding_updated_at.is.null,embedding_updated_at.lt.updated_at");
    }

    query = query.limit(body.limit ?? 50);

    const { data: rows, error } = await query;
    if (error) throw error;

    let processed = 0;
    const errors: { id: string; message: string }[] = [];

    for (const row of rows || []) {
      try {
        const text = buildText(row as any);
        if (!text || text.length < 20) continue;
        const vec = await embedOne(text, LOVABLE_API_KEY);
        const { error: upErr } = await supabase
          .from("articles")
          .update({
            embedding: vec as unknown as string,
            embedding_updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (upErr) throw upErr;
        processed++;
      } catch (e) {
        errors.push({ id: row.id, message: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(
      JSON.stringify({ processed, total: rows?.length ?? 0, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("embed-articles error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});