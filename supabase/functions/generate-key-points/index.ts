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
    const { body, language } = await req.json();

    if (!body || body.length < 50) {
      return new Response(JSON.stringify({ error: "Body text too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plainText = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const lang = language === "en" ? "English" : "Norwegian";
    const prompt = `Extract exactly 3 key points from the following article text. Each point should be a concise, informative sentence (max 15 words). Return ONLY a JSON array of 3 strings, no other text. Language: ${lang}.\n\nArticle:\n${plainText.slice(0, 4000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    const match = content.match(/\[[\s\S]*\]/);
    const points = match ? JSON.parse(match[0]) : [];

    return new Response(JSON.stringify({ points }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-key-points error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
