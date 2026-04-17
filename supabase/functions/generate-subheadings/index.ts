const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

/**
 * Inserts short, descriptive H2 subheadings into article body HTML.
 * Strategy:
 * 1. Strip existing <h2>/<h3> tags (we re-generate them).
 * 2. Split body into paragraphs.
 * 3. Ask AI for a label (2-4 words) every 2-3 paragraphs.
 * 4. Re-assemble with <h2> tags inserted at the right positions.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { body } = await req.json();
    if (!body || typeof body !== "string" || body.length < 100) {
      return new Response(JSON.stringify({ error: "Brødteksten er for kort" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Strip existing headings (we'll regenerate)
    const cleanedBody = body.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, "");

    // Extract paragraphs (preserve everything else like <figure>, <ul>, etc.)
    // We split by </p> to identify paragraph boundaries
    const blockRegex = /(<p\b[^>]*>[\s\S]*?<\/p>|<figure\b[\s\S]*?<\/figure>|<ul\b[\s\S]*?<\/ul>|<ol\b[\s\S]*?<\/ol>|<blockquote\b[\s\S]*?<\/blockquote>)/gi;
    const blocks: string[] = [];
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = blockRegex.exec(cleanedBody)) !== null) {
      if (m.index > lastIdx) {
        const between = cleanedBody.slice(lastIdx, m.index).trim();
        if (between) blocks.push(between);
      }
      blocks.push(m[0]);
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < cleanedBody.length) {
      const tail = cleanedBody.slice(lastIdx).trim();
      if (tail) blocks.push(tail);
    }

    // Identify paragraphs only
    const paragraphs = blocks
      .map((b, i) => ({ block: b, index: i, isP: /^<p\b/i.test(b) }))
      .filter((b) => b.isP);

    if (paragraphs.length < 4) {
      // Not enough paragraphs to need subheadings
      return new Response(JSON.stringify({ body: cleanedBody, inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decide insertion points: every 2-3 paragraphs, but not before the first paragraph
    const insertionPoints: number[] = []; // block indices BEFORE which to insert
    let counter = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      if (i === 0) continue;
      counter++;
      // Insert every 2-3 paragraphs (alternating to feel natural)
      const interval = counter % 5 < 2 ? 2 : 3;
      if (counter % interval === 0) {
        insertionPoints.push(paragraphs[i].index);
      }
    }

    if (insertionPoints.length === 0) {
      return new Response(JSON.stringify({ body: cleanedBody, inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context for AI: for each insertion point, give surrounding text
    const stripTags = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const sections = insertionPoints.map((blockIdx, i) => {
      // Collect paragraph text from this insertion point until the next one (or end)
      const nextBlockIdx = i + 1 < insertionPoints.length ? insertionPoints[i + 1] : blocks.length;
      const sectionBlocks = blocks.slice(blockIdx, nextBlockIdx).filter((b) => /^<p\b/i.test(b));
      const text = sectionBlocks.map(stripTags).join(" ").slice(0, 600);
      return { id: `s${i}`, text };
    });

    const prompt = `Du er en erfaren norsk avisredaktør. For hver tekstseksjon under, lag en KORT, BESKRIVENDE mellomtittel på 2-4 ord på norsk bokmål. Mellomtittelen skal fange essensen av seksjonen og fungere som et naturlig avbrekk i lesingen.

Regler:
- Maks 4 ord, helst 2-3
- Substantivisk og konkret (f.eks. "Sterk vekst", "Nye planer", "Kritikk fra opposisjonen")
- Ingen punktum, ingen anførselstegn
- Ikke gjenta nøyaktige formuleringer fra teksten
- Skriv på samme språk som teksten (norsk bokmål)

SEKSJONER:
${sections.map((s) => `[${s.id}]\n${s.text}`).join("\n\n")}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Du er en norsk avisredaktør som lager korte, treffende mellomtitler." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "set_subheadings",
            description: "Returner mellomtitler for hver seksjon",
            parameters: {
              type: "object",
              properties: {
                subheadings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", description: "Seksjons-id, f.eks. s0, s1" },
                      title: { type: "string", description: "Mellomtittel, 2-4 ord" },
                    },
                    required: ["id", "title"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["subheadings"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "set_subheadings" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "AI-tjenesten er overbelastet. Prøv igjen om litt." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI-kreditt er oppbrukt." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      throw new Error(`AI gateway error: ${errText}`);
    }

    const data = await aiRes.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const parsed = JSON.parse(toolCall.function.arguments);
    const headings: { id: string; title: string }[] = parsed.subheadings || [];
    const headingMap = new Map(headings.map((h) => [h.id, h.title]));

    // Re-assemble blocks with headings inserted
    const insertionMap = new Map<number, string>();
    insertionPoints.forEach((blockIdx, i) => {
      const title = headingMap.get(`s${i}`);
      if (title) {
        const clean = title.trim().replace(/[."'«»]/g, "");
        if (clean) insertionMap.set(blockIdx, `<h2>${clean}</h2>`);
      }
    });

    const finalParts: string[] = [];
    for (let i = 0; i < blocks.length; i++) {
      if (insertionMap.has(i)) finalParts.push(insertionMap.get(i)!);
      finalParts.push(blocks[i]);
    }

    return new Response(JSON.stringify({
      body: finalParts.join("\n\n"),
      inserted: insertionMap.size,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("generate-subheadings error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
