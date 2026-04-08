import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRREG_BASE = "https://data.brreg.no";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string" || question.length > 500) {
      return new Response(JSON.stringify({ error: "Ugyldig spørsmål" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Step 1: Use AI to parse the question into BRREG API search parameters
    const parseResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Du er en ekspert på Brønnøysundregistrene sitt API for enhetsregisteret.

Brukeren stiller et spørsmål om norske selskaper. Du skal bestemme hvilke API-kall som trengs for å svare.

BRREG enhetsregisteret API base: https://data.brreg.no/enhetsregisteret/api/enheter

Tilgjengelige parametere:
- navn: Selskapsnavn (tekstsøk)
- kommunenummer: 4-sifret kommunenummer
- organisasjonsform: AS,ASA (alltid inkluder dette)
- naeringskode: NACE-kode for bransjefilter
- sort: Sorteringsfelt, kan være: navn, antallAnsatte, stiftelsesdato, registreringsdatoEnhetsregisteret
- size: Antall resultater (maks 50)
- konkurs: true/false

Norske fylker og kommunenumre (første 2 siffer):
- Agder: 42
- Innlandet: 34
- Møre og Romsdal: 15
- Nordland: 18
- Oslo: 03
- Rogaland: 11
- Troms: 55
- Trøndelag: 50
- Vestfold: 39
- Vestland: 46
- Viken/Akershus/Buskerud/Østfold: 31,32,33 (bruk 30,31,32,33)
- Telemark: 40

Viktige kommunenumre:
- Oslo: 0301
- Bergen: 4601
- Trondheim: 5001
- Stavanger: 1103
- Molde: 1506
- Ålesund: 1507
- Kristiansund: 1505
- Tromsø: 5501
- Bodø: 1804
- Drammen: 3005
- Fredrikstad: 3004
- Kristiansand: 4204

For spørsmål om "hvert fylke" eller "alle fylker": opprett en query per fylke.

Returner KUN JSON-array med søkeparametere. Hvert objekt har:
{
  "label": "Beskrivelse av søket",
  "params": { "sort": "antallAnsatte,desc", "size": "5", "organisasjonsform": "AS,ASA", ... },
  "fylke": "Fylkesnavn (valgfritt, for kontekst)"
}

Eksempel for "Hvem er de fem største private arbeidsgiverne i Molde":
[{"label":"Største arbeidsgivere i Molde","params":{"sort":"antallAnsatte,desc","size":"5","organisasjonsform":"AS,ASA","kommunenummer":"1506"},"fylke":"Møre og Romsdal"}]

Eksempel for "Mest lønnsomme selskap i hvert fylke" - lag én query per fylke med size=1.

Returner BARE JSON, ingen annen tekst.`
          },
          { role: "user", content: question }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "plan_queries",
              description: "Plan BRREG API queries to answer the user's question",
              parameters: {
                type: "object",
                properties: {
                  queries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Human-readable description of this query" },
                        params: {
                          type: "object",
                          properties: {
                            navn: { type: "string" },
                            kommunenummer: { type: "string" },
                            organisasjonsform: { type: "string" },
                            naeringskode: { type: "string" },
                            sort: { type: "string" },
                            size: { type: "string" },
                            konkurs: { type: "string" },
                          },
                        },
                        fylke: { type: "string" },
                      },
                      required: ["label", "params"],
                    },
                  },
                },
                required: ["queries"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "plan_queries" } },
      }),
    });

    if (!parseResponse.ok) {
      const status = parseResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "For mange forespørsler, prøv igjen om litt." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Kreditt oppbrukt." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI parse error");
    }

    const parseData = await parseResponse.json();

    // Extract tool call result
    let queries: any[] = [];
    const toolCall = parseData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        queries = args.queries || [];
      } catch {
        // fallback: try parsing content
      }
    }

    if (!queries.length) {
      // Fallback: try content as JSON
      const content = parseData.choices?.[0]?.message?.content || "";
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        queries = JSON.parse(cleaned);
      } catch {
        return new Response(JSON.stringify({ error: "Kunne ikke tolke spørsmålet", answer: "Beklager, jeg forsto ikke spørsmålet. Prøv å omformulere." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Limit to max 20 queries
    queries = queries.slice(0, 20);

    // Step 2: Execute all BRREG queries in parallel
    const results = await Promise.all(
      queries.map(async (q: any) => {
        const params = new URLSearchParams();
        if (!q.params.organisasjonsform) params.set("organisasjonsform", "AS,ASA");
        for (const [k, v] of Object.entries(q.params)) {
          if (v) params.set(k, String(v));
        }
        try {
          const res = await fetch(`${BRREG_BASE}/enhetsregisteret/api/enheter?${params}`, {
            headers: { Accept: "application/json" },
          });
          const data = await res.json();
          const enheter = data?._embedded?.enheter || [];
          return {
            label: q.label,
            fylke: q.fylke || null,
            total: data?.page?.totalElements || 0,
            companies: enheter.map((e: any) => ({
              navn: e.navn,
              orgnr: e.organisasjonsnummer,
              ansatte: e.antallAnsatte || 0,
              kommune: e.forretningsadresse?.kommune || "",
              bransje: e.naeringskode1?.beskrivelse || "",
              stiftet: e.stiftelsesdato || "",
              konkurs: e.konkurs || false,
            })),
          };
        } catch {
          return { label: q.label, fylke: q.fylke, total: 0, companies: [] };
        }
      })
    );

    // Step 3: Use AI to compose a natural language answer
    const answerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Du er en norsk bedriftsanalytiker. Svar på brukerens spørsmål basert på dataene fra Brønnøysundregistrene.

Formater svaret med Markdown:
- Bruk **fet skrift** for selskapsnavn
- Bruk tabeller der det er naturlig
- Inkluder antall ansatte, kommune og bransje der relevant
- Vær presis og saklig
- Avslutt alltid med: "Kilde: Brønnøysundregistrene (data.brreg.no)"
- Hvis ingen data ble funnet, forklar det og foreslå alternative søk`
          },
          {
            role: "user",
            content: `Spørsmål: ${question}\n\nData fra Brønnøysundregistrene:\n${JSON.stringify(results, null, 2)}`
          },
        ],
      }),
    });

    if (!answerResponse.ok) {
      const status = answerResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "For mange forespørsler, prøv igjen om litt." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Kreditt oppbrukt." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI answer error");
    }

    const answerData = await answerResponse.json();
    const answer = answerData.choices?.[0]?.message?.content || "Beklager, kunne ikke generere svar.";

    return new Response(JSON.stringify({ answer, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("brreg-query error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
