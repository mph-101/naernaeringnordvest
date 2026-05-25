import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";
import { aiChatCompletion, AiGatewayError } from "../_shared/ai-client.ts";

// Generate an article draft from selected sources, following editorial guidelines for the chosen article type.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const { sourceIds, articleType = "news", extraInstructions = "" } = await req.json();

    if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
      return new Response(JSON.stringify({ error: "sourceIds required" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
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
- Ikke inkluder tittel, ingress eller h1 — kun selve brødteksten.
- SETT INN KORTE MELLOMTITLER med <h2>-tagger hvert 2.-3. avsnitt for å gi luft og struktur. Mellomtitlene skal være KORTE og BESKRIVENDE (2-4 ord, helst 2-3), substantiviske og konkrete (f.eks. "Sterk vekst", "Nye planer", "Reaksjoner"). Ingen punktum eller anførselstegn i mellomtitlene. Ikke sett mellomtittel før første avsnitt.
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

    let data;
    try {
      data = await aiChatCompletion({
        model: "google/gemini-2.5-flash",
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
      });
    } catch (e) {
      if (e instanceof AiGatewayError) {
        if (e.status === 429) {
          return new Response(JSON.stringify({ error: "AI-tjenesten er overbelastet. Prøv igjen om litt." }), {
            status: 429, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }
        if (e.status === 402) {
          return new Response(JSON.stringify({ error: "AI-kreditt er oppbrukt." }), {
            status: 402, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }
      }
      throw e;
    }

    const toolCall = (data.choices?.[0]?.message?.tool_calls as any)?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const draft = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-article-draft error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
