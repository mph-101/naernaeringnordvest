import { corsHeaders } from "../_shared/cors.ts";
import { aiChatCompletion } from "../_shared/ai-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { body, language } = await req.json();

    if (!body || body.length < 50) {
      return new Response(JSON.stringify({ error: "Body text too short" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const plainText = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const lang = language === "en" ? "English" : "Norwegian";
    const prompt = `Extract exactly 3 key points from the following article text. Each point should be a concise, informative sentence (max 15 words). Return ONLY a JSON array of 3 strings, no other text. Language: ${lang}.\n\nArticle:\n${plainText.slice(0, 4000)}`;

    const data = await aiChatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = (data.choices?.[0]?.message?.content as string) || "[]";
    const match = content.match(/\[[\s\S]*\]/);
    const points = match ? JSON.parse(match[0]) : [];

    return new Response(JSON.stringify({ points }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-key-points error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
