import { corsHeaders } from "../_shared/cors.ts";
import { aiChatCompletion, AiGatewayError } from "../_shared/ai-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { body, customRules, profile, focusAreas } = await req.json();

    if (!body || body.length < 50) {
      return new Response(JSON.stringify({ error: "Brødteksten må være minst 50 tegn" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const plainText = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const rulesSection = Array.isArray(customRules) && customRules.length > 0
      ? `\n\nVIKTIG - Redaksjonens egne regler (HØYESTE PRIORITET, anvend alltid når mønsteret finnes):\n${customRules
          .slice(0, 100)
          .map((r: any) => `- "${r.from}" → "${r.to}"${r.reason ? ` (${r.reason})` : ""} [kategori: ${r.category || "stil"}]`)
          .join("\n")}\n`
      : "";

    // Language profile guidance
    const profileGuidance: Record<string, string> = {
      konservativt: `Bruk KONSERVATIVT BOKMÅL (riksmålsnært). Foretrekk -en/-et-former (boken, huset, regjeringen). Unngå alle a-endelser i hunkjønnsord og verb i preteritum (skrev IKKE skreiv, kastet IKKE kasta). Bruk tradisjonelle ord som "frem", "etter", "nu/nå", "meget".`,
      moderat: `Bruk MODERAT BOKMÅL (avisstandard). Foretrekk -en/-ene-former i de fleste tilfeller (boken, folkene), men aksepter etablerte a-former som "jenta", "hytta". Preteritum med -et (kastet, hoppet).`,
      radikalt: `Bruk RADIKALT BOKMÅL (folkenært). Foretrekk -a-endelser i hunkjønn (boka, jenta, hytta) og preteritum (kasta, hoppa). Bruk "fram" fremfor "frem", "etter" fremfor "efter". Tillat folkelige former som "sjøl" der det passer.`,
      nynorsk: `Bruk NYNORSK. Konverter bokmålsformer til nynorsk (ikke → ikkje, jeg → eg, hva → kva, noe → noko, fra → frå). Bruk a-infinitiv (å kasta, å hoppa) eller e-infinitiv konsekvent.`,
    };
    const selectedProfile = profileGuidance[profile] || profileGuidance.moderat;

    // Focus area filtering
    const allFocusAreas = {
      anglisismer: `1. Anglisismer som bør erstattes med norske ord (f.eks. "turnover" → "gjennomstrømming", "feedback" → "tilbakemelding", "deadline" → "frist", "performance" → "ytelse")`,
      stil: `2. Målform-standardisering iht. valgt språkprofil (se over)`,
      grammatikk: `3. Grammatiske feil og skrivefeil`,
      forenkling: `4. Unødvendig kompliserte formuleringer som kan forenkles`,
      idiomatisk: `5. Uidiomatiske uttrykk`,
    };
    const enabledFocus = Array.isArray(focusAreas) && focusAreas.length > 0
      ? focusAreas.filter((k: string) => k in allFocusAreas).map((k: string) => allFocusAreas[k as keyof typeof allFocusAreas])
      : Object.values(allFocusAreas);

    const prompt = `Du er en erfaren norsk språkvasker for en næringslivsavis. Analyser følgende tekst og finn konkrete forbedringsforslag.

SPRÅKPROFIL: ${selectedProfile}${rulesSection}

Fokuser på:
${enabledFocus.join("\n")}

For hvert forslag, returner:
- "original": den eksakte teksten som finnes i originalen (kopier nøyaktig)
- "suggestion": foreslått erstatning
- "reason": kort forklaring på norsk (maks 10 ord)
- "category": en av "anglisisme", "dialekt", "grammatikk", "forenkling", "skrivefeil", "stil"

Returner KUN en JSON-array med objekter. Ingen markdown, ingen forklaring utenfor JSON. Returner tom array [] hvis ingen forslag.

Tekst:
${plainText.slice(0, 6000)}`;

    let data;
    try {
      data = await aiChatCompletion({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
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

    const content = (data.choices?.[0]?.message?.content as string) || "[]";
    const match = content.match(/\[[\s\S]*\]/);
    const suggestions = match ? JSON.parse(match[0]) : [];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("proofread-article error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
