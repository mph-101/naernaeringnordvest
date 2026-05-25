import { corsHeaders } from "../_shared/cors.ts";
import { aiChatCompletion, AiGatewayError } from "../_shared/ai-client.ts";

interface RequestBody {
  title?: string;
  excerpt?: string;
  body?: string;
  category?: string;
  language?: "no" | "en";
}

const stripHtml = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { title, excerpt, body, category, language = "no" } = (await req.json()) as RequestBody;
    const plainBody = stripHtml(body || "");

    if (!title && !excerpt && plainBody.length < 50) {
      return new Response(JSON.stringify({ error: "Article content too short" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const lang = language === "en" ? "English" : "Norwegian (bokmål)";
    const systemPrompt = `You are a social media editor for Nær Næring, a Norwegian local-business news outlet. ` +
      `Write platform-tailored posts that drive clicks to the article. Tone: editorial, sober, concrete — never clickbait, never emoji-spam. ` +
      `Output language: ${lang}. Always respond by calling the provided tool.`;

    const userPrompt = `Article to promote:
Title: ${title || "(no title)"}
Category: ${category || "(no category)"}
Excerpt: ${excerpt || "(no excerpt)"}

Body excerpt:
${plainBody.slice(0, 3500)}

Generate 3 social media posts:
1. LinkedIn — 2-4 sentences, professional tone, may include 1-2 light hashtags at end.
2. Facebook/X — under 240 characters, single hook + 1 sentence of context, no hashtags required.
3. Instagram caption — 1-2 short paragraphs with a strong opener, end with 3-5 relevant hashtags.

Each post must stand on its own (someone scrolling sees it without the article). Use facts from the article — do not invent statistics.`;

    const tool = {
      type: "function",
      function: {
        name: "social_posts",
        description: "Return three social media post drafts.",
        parameters: {
          type: "object",
          properties: {
            linkedin: { type: "string", description: "LinkedIn post text." },
            facebook: { type: "string", description: "Short post for Facebook / X." },
            instagram: { type: "string", description: "Instagram caption with hashtags." },
          },
          required: ["linkedin", "facebook", "instagram"],
          additionalProperties: false,
        },
      },
    };

    let data;
    try {
      data = await aiChatCompletion({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "social_posts" } },
        temperature: 0.6,
      });
    } catch (e) {
      if (e instanceof AiGatewayError) {
        if (e.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit nådd. Prøv igjen om litt." }), {
            status: 429, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }
        if (e.status === 402) {
          return new Response(JSON.stringify({ error: "Tom for AI-kreditt." }), {
            status: 402, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }
        console.error("AI gateway error:", e.status, e.body);
      }
      return new Response(JSON.stringify({ error: "AI-tjenesten svarte ikke" }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const toolCall = (data.choices?.[0]?.message?.tool_calls as any)?.[0];
    let parsed: { linkedin?: string; facebook?: string; instagram?: string } = {};
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool arguments:", e);
      }
    }

    return new Response(
      JSON.stringify({
        linkedin: parsed.linkedin ?? "",
        facebook: parsed.facebook ?? "",
        instagram: parsed.instagram ?? "",
      }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-social-posts error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});