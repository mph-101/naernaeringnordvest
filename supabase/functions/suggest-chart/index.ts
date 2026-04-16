const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { headers, rows, articleTitle, articleExcerpt } = await req.json();

    if (!Array.isArray(headers) || headers.length < 2) {
      return new Response(JSON.stringify({ error: "Trenger minst 2 kolonner" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(rows) || rows.length < 2) {
      return new Response(JSON.stringify({ error: "Trenger minst 2 datarader" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
                    enum: ["bar", "line", "area", "pie"],
                    description: "Best egnede diagramtype: bar=s\u00f8yle, line=linje (tidsserie), area=areal, pie=kake (\u22645 kategorier som summerer til helhet)",
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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "For mange foresp\u00f8rsler, pr\u00f8v igjen om litt." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-kreditter er brukt opp." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("Ingen forslag returnert");
    }
    const suggestion = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("suggest-chart error:", err);
    return new Response(JSON.stringify({ error: err.message || "Ukjent feil" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
