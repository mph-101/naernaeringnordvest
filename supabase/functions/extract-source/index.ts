import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Extract text from an uploaded source: document (PDF/DOCX/TXT), audio, image (OCR), or URL
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { sourceType, storagePath, url, mimeType } = await req.json();

    if (!sourceType) {
      return new Response(JSON.stringify({ error: "sourceType required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let extractedText = "";
    let title = "";

    if (sourceType === "url") {
      if (!url) throw new Error("url required");
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 NaerNaering/1.0" } });
      if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : url;
      // Strip scripts, styles, then tags
      extractedText = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 50000);
    } else if (sourceType === "audio" || sourceType === "image" || sourceType === "document") {
      if (!storagePath) throw new Error("storagePath required");
      const { data: fileData, error: dlError } = await supabase.storage
        .from("article-sources")
        .download(storagePath);
      if (dlError || !fileData) throw new Error(`Download failed: ${dlError?.message}`);

      const buffer = await fileData.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      let binary = "";
      const CHUNK = 8192;
      for (let i = 0; i < uint8.length; i += CHUNK) {
        binary += String.fromCharCode(...uint8.subarray(i, Math.min(i + CHUNK, uint8.length)));
      }
      const base64 = btoa(binary);
      const detectedMime = mimeType || fileData.type || "application/octet-stream";

      // Plain text shortcut
      if (sourceType === "document" && (detectedMime.startsWith("text/") || detectedMime.includes("plain"))) {
        extractedText = new TextDecoder().decode(uint8).slice(0, 100000);
      } else if (sourceType === "audio") {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{
              role: "user",
              content: [
                { type: "input_audio", input_audio: { data: base64, format: detectedMime.includes("wav") ? "wav" : "mp3" } },
                { type: "text", text: "Transkriber dette lydopptaket ordrett på norsk. Returner kun den transkriberte teksten, med naturlige avsnitt." },
              ],
            }],
          }),
        });
        if (!aiRes.ok) throw new Error(`Audio transcription failed: ${await aiRes.text()}`);
        const data = await aiRes.json();
        extractedText = data.choices?.[0]?.message?.content || "";
      } else {
        // image or document (PDF/DOCX) → use multimodal extraction
        const isImage = detectedMime.startsWith("image/");
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
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
          }),
        });
        if (!aiRes.ok) {
          const errText = await aiRes.text();
          throw new Error(`Extraction failed: ${errText}`);
        }
        const data = await aiRes.json();
        extractedText = data.choices?.[0]?.message?.content || "";
      }
    } else if (sourceType === "text") {
      // Already-pasted text — just echo back
      extractedText = (await req.json().catch(() => ({})))?.content ?? "";
    }

    return new Response(JSON.stringify({ text: extractedText, title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-source error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
