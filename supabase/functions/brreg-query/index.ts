import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

const BRREG_BASE = "https://data.brreg.no";

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string" || question.length > 500) {
      return new Response(JSON.stringify({ error: "Ugyldig spørsmål" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
            content: `Du er en ekspert på Brønnøysundregistrene sine API-er.

Brukeren stiller et spørsmål om norske selskaper. Du skal bestemme hvilke API-kall som trengs for å svare.

DU HAR TILGANG TIL TRE DATAKILDER:

1. ENHETSREGISTERET (selskapsoppslag)
   Base: https://data.brreg.no/enhetsregisteret/api/enheter
   Parametere: navn, kommunenummer, organisasjonsform (AS,ASA), naeringskode, sort (navn/antallAnsatte/stiftelsesdato/registreringsdatoEnhetsregisteret), size (maks 50), konkurs (true/false)

2. REGNSKAPSREGISTERET (regnskapsdata for et spesifikt selskap)
   Base: https://data.brreg.no/regnskapsregisteret/regnskap/{orgnr}
   Returner omsetning, driftsresultat, årsresultat, egenkapital, sum eiendeler per år.
   ALLTID sett fetch_financials=true når brukeren nevner et navngitt selskap OG bruker noen av disse ordene/begrepene:
   - lønnsom, lønnsomhet, lønnsomme
   - økonomi, økonomisk, finansiell, finansielt
   - omsetning, salg, inntekter
   - driftsresultat, resultat, overskudd, underskudd, tap
   - regnskap, årsregnskap, regnskapstall, regnskapsdata, nøkkeltall
   - vekst, utvikling, trend
   - tjener, tjent, går det bra, går det dårlig, hvordan går det
   - margin, marginer, EBIT, EBITDA
   - egenkapital, soliditet
   - "hvor stor", "hvor mye", "hva omsetter"

3. KONKURSREGISTERET (via enhetsregisteret med konkurs=true)
   Bruk parameteren konkurs=true for å finne selskaper som er konkurs.
   Kombiner med kommunenummer for geografisk filtrering.

NORSKE FYLKER OG KOMMUNENUMRE (første 2 siffer):
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
- Viken/Akershus/Buskerud/Østfold: 30,31,32,33
- Telemark: 40

Viktige kommunenumre:
- Oslo: 0301, Bergen: 4601, Trondheim: 5001, Stavanger: 1103
- Molde: 1506, Ålesund: 1507, Kristiansund: 1505
- Tromsø: 5501, Bodø: 1804, Drammen: 3005
- Fredrikstad: 3004, Kristiansand: 4204

VIKTIG: For spørsmål om økonomi/regnskap for et spesifikt selskap, lag FØRST en enhetsregisteret-query for å finne orgnr, og sett fetch_financials=true.

TVILTILFELLER: Hvis du er usikker på om brukeren spør om økonomi - sett fetch_financials=true. Bedre å ha regnskapsdata tilgjengelig og ikke trenge den, enn å mangle den.

Returner KUN JSON via tool call. Hvert objekt har:
{
  "label": "Beskrivelse av søket",
  "params": { "sort": "antallAnsatte,desc", "size": "5", "organisasjonsform": "AS,ASA", ... },
  "fylke": "Fylkesnavn (valgfritt)",
  "fetch_financials": true/false (sett true hvis brukeren spør om økonomi/regnskap)
}`
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
                        fetch_financials: { type: "boolean", description: "Set true to also fetch financial data for top results" },
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
          status: 429, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Kreditt oppbrukt." }), {
          status: 402, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
          const companies = enheter.map((e: any) => ({
            navn: e.navn,
            orgnr: e.organisasjonsnummer,
            ansatte: e.antallAnsatte || 0,
            kommune: e.forretningsadresse?.kommune || "",
            bransje: e.naeringskode1?.beskrivelse || "",
            stiftet: e.stiftelsesdato || "",
            konkurs: e.konkurs || false,
            konkursdato: e.konkursdato || null,
          }));

          // Step 2b: If fetch_financials is requested, get financial data for top results
          // Fetches fresh from BRREG, caches to Supabase, then returns all cached years (timeseries)
          let financials: Record<string, any> | undefined;
          if (q.fetch_financials && companies.length > 0) {
            const sb = getSupabaseAdmin();
            const topOrgnrs = companies.slice(0, 5).map((c: any) => c.orgnr);
            financials = {};
            const rowsToCache: any[] = [];

            await Promise.all(
              topOrgnrs.map(async (orgnr: string) => {
                try {
                  // Fetch fresh from BRREG
                  const fRes = await fetch(
                    `${BRREG_BASE}/regnskapsregisteret/regnskap/${orgnr}?size=5&page=0`,
                    { headers: { Accept: "application/json" } }
                  );
                  if (fRes.ok) {
                    const fData = await fRes.json();
                    const items = Array.isArray(fData) ? fData : fData?._embedded?.regnskaper || [];
                    for (const r of items) {
                      const resultat = r.resultatregnskapResultat || {};
                      const driftsres = resultat.driftsresultat;
                      const egenkapitalGjeld = r.egenkapitalGjeld || {};
                      const eiendeler = r.eiendeler || {};
                      // Use tilDato for year label — Norwegian fiscal year convention.
                      const year = r.regnskapsperiode?.tilDato?.substring(0, 4) || r.regnskapsperiode?.fraDato?.substring(0, 4) || "";
                      if (year) {
                        rowsToCache.push({
                          orgnr,
                          year,
                          omsetning: driftsres?.driftsinntekter?.sumDriftsinntekter || resultat.driftsinntekter?.sumDriftsinntekter || 0,
                          driftsresultat: typeof driftsres === "number" ? driftsres : (driftsres?.driftsresultat || 0),
                          arsresultat: resultat.aarsresultat || resultat.totalresultat || resultat.ordinaertResultatFoerSkattekostnad || 0,
                          egenkapital: egenkapitalGjeld.sumEgenkapitalGjeld || egenkapitalGjeld.egenkapital?.sumEgenkapital || 0,
                          sum_eiendeler: eiendeler.sumEiendeler || 0,
                          fetched_at: new Date().toISOString(),
                        });
                      }
                    }
                  }

                  // Return all cached years (historical + fresh)
                  const { data: cached } = await sb
                    .from("company_financials")
                    .select("year, omsetning, driftsresultat, arsresultat, egenkapital")
                    .eq("orgnr", orgnr)
                    .order("year", { ascending: false });

                  financials![orgnr] = (cached || []).map((c: any) => ({
                    year: c.year,
                    omsetning: c.omsetning,
                    driftsresultat: c.driftsresultat,
                    arsresultat: c.arsresultat,
                    egenkapital: c.egenkapital,
                  }));
                } catch { financials![orgnr] = null; }
              })
            );

            // Batch upsert all fresh data to cache
            if (rowsToCache.length > 0) {
              await sb.from("company_financials").upsert(rowsToCache, { onConflict: "orgnr,year" });
            }
          }

          return {
            label: q.label,
            fylke: q.fylke || null,
            total: data?.page?.totalElements || 0,
            companies,
            ...(financials ? { financials } : {}),
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

TERMINOLOGI (viktig - bruk presist):
- "omsetning" = sumDriftsinntekter (driftsinntekter totalt)
- "driftsresultat" = EBIT (resultat før finansposter og skatt)
- "årsresultat" = resultat etter skatt (det selskapet sitter igjen med)
- "ordinært resultat før skatt" = før skattekostnaden er trukket fra (typisk høyere enn årsresultat)
- IKKE bland sammen disse begrepene - bruk dem riktig

DATAFORMAT:
- Alle tall i feltene omsetning/driftsresultat/årsresultat/egenkapital er i HELE KRONER fra BRREG
- Når du presenterer dem som "TNOK" (tusen kroner), del på 1000 først
- For større tall (>1 mrd) kan du også bruke "MNOK" (millioner)

REGLER FOR SVARET:
- Bruk **fet skrift** for selskapsnavn
- Bruk Markdown-tabeller for tallpresentasjon
- Inkluder antall ansatte, kommune og bransje der relevant
- Hvis regnskapsdata (financials) er inkludert, vis omsetning, driftsresultat OG årsresultat i tabell med alle tilgjengelige år
- Hvis det finnes data for flere år, vis utviklingen over tid og kommenter trender (vekst/nedgang i prosent)
- Hvis kun ett år er tilgjengelig, IKKE finn på tall for tidligere år - oppgi kun det som faktisk er der
- Beregn driftsmargin = driftsresultat / omsetning × 100 (vis med 1 desimal)
- For konkurs-spørsmål: vis selskapsnavn, konkursdato, kommune og bransje
- Vær presis og saklig - aldri finn på tall som ikke er i datagrunnlaget
- Hvis financials-feltet mangler eller er null for et selskap, si tydelig at regnskapsdata ikke er tilgjengelig
- Avslutt alltid med: "Kilde: Brønnøysundregistrene (data.brreg.no)"`
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
          status: 429, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Kreditt oppbrukt." }), {
          status: 402, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      throw new Error("AI answer error");
    }

    const answerData = await answerResponse.json();
    const answer = answerData.choices?.[0]?.message?.content || "Beklager, kunne ikke generere svar.";

    return new Response(JSON.stringify({ answer, results }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("brreg-query error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
