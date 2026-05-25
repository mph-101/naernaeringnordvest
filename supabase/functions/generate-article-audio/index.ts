// Genererer (eller henter cachet) lydversjon av en artikkel.
// Input: { articleId: string, mode: "summary" | "full" }
// Returnerer signed URL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { aiChatCompletion } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George — varm, nøytral

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenKey) return json({ error: "AUDIO_NOT_CONFIGURED", message: "Lyd-modus er ikke aktivert ennå (mangler ElevenLabs-nøkkel)." }, 503);

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { articleId, mode } = body;
    if (!articleId || !["summary", "full"].includes(mode)) {
      return json({ error: "articleId og mode (summary|full) kreves" }, 400);
    }

    // Hent artikkel
    const { data: article, error: artErr } = await admin
      .from("articles")
      .select("id, title, excerpt, body, author, premium, published, region_slug, updated_at")
      .eq("id", articleId).maybeSingle();
    if (artErr || !article) return json({ error: "Artikkel ikke funnet" }, 404);
    if (!article.published) return json({ error: "Artikkel ikke publisert" }, 403);

    // Premium-gating: full lesning krever innlogget bruker
    if (article.premium && mode === "full") {
      if (!authHeader) return json({ error: "Innlogging kreves for full lesning" }, 401);
    }

    // Finn forfatterens voice_id
    const { data: authorRow } = await admin
      .from("authors")
      .select("elevenlabs_voice_id")
      .eq("name", article.author)
      .maybeSingle();
    const voiceId = authorRow?.elevenlabs_voice_id || DEFAULT_VOICE_ID;

    // Sjekk cache
    const { data: cached } = await admin
      .from("article_audio")
      .select("storage_path, generated_at, duration_seconds, summary_text")
      .eq("article_id", articleId)
      .eq("mode", mode)
      .eq("voice_id", voiceId)
      .maybeSingle();

    if (cached && new Date(cached.generated_at) > new Date(article.updated_at)) {
      const { data: signed } = await admin.storage
        .from("article-audio")
        .createSignedUrl(cached.storage_path, 3600);
      if (signed?.signedUrl) {
        return json({
          url: signed.signedUrl,
          mode,
          voice_id: voiceId,
          duration: cached.duration_seconds,
          summary_text: cached.summary_text,
          cached: true,
        });
      }
    }

    // Bygg tekst
    const plainBody = stripHtml(article.body);
    let textToSpeak = "";
    let summaryText: string | null = null;

    if (mode === "summary") {
      // Lag muntlig 60–90 ords sammendrag via Lovable AI
      const prompt = `Lag et muntlig nyhetssammendrag på norsk bokmål av artikkelen under, i én sammenhengende paragraf på 60–90 ord. Skriv som en nyhetsanker leser opp — naturlig, klart, ingen oppramsing. Start med en kort hekt. Ikke nevn at det er et sammendrag.\n\nTittel: ${article.title}\nIngress: ${article.excerpt}\nBrødtekst (utdrag):\n${plainBody.slice(0, 3000)}`;
      let aiData;
      try {
        aiData = await aiChatCompletion({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
        });
      } catch (e) {
        return json({ error: `AI-sammendrag feilet: ${e instanceof Error ? e.message : String(e)}` }, 502);
      }
      summaryText = ((aiData.choices?.[0]?.message?.content as string) ?? "").trim();
      if (!summaryText) return json({ error: "Tomt AI-sammendrag" }, 502);
      textToSpeak = `${article.title}. ${summaryText}`;
    } else {
      textToSpeak = `${article.title}. ${article.excerpt}\n\n${plainBody}`;
      // Begrens for kost-kontroll (ca. 4500 tegn ~ 3 min)
      if (textToSpeak.length > 4500) textToSpeak = textToSpeak.slice(0, 4500) + "…";
    }

    // Kall ElevenLabs TTS
    const ttsResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": elevenKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
        }),
      },
    );
    if (!ttsResp.ok) {
      const e = await ttsResp.text();
      return json({ error: `ElevenLabs TTS feilet [${ttsResp.status}]: ${e}` }, 502);
    }

    const audioBuf = new Uint8Array(await ttsResp.arrayBuffer());
    const storagePath = `${articleId}/${mode}-${voiceId}.mp3`;

    const { error: upErr } = await admin.storage
      .from("article-audio")
      .upload(storagePath, audioBuf, { contentType: "audio/mpeg", upsert: true });
    if (upErr) return json({ error: `Storage-feil: ${upErr.message}` }, 500);

    // Grov varighetsestimat: ~128 kbps = 16 kB/sek
    const estimatedDuration = Math.round(audioBuf.length / 16000);

    await admin.from("article_audio").upsert({
      article_id: articleId,
      mode,
      voice_id: voiceId,
      storage_path: storagePath,
      duration_seconds: estimatedDuration,
      region_slug: article.region_slug,
      summary_text: summaryText,
      generated_at: new Date().toISOString(),
    }, { onConflict: "article_id,mode,voice_id" });

    const { data: signed } = await admin.storage
      .from("article-audio")
      .createSignedUrl(storagePath, 3600);

    return json({
      url: signed?.signedUrl,
      mode,
      voice_id: voiceId,
      duration: estimatedDuration,
      summary_text: summaryText,
      cached: false,
    });
  } catch (err: any) {
    console.error("generate-article-audio error:", err);
    return json({ error: err.message ?? String(err) }, 500);
  }
});

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
