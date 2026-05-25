import { corsHeaders } from "../_shared/cors.ts";
import { aiChatCompletion } from "../_shared/ai-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { title, excerpt, body } = await req.json();

    if (!body) {
      return new Response(JSON.stringify({ error: "Body is required" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const prompt = `Translate the following Norwegian article to English. Preserve all HTML formatting in the body. Return a JSON object with keys: title_en, excerpt_en, body_en. Return ONLY the JSON, no markdown fences.

Title: ${title}

Excerpt: ${excerpt || ""}

Body:
${body.slice(0, 8000)}`;

    const data = await aiChatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = (data.choices?.[0]?.message?.content as string) || "{}";
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const translation = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return new Response(JSON.stringify(translation), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("translate-article error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
