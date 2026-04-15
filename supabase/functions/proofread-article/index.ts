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
    const { body } = await req.json();

    if (!body || body.length < 50) {
      return new Response(JSON.stringify({ error: "Brødteksten må være minst 50 tegn" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plainText = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const prompt = `Du er en erfaren norsk språkvasker for en næringslivsavis. Analyser følgende tekst og finn konkrete forbedringsforslag.

Fokuser på:
1. Anglisismer som bør erstattes med norske ord (f.eks. "turnover" → "gjennomstrømming", "feedback" → "tilbakemelding", "deadline" → "frist", "performance" → "ytelse")
2. Bokmål-standardisering: Bruk moderat bokmål (-en/-ene-former fremfor -a-former der det passer i en avissammenheng, f.eks. "folka" → "folkene", "boka" → "boken")
3. Grammatiske feil og skrivefeil
4. Unødvendig kompliserte formuleringer som kan forenkles
5. Uidiomatiske uttrykk

For hvert forslag, returner:
- "original": den eksakte teksten som finnes i originalen (kopier nøyaktig)
- "suggestion": foreslått erstatning
- "reason": kort forklaring på norsk (maks 10 ord)
- "category": en av "anglisisme", "dialekt", "grammatikk", "forenkling", "skrivefeil"

Returner KUN en JSON-array med objekter. Ingen markdown, ingen forklaring utenfor JSON. Returner tom array [] hvis ingen forslag.

Tekst:
${plainText.slice(0, 6000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "For mange forespørsler, prøv igjen om litt." }), {
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
      throw new Error(`AI Gateway error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    const match = content.match(/\[[\s\S]*\]/);
    const suggestions = match ? JSON.parse(match[0]) : [];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("proofread-article error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
