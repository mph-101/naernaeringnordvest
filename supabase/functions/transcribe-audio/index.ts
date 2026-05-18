import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { storagePath } = await req.json();

    if (!storagePath) {
      return new Response(JSON.stringify({ error: "No storage path provided" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Download audio from storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("audio-uploads")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download audio: ${downloadError?.message}`);
    }

    // Convert to base64 in chunks to avoid stack overflow
    const buffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    let binary = "";
    const CHUNK = 8192;
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode(...uint8.subarray(i, Math.min(i + CHUNK, uint8.length)));
    }
    const base64 = btoa(binary);

    const mimeType = fileData.type || "audio/mp3";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: base64,
                  format: mimeType.includes("wav") ? "wav" : "mp3",
                },
              },
              {
                type: "text",
                text: "Transcribe this audio recording word for word. Return ONLY the transcribed text, nothing else. Preserve paragraphs where natural pauses occur.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Transcription failed: ${err}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    // Clean up the uploaded file
    await supabase.storage.from("audio-uploads").remove([storagePath]);

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("transcribe-audio error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
