import { corsHeaders } from "../_shared/cors.ts";
import { aiChatCompletion, AiGatewayError } from "../_shared/ai-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { headers, rows, articleTitle, articleExcerpt } = await req.json();

    if (!Array.isArray(headers) || headers.length < 2) {
      return new Response(JSON.stringify({ error: "Trenger minst 2 kolonner" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(rows) || rows.length < 2) {
      return new Response(JSON.stringify({ error: "Trenger minst 2 datarader" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Build a compact preview of the data for the model
    const preview = [headers, ...rows.slice(0, 25)]
      .map((r: any[]) => r.join("\t"))
      .join("\n");

    const systemPrompt = `Du er en norsk datajournalist for n\u00e6ringslivsavisen N\u00e6r N\u00e6ring.
Analyser dataene og foresl\u00e5 den BESTE visualiseringen for en avisartikkel.
Gi titler p\u00e5 bokm\u00e5l, kort og presist (maks 70 tegn). Kildehenvisning skal v\u00e6re kort og konkret (f.eks. "Kilde: SSB" eller "Kilde: Egne tall").`;

    const userPrompt = `Datasett (f\u00f8rste rad er kolonneoverskrifter):
\`\`\`
${preview}
\`\`\`
${articleTitle ? `\nArtikkeltittel: ${articleTitle}` : ""}
${articleExcerpt ? `Ingress: ${articleExcerpt}` : ""}

Vurder dataformen (kategorisk vs tidsserie, antall serier, st\u00f8rrelsesforhold) og foresl\u00e5 type, tittel og kilde.`;

    let data;
    try {
      data = await aiChatCompletion({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_chart",
              description: "Foresl\u00e5 visualiseringstype og metadata for et datasett",
              parameters: {
                type: "object",
                properties: {
                  chartType: {
                    type: "string",
                    enum: ["bar", "stackedBar", "horizontalBar", "line", "area", "scatter", "pie"],
                    description: "Best egnede diagramtype: bar=s\u00f8yle (kategorier), stackedBar=stablet s\u00f8yle (deler av helhet over kategorier), horizontalBar=horisontal s\u00f8yle (lange etiketter eller rangering), line=linje (tidsserie), area=areal (volum over tid), scatter=punktdiagram (sammenheng mellom to numeriske variabler), pie=kake (\u22645 kategorier som summerer til helhet)",
                  },
                  title: { type: "string", description: "Kort, journalistisk tittel p\u00e5 bokm\u00e5l, maks 70 tegn" },
                  subtitle: { type: "string", description: "Valgfri undertittel som forklarer kontekst (maks 100 tegn)" },
                  source: { type: "string", description: "Kort kildehenvisning, f.eks. 'Kilde: SSB' eller 'Kilde: Br\u00f8nn\u00f8ysundregistrene'" },
                  xAxisLabel: { type: "string", description: "Etikett for x-aksen" },
                  yAxisLabel: { type: "string", description: "Etikett for y-aksen (f.eks. 'Mill. NOK', 'Antall', 'Prosent')" },
                  reasoning: { type: "string", description: "Kort begrunnelse (maks 20 ord) p\u00e5 norsk for diagramvalget" },
                },
                required: ["chartType", "title", "source", "xAxisLabel", "yAxisLabel", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_chart" } },
      });
    } catch (e) {
      if (e instanceof AiGatewayError) {
        if (e.status === 429) {
          return new Response(JSON.stringify({ error: "For mange foresp\u00f8rsler, pr\u00f8v igjen om litt." }), {
            status: 429,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }
        if (e.status === 402) {
          return new Response(JSON.stringify({ error: "AI-kreditter er brukt opp." }), {
            status: 402,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }
      }
      throw e;
    }

    const toolCall = (data.choices?.[0]?.message?.tool_calls as any)?.[0];
    if (!toolCall) {
      throw new Error("Ingen forslag returnert");
    }
    const suggestion = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("suggest-chart error:", err);
    return new Response(JSON.stringify({ error: err.message || "Ukjent feil" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
