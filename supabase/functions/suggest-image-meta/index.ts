// Suggest alt text and caption for an uploaded image using Gemini vision via Lovable AI Gateway.
// Accepts: { imageBase64: string, mimeType: string, hint?: string }
// Returns: { alt_text: string, caption: string, photographer?: string }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const imageBase64: string | undefined = body?.imageBase64;
    const mimeType: string = body?.mimeType || "image/jpeg";
    const hint: string = (body?.hint || "").toString().slice(0, 500);

    if (!imageBase64 || typeof imageBase64 !== "string" || imageBase64.length < 100) {
      return new Response(JSON.stringify({ error: "imageBase64 mangler eller er ugyldig" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (imageBase64.length > 8_000_000) {
      return new Response(JSON.stringify({ error: "Bildet er for stort for analyse (maks ~6 MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    const systemPrompt = `Du er en norsk bilderedaktør for en lokal næringslivsavis.
Analyser bildet og foreslå:
1) alt_text: kort, beskrivende alt-tekst på norsk (maks 140 tegn) for skjermlesere. Beskriv hva som faktisk vises - ingen tolkning av kontekst som ikke er synlig.
2) caption: en bildetekst på norsk (1-2 setninger, maks 200 tegn) som passer i en avisartikkel. Vær konkret og nøktern.
3) photographer_hint: hvis bildet inneholder synlig vannmerke, byline eller kjent kilde - returner navnet. Ellers tom streng.

Skriv på bokmål. Ikke spekuler om personer eller steder du ikke kan identifisere sikkert.`;

    const userText = hint
      ? `Kontekst fra redaktøren: ${hint}\n\nForeslå metadata for bildet.`
      : "Foreslå metadata for bildet.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_image_meta",
              description: "Returner foreslått alt-tekst og bildetekst.",
              parameters: {
                type: "object",
                properties: {
                  alt_text: { type: "string", description: "Kort alt-tekst, maks 140 tegn." },
                  caption: { type: "string", description: "Bildetekst, 1-2 setninger." },
                  photographer_hint: {
                    type: "string",
                    description: "Synlig fotograf/kilde i bildet, eller tom streng.",
                  },
                },
                required: ["alt_text", "caption", "photographer_hint"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_image_meta" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit nådd, prøv igjen om litt." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-kreditt tom. Legg til kreditt i Lovable Cloud." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-tjenesten feilet" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "Ingen forslag generert" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: { alt_text?: string; caption?: string; photographer_hint?: string } = {};
    try {
      parsed = typeof args === "string" ? JSON.parse(args) : args;
    } catch (e) {
      console.error("Failed to parse tool args", e);
      return new Response(JSON.stringify({ error: "Ugyldig svar fra AI" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        alt_text: (parsed.alt_text || "").trim().slice(0, 250),
        caption: (parsed.caption || "").trim().slice(0, 500),
        photographer: (parsed.photographer_hint || "").trim().slice(0, 120),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("suggest-image-meta error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Ukjent feil" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
