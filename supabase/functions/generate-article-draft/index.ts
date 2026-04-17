import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Generate an article draft from selected sources, following editorial guidelines for the chosen article type.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { sourceIds, articleType = "news", extraInstructions = "" } = await req.json();

    if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
      return new Response(JSON.stringify({ error: "sourceIds required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load sources
    const { data: sources, error: srcErr } = await supabase
      .from("article_sources")
      .select("id, source_type, title, content, source_url")
      .in("id", sourceIds);
    if (srcErr) throw new Error(srcErr.message);
    if (!sources || sources.length === 0) throw new Error("No sources found");

    // Load editorial guidelines for type (fallback to news)
    let { data: guideline } = await supabase
      .from("editorial_guidelines")
      .select("*")
      .eq("article_type", articleType)
      .maybeSingle();
    if (!guideline) {
      const { data: fallback } = await supabase
        .from("editorial_guidelines").select("*").eq("article_type", "news").maybeSingle();
      guideline = fallback;
    }

    const rules = guideline?.rules ?? "";
    const minP = guideline?.min_paragraphs ?? 3;
    const maxW = guideline?.max_words ?? 500;
    const typeName = guideline?.display_name ?? "Nyhetsartikkel";

    // Build sources block — note origin (written vs spoken)
    const sourcesBlock = sources.map((s, i) => {
      const isSpoken = s.source_type === "audio";
      const originLabel = isSpoken ? "MUNTLIG KILDE (sitater skal markeres med tankestrek: – ...)" : "SKRIFTLIG KILDE (direkte referat skal markeres med hermetegn: «...»)";
      const urlPart = s.source_url ? `\nURL: ${s.source_url}` : "";
      return `### Kilde ${i + 1}: ${s.title} (${originLabel})${urlPart}\n${s.content ?? ""}`;
    }).join("\n\n---\n\n");

    const systemPrompt = `Du er en erfaren norsk avisjournalist for Nær Næring, en lokalavis om norsk næringsliv.
Du skriver på norsk bokmål, nøytralt og faktabasert.

ARTIKKELTYPE: ${typeName}

RETNINGSLINJER (følg disse strengt):
${rules}

YTTERLIGERE FORMATKRAV:
- Returner brødteksten som HTML med <p>-tagger for avsnitt.
- Minst ${minP} avsnitt, maks ${maxW} ord totalt.
- Ikke inkluder tittel, ingress eller h1/h2 — kun selve brødteksten.
- Lenker skal være standard <a href="...">...</a>.
- IKKE finn på fakta som ikke står i kildene. Hvis informasjon mangler, utelat den.
- Hvis flere kilder motsier hverandre, velg den mest pålitelige eller nevn uenigheten.
- Sitater MÅ være ordrett fra kildene. Markér muntlige sitater med tankestrek (–) og skriftlige sitater med hermetegn («»).
- I siste avsnitt eller som egen "Kilder:"-linje, oppgi kildene med lenker når URL er tilgjengelig.`;

    const userPrompt = `Skriv en ${typeName.toLowerCase()} basert på følgende kilder.

${extraInstructions ? `EKSTRA INSTRUKSJONER FRA REDAKSJONEN:\n${extraInstructions}\n\n` : ""}KILDEMATERIALE:

${sourcesBlock}

Returner svaret som JSON med følgende felt:
- title: kort, informativ tittel (maks 80 tegn)
- excerpt: ingress / sammendrag (1-2 setninger, maks 200 tegn)
- body: HTML brødtekst med <p>-tagger
- key_points: array med 3 korte stikkord/nøkkelpunkter`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_article_draft",
            description: "Returnerer et ferdig artikkelutkast",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Kort, informativ tittel" },
                excerpt: { type: "string", description: "Ingress, 1-2 setninger" },
                body: { type: "string", description: "HTML brødtekst med <p>-tagger" },
                key_points: { type: "array", items: { type: "string" }, description: "3 korte nøkkelpunkter" },
              },
              required: ["title", "excerpt", "body", "key_points"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_article_draft" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "AI-tjenesten er overbelastet. Prøv igjen om litt." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI-kreditt er oppbrukt. Legg til kreditter i workspace-innstillinger." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${errText}`);
    }

    const data = await aiRes.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const draft = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-article-draft error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
