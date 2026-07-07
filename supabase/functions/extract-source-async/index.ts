import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";
import { aiChatCompletion } from "../_shared/ai-client.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Background extraction: client uploads file, creates a row with metadata.status="processing",
// then calls this function which runs extraction in the background and updates the row when done.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const { sourceId } = await req.json();
    if (!sourceId) {
      return new Response(JSON.stringify({ error: "sourceId required" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    // Fire and forget — return 202 immediately
    // @ts-ignore – EdgeRuntime is a Deno Deploy global
    EdgeRuntime.waitUntil(processSource(sourceId));

    return new Response(JSON.stringify({ ok: true, sourceId, status: "processing" }), {
      status: 202,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-source-async error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

async function processSource(sourceId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: src, error: loadErr } = await supabase
    .from("article_sources")
    .select("id, source_type, file_url, source_url, metadata")
    .eq("id", sourceId)
    .maybeSingle();

  if (loadErr || !src) {
    console.error("Failed to load source", sourceId, loadErr);
    return;
  }

  const meta = (src.metadata ?? {}) as Record<string, unknown>;
  const sourceType = src.source_type as string;

  try {
    let extractedText = "";
    let extractedTitle = "";

    if (sourceType === "url" && src.source_url) {
      const res = await fetch(src.source_url, {
        headers: { "User-Agent": "Mozilla/5.0 NaerNaering/1.0" },
        // Bound the fetch so a slow/hostile target can't hold the background
        // task open until the platform kill (which would strand the row in
        // status:"processing"). The catch below writes a terminal status.
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      extractedTitle = titleMatch ? titleMatch[1].trim() : "";
      extractedText = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 50000);
    } else if (src.file_url) {
      const { data: fileData, error: dlError } = await supabase.storage
        .from("article-sources")
        .download(src.file_url);
      if (dlError || !fileData) throw new Error(`Download failed: ${dlError?.message}`);

      const buffer = await fileData.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const detectedMime = (meta.mime as string) || fileData.type || "application/octet-stream";

      // Plain text shortcut
      if (sourceType === "document" && (detectedMime.startsWith("text/") || detectedMime.includes("plain"))) {
        extractedText = new TextDecoder().decode(uint8).slice(0, 100000);
      } else {
        let binary = "";
        const CHUNK = 8192;
        for (let i = 0; i < uint8.length; i += CHUNK) {
          binary += String.fromCharCode(...uint8.subarray(i, Math.min(i + CHUNK, uint8.length)));
        }
        const base64 = btoa(binary);

        if (sourceType === "audio") {
          const data = await aiChatCompletion({
            model: "google/gemini-2.5-flash",
            messages: [{
              role: "user",
              content: [
                { type: "input_audio", input_audio: { data: base64, format: detectedMime.includes("wav") ? "wav" : "mp3" } },
                { type: "text", text: "Transkriber dette lydopptaket ordrett på norsk. Returner kun den transkriberte teksten, med naturlige avsnitt." },
              ],
            }],
          });
          extractedText = (data.choices?.[0]?.message?.content as string) || "";
        } else {
          const isImage = detectedMime.startsWith("image/");
          const data = await aiChatCompletion({
            model: "google/gemini-2.5-flash",
            messages: [{
              role: "user",
              content: [
                isImage
                  ? { type: "image_url", image_url: { url: `data:${detectedMime};base64,${base64}` } }
                  : { type: "file", file: { filename: "source", file_data: `data:${detectedMime};base64,${base64}` } },
                { type: "text", text: "Hent ut all lesbar tekst fra dette dokumentet/bildet. Bevar avsnitt og struktur. Returner kun den ekstraherte teksten." },
              ],
            }],
          });
          extractedText = (data.choices?.[0]?.message?.content as string) || "";
        }
      }
    }

    const newMeta = { ...meta, status: "ready" };
    await supabase
      .from("article_sources")
      .update({
        content: extractedText,
        metadata: newMeta,
        ...(extractedTitle ? { title: extractedTitle } : {}),
      })
      .eq("id", sourceId);

    console.log("Extraction complete for", sourceId, "chars:", extractedText.length);
  } catch (err) {
    console.error("Background extraction failed for", sourceId, err);
    const newMeta = {
      ...meta,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
    await supabase
      .from("article_sources")
      .update({ metadata: newMeta })
      .eq("id", sourceId);
  }
}
