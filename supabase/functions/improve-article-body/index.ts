import { corsHeaders } from "../_shared/cors.ts";
import { aiChatCompletion, AiGatewayError } from "../_shared/ai-client.ts";

interface Guideline {
  article_type: string;
  display_name: string;
  rules: string;
  min_paragraphs: number;
  max_words: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { body, guideline, articleType, focusAreas } = await req.json() as {
      body: string;
      guideline?: Guideline | null;
      articleType?: string;
      focusAreas?: string[];
    };

    if (!body || typeof body !== "string" || body.length < 50) {
      return new Response(JSON.stringify({ error: "Brødteksten må være minst 50 tegn" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const plainText = stripHtml(body);
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    const paragraphCount = (body.match(/<p[\s>]/gi) || []).length || plainText.split(/\n\s*\n/).length;

    const guidelineSection = guideline
      ? `\nARTIKKELTYPE: ${guideline.display_name} (${guideline.article_type})
MIN. AVSNITT: ${guideline.min_paragraphs}
MAKS ORD: ${guideline.max_words}
NÅVÆRENDE LENGDE: ~${wordCount} ord, ~${paragraphCount} avsnitt

REDAKSJONELLE REGLER:
${guideline.rules || "(ingen tilleggsregler)"}\n`
      : `\nARTIKKELTYPE: ${articleType || "ukjent"} (ingen retningslinjer funnet)
NÅVÆRENDE LENGDE: ~${wordCount} ord, ~${paragraphCount} avsnitt\n`;

    // Allowed focus areas. Empty / missing = "all" (alt).
    const allFocus = ["sitater", "lenker", "lengde", "struktur", "stil"] as const;
    const focus = (focusAreas && focusAreas.length > 0)
      ? focusAreas.filter((f) => (allFocus as readonly string[]).includes(f))
      : [...allFocus];

    const focusLabels: Record<string, string> = {
      sitater: "Sitatformat (typografiske «», blockquote for >40 ord, behold ordrett innhold)",
      lenker: "Kildelenker (behold/normaliser <a href>, IKKE fabrikker URL-er)",
      lengde: "Ordtelling (juster mot MAKS ORD uten å fjerne fakta)",
      struktur: "Struktur (avsnittinndeling, mellomtitler <h2> ved >400 ord)",
      stil: "Stil (norsk redaksjonell tone, klarhet)",
    };

    const focusSection = `\nFOKUSOMRÅDER (gjør KUN endringer som faller inn under disse — la alt annet stå urørt):
${focus.map((f) => `- ${focusLabels[f]}`).join("\n")}\n`;

    const systemPrompt = `Du er en erfaren norsk redaktør for en næringslivsavis. Du forbedrer brødtekst i HTML-format slik at den følger redaksjonelle retningslinjer, har riktig sitatformat og kildelenker, og holder seg innenfor anbefalt lengde.

KRAV TIL OUTPUT:
- Returner gyldig HTML for brødteksten (samme typer tagger som inputen: <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <blockquote>).
- IKKE legg til <html>, <body>, <head> eller markdown-fences.
- Behold alle eksisterende lenker (<a href="...">). Hvis en lenke mangler href men beskriver en kilde, marker den, men ikke finn opp URL-er.
- Behold faktiske sitater ordrett. Standardiser kun formatering rundt dem.

SITATFORMAT (norsk standard):
- Direkte sitat: bruk typografiske anførselstegn « og » (ikke " eller ").
- Sitat med kildehenvisning på samme linje: «Sitat», sier Navn Etternavn, tittel.
- Lange sitat (>40 ord): pakk i <blockquote>.
- Bevar talespråklig tone i sitater; ikke "rens" dem.

KILDELENKER:
- Ekstern kilde nevnt i teksten bør lenkes med <a href="...">kildenavn</a> der URL finnes i originalen.
- Ikke fabrikker URL-er. Hvis kilden ikke har URL i originalen, la teksten stå uendret.

LENGDE & STRUKTUR:
- Hvis teksten er for lang sammenlignet med MAKS ORD: stram inn uten å fjerne fakta.
- Hvis for kort vs. MIN. AVSNITT: ikke fyll med fluff. Bare reorganiser eksisterende innhold til flere avsnitt der det er naturlig.
- Hvert avsnitt = ett poeng. Bruk mellomtitler (<h2>) hvis teksten er lengre enn ~400 ord.

REGLER FRA REDAKSJONEN HAR HØYESTE PRIORITET. Følg dem nøye.

VIKTIG: Begrens endringene til fokusområdene som er angitt i brukerprompten. Hvis et område ikke er listet, IKKE rør det. Eksempel: Hvis kun "sitater" er valgt, skal du IKKE endre lengde, struktur eller stil.

Returner et JSON-objekt med:
- "improved_body": HTML-strengen for forbedret brødtekst
- "summary": kort norsk sammendrag (maks 25 ord) av hva du endret
- "issues_found": array av strenger med konkrete problemer du fant og fikset (kategorier: "sitatformat", "kildelenker", "ordtelling", "struktur", "stil")
- "word_count_before": tall
- "word_count_after": tall`;

    const userPrompt = `${guidelineSection}${focusSection}
ORIGINAL BRØDTEKST (HTML):
${body.slice(0, 20000)}`;

    let data;
    try {
      data = await aiChatCompletion({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        tools: [
          {
            type: "function",
            function: {
              name: "return_improved_body",
              description: "Returnerer forbedret brødtekst og endringer.",
              parameters: {
                type: "object",
                properties: {
                  improved_body: { type: "string", description: "Forbedret HTML-brødtekst" },
                  summary: { type: "string", description: "Kort sammendrag av endringer" },
                  issues_found: {
                    type: "array",
                    items: { type: "string" },
                    description: "Konkrete problemer som ble identifisert og fikset",
                  },
                  word_count_before: { type: "number" },
                  word_count_after: { type: "number" },
                },
                required: ["improved_body", "summary", "issues_found", "word_count_before", "word_count_after"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_improved_body" } },
      });
    } catch (e) {
      if (e instanceof AiGatewayError) {
        if (e.status === 429) {
          return new Response(JSON.stringify({ error: "For mange forespørsler, prøv igjen om litt." }), {
            status: 429, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }
        if (e.status === 402) {
          return new Response(JSON.stringify({ error: "AI-kreditter er brukt opp." }), {
            status: 402, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }
      }
      throw e;
    }

    const toolCall = (data.choices?.[0]?.message?.tool_calls as any)?.[0];
    if (!toolCall) {
      throw new Error("AI returnerte ingen strukturert respons");
    }
    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ result: args }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("improve-article-body error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Ukjent feil" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
