import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Generate a fact box from one or more sources. AI picks the best variant
// (rich, image, or keyvalue) based on the source content.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const { sourceIds, hint = "" } = await req.json();
    if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
      return new Response(JSON.stringify({ error: "sourceIds required" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sources, error: srcErr } = await supabase
      .from("article_sources")
      .select("id, source_type, title, content, source_url")
      .in("id", sourceIds);
    if (srcErr) throw new Error(srcErr.message);
    if (!sources || sources.length === 0) throw new Error("No sources found");

    const sourcesBlock = sources.map((s, i) =>
      `### Kilde ${i + 1}: ${s.title}${s.source_url ? `\nURL: ${s.source_url}` : ""}\n${(s.content ?? "").slice(0, 8000)}`
    ).join("\n\n---\n\n");

    const systemPrompt = `Du er en erfaren norsk avisredaktør for Nær Næring som lager kompakte, leservennlige faktabokser.

Du velger MEST EGNEDE variant basert på kildematerialet:
- "keyvalue": Når kilden har strukturerte tall, fakta eller nøkkeldata (omsetning, ansatte, stiftet, daglig leder, osv.). 3-8 etikett/verdi-par.
- "rich": Når faktaboksen skal forklare bakgrunn, kontekst eller en sak med flytende tekst. Bruk korte avsnitt med <p>-tagger og evt. <ul><li>-lister.
- "image": Bruk KUN hvis kilden eksplisitt har et beskrevet bilde — ellers velg "rich" eller "keyvalue".

REGLER:
- Skriv på norsk bokmål, nøytralt og presist.
- Tittelen skal være kort og beskrivende (2-5 ord).
- Ikke finn på fakta. Hvis informasjon mangler, utelat feltet.
- For "keyvalue": etiketter er korte substantiver ("Omsetning", "Ansatte"), verdier er konkrete tall/svar.
- For "rich": maks 3 korte avsnitt eller 5-7 punkter.
- Foreslå 1-4 emneknagger (tags) — korte ord på norsk, små bokstaver, ingen #.`;

    const userPrompt = `Lag en faktaboks basert på følgende kildemateriale.${hint ? `\n\nØNSKE FRA REDAKTØREN: ${hint}` : ""}\n\n${sourcesBlock}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_fact_box",
            description: "Returnerer en ferdig faktaboks",
            parameters: {
              type: "object",
              properties: {
                variant: { type: "string", enum: ["rich", "keyvalue", "image"] },
                title: { type: "string", description: "Kort, beskrivende tittel (2-5 ord)" },
                body: { type: "string", description: "HTML-innhold for rich/image — tom for keyvalue" },
                items: {
                  type: "array",
                  description: "Etikett/verdi-par for keyvalue — tom for rich/image",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      value: { type: "string" },
                    },
                    required: ["label", "value"],
                    additionalProperties: false,
                  },
                },
                tags: { type: "array", items: { type: "string" }, description: "1-4 korte emneknagger" },
              },
              required: ["variant", "title", "body", "items", "tags"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_fact_box" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "AI-tjenesten er overbelastet. Prøv igjen om litt." }), {
          status: 429, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI-kreditt er oppbrukt. Legg til kreditter i workspace-innstillinger." }), {
          status: 402, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${errText}`);
    }

    const data = await aiRes.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const factBox = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ factBox }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-fact-box error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
