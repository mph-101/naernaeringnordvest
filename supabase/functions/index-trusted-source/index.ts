// Index a trusted source: fetch its content, chunk it, store in trusted_source_documents.
// Supports source_type: 'url' (single page), 'rss' (feed of items), 'document' (already-extracted text).
// Called from admin UI when adding/refreshing a source.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeaders } from "../_shared/cors.ts";

const CHUNK_SIZE = 1500;
const MAX_CHUNKS_PER_SOURCE = 40;

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length && chunks.length < MAX_CHUNKS_PER_SOURCE) {
    chunks.push(text.slice(i, i + size));
    i += size;
  }
  return chunks;
}

function extractRssItems(xml: string): Array<{ title: string; link: string; pubDate?: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate?: string; description: string }> = [];
  const itemRegex = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi;
  const matches = xml.match(itemRegex) || [];
  for (const m of matches.slice(0, 20)) {
    const title = (m.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
      .replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const link =
      (m.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "").trim() ||
      (m.match(/<link[^>]*href="([^"]+)"/i)?.[1] || "").trim();
    const pubDate = (m.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || m.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1] || "").trim();
    const description = stripHtml(
      (m.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ||
        m.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ||
        m.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] ||
        ""
      ).replace(/<!\[CDATA\[|\]\]>/g, "")
    );
    if (title && link) items.push({ title, link, pubDate, description });
  }
  return items;
}

async function fetchWithTimeout(url: string, ms = 15000): Promise<Response> {
  return await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: { "User-Agent": "NaerNaeringBot/1.0 (+editorial)" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authn: verify caller is staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    // Use service role for DB writes (bypass RLS but we already authorized)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Verify staff role
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isStaff = (roles || []).some((r: any) => r.role === "admin" || r.role === "editor");
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { source_id } = await req.json();
    if (!source_id) {
      return new Response(JSON.stringify({ error: "source_id påkrevd" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: source, error: srcErr } = await admin
      .from("trusted_sources")
      .select("*")
      .eq("id", source_id)
      .single();
    if (srcErr || !source) {
      return new Response(JSON.stringify({ error: "Kilde ikke funnet" }), {
        status: 404, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Wipe old indexed docs for this source
    await admin.from("trusted_source_documents").delete().eq("source_id", source_id);

    let inserted = 0;
    let errorMsg: string | null = null;

    try {
      if (source.source_type === "url" && source.url) {
        const res = await fetchWithTimeout(source.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const docTitle = titleMatch?.[1]?.trim() || source.name;
        const text = stripHtml(html);
        const chunks = chunkText(text, CHUNK_SIZE);
        const rows = chunks.map((c, i) => ({
          source_id,
          chunk_index: i,
          title: i === 0 ? docTitle : `${docTitle} (del ${i + 1})`,
          content: c,
          source_url: source.url,
          metadata: { fetched_at: new Date().toISOString() },
        }));
        if (rows.length > 0) {
          const { error } = await admin.from("trusted_source_documents").insert(rows);
          if (error) throw error;
          inserted = rows.length;
        }
      } else if (source.source_type === "rss" && source.url) {
        const res = await fetchWithTimeout(source.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        const items = extractRssItems(xml);
        const rows = items.map((it, i) => ({
          source_id,
          chunk_index: i,
          title: it.title,
          content: it.description || it.title,
          source_url: it.link,
          published_at: it.pubDate ? new Date(it.pubDate).toISOString() : null,
          metadata: { feed_url: source.url },
        }));
        if (rows.length > 0) {
          const { error } = await admin.from("trusted_source_documents").insert(rows);
          if (error) throw error;
          inserted = rows.length;
        }
      } else if (source.source_type === "document" && source.storage_path) {
        const { data: file, error: dlErr } = await admin.storage
          .from("trusted-sources")
          .download(source.storage_path);
        if (dlErr || !file) throw new Error(dlErr?.message || "Kunne ikke laste ned dokument");
        // Best-effort: treat as text. PDF/DOCX would need richer parsing, but plain text and pre-extracted content work.
        const text = await file.text();
        const cleaned = text.replace(/\s+/g, " ").trim();
        const chunks = chunkText(cleaned, CHUNK_SIZE);
        const rows = chunks.map((c, i) => ({
          source_id,
          chunk_index: i,
          title: i === 0 ? source.name : `${source.name} (del ${i + 1})`,
          content: c,
          source_url: null,
          metadata: { storage_path: source.storage_path },
        }));
        if (rows.length > 0) {
          const { error } = await admin.from("trusted_source_documents").insert(rows);
          if (error) throw error;
          inserted = rows.length;
        }
      } else if (source.source_type === "api") {
        // API sources are queried live by the chatbot — nothing to pre-index.
        inserted = 0;
      } else {
        throw new Error("Ugyldig kildetype eller manglende URL/sti");
      }
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    await admin
      .from("trusted_sources")
      .update({
        last_indexed_at: new Date().toISOString(),
        last_index_error: errorMsg,
      })
      .eq("id", source_id);

    return new Response(JSON.stringify({ inserted, error: errorMsg }), {
      status: errorMsg ? 500 : 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("index-trusted-source error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukjent feil" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
