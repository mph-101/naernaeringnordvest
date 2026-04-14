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
      return new Response(JSON.stringify({ companies: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plainText = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const prompt = `From the following Norwegian article text, extract all company names (Norwegian or international businesses) that are explicitly mentioned. Return ONLY a JSON array of strings with the company names. If no companies are found, return an empty array [].

Article:
${plainText.slice(0, 4000)}`;

    const response = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    const match = content.match(/\[[\s\S]*\]/);
    const companies = match ? JSON.parse(match[0]) : [];

    return new Response(JSON.stringify({ companies }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("suggest-companies error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
