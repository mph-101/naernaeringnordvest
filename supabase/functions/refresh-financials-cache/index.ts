import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const BRREG_BASE = "https://data.brreg.no";

// Throttle to avoid hammering BRREG. 150ms between requests = ~6.6 req/s.
const DELAY_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  const startedAt = Date.now();

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch all unique orgnr already in the cache. These are the companies
    // we want to keep up to date as new fiscal years are filed with BRREG.
    const { data: orgnrRows, error: orgnrErr } = await sb
      .from("company_financials")
      .select("orgnr");

    if (orgnrErr) throw orgnrErr;

    const uniqueOrgnrs = [...new Set((orgnrRows || []).map((r: any) => r.orgnr))];

    if (uniqueOrgnrs.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Cache is empty, nothing to refresh", refreshed: 0 }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    let companiesProcessed = 0;
    let rowsUpserted = 0;
    let newYearsAdded = 0;
    let errors = 0;

    // 2. For each orgnr, fetch latest filing(s) from BRREG and upsert.
    // We do them sequentially with a small delay to be a good API citizen.
    for (const orgnr of uniqueOrgnrs) {
      try {
        // Track which years we already have BEFORE upserting, so we can
        // count how many new years this refresh added.
        const { data: existingYears } = await sb
          .from("company_financials")
          .select("year")
          .eq("orgnr", orgnr);
        const existingSet = new Set((existingYears || []).map((r: any) => r.year));

        const res = await fetch(
          `${BRREG_BASE}/regnskapsregisteret/regnskap/${orgnr}?size=50&page=0`,
          { headers: { Accept: "application/json" } }
        );

        if (!res.ok) {
          errors++;
          companiesProcessed++;
          await sleep(DELAY_MS);
          continue;
        }

        const data = await res.json();
        const items = Array.isArray(data) ? data : data?._embedded?.regnskaper || [];

        const freshRows = items
          .map((r: any) => {
            const resultat = r.resultatregnskapResultat || {};
            const driftsres = resultat.driftsresultat;
            const eiendeler = r.eiendeler || {};
            const egenkapitalGjeld = r.egenkapitalGjeld || {};
            return {
              orgnr,
              year:
                r.regnskapsperiode?.tilDato?.substring(0, 4) ||
                r.regnskapsperiode?.fraDato?.substring(0, 4) ||
                r.journalnr ||
                "",
              omsetning:
                driftsres?.driftsinntekter?.sumDriftsinntekter ||
                resultat.driftsinntekter?.sumDriftsinntekter ||
                0,
              driftsresultat:
                typeof driftsres === "number" ? driftsres : driftsres?.driftsresultat || 0,
              arsresultat:
                resultat.aarsresultat ||
                resultat.totalresultat ||
                resultat.ordinaertResultatFoerSkattekostnad ||
                0,
              egenkapital:
                egenkapitalGjeld.sumEgenkapitalGjeld ||
                egenkapitalGjeld.egenkapital?.sumEgenkapital ||
                0,
              sum_eiendeler: eiendeler.sumEiendeler || 0,
              fetched_at: new Date().toISOString(),
            };
          })
          .filter((r: any) => r.year);

        if (freshRows.length > 0) {
          const { error: upErr } = await sb
            .from("company_financials")
            .upsert(freshRows, { onConflict: "orgnr,year" });

          if (upErr) {
            errors++;
          } else {
            rowsUpserted += freshRows.length;
            // Collect the years that are genuinely new for this orgnr - they
            // become 'financials_new' notifications for followers below.
            const newRowsForThisOrg = freshRows.filter((r: any) => !existingSet.has(r.year));
            newYearsAdded += newRowsForThisOrg.length;

            if (newRowsForThisOrg.length > 0) {
              const { data: followers } = await sb
                .from("company_follows")
                .select("user_id, company_name")
                .eq("orgnr", orgnr);

              if (followers && followers.length > 0) {
                const inserts = followers.flatMap((f: any) =>
                  newRowsForThisOrg.map((r: any) => ({
                    user_id: f.user_id,
                    type: "financials_new",
                    orgnr,
                    company_name: f.company_name,
                    payload: {
                      year: r.year,
                      omsetning: r.omsetning,
                      driftsresultat: r.driftsresultat,
                      arsresultat: r.arsresultat,
                      egenkapital: r.egenkapital,
                    },
                  }))
                );
                await sb.from("notifications").insert(inserts);
              }
            }
          }
        }

        companiesProcessed++;
        await sleep(DELAY_MS);
      } catch (_e) {
        errors++;
        companiesProcessed++;
        await sleep(DELAY_MS);
      }
    }

    const durationMs = Date.now() - startedAt;

    const summary = {
      ok: true,
      total_companies: uniqueOrgnrs.length,
      companies_processed: companiesProcessed,
      rows_upserted: rowsUpserted,
      new_years_added: newYearsAdded,
      errors,
      duration_ms: durationMs,
      duration_sec: Math.round(durationMs / 1000),
    };

    console.log("refresh-financials-cache:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refresh-financials-cache error:", e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        duration_ms: Date.now() - startedAt,
      }),
      {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
