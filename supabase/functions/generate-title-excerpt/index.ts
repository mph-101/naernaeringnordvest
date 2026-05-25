import { corsHeaders } from "../_shared/cors.ts";
import { aiChatCompletion, AiGatewayError } from "../_shared/ai-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { body } = await req.json();

    if (!body || body.length < 50) {
      return new Response(JSON.stringify({ error: "Body must be at least 50 characters" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const plainText = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const prompt = `Du er journalist i en norsk næringslivsavis. Basert på følgende artikkeltekst, generer:
1. En kort, fyndig tittel (maks 10 ord, ingen anførselstegn)
2. En ingress på 1-2 setninger som oppsummerer det viktigste i artikkelen

Returner KUN et JSON-objekt med nøklene "title" og "excerpt". Ingen markdown, ingen forklaring.

Artikkeltekst:
${plainText.slice(0, 6000)}`;

    let data;
    try {
      data = await aiChatCompletion({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      });
    } catch (e) {
      if (e instanceof AiGatewayError) {
        if (e.status === 429) {
          return new Response(JSON.stringify({ error: "For mange forespørsler, prøv igjen om litt." }), {
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

    const content = (data.choices?.[0]?.message?.content as string) || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-title-excerpt error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
