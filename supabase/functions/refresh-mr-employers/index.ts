// Weekly full sync of AS/ASA companies in Møre og Romsdal with employee counts
// into mr_companies, so Spør can rank "largest employers" from our own database
// instead of querying Brønnøysund live. Pages enhetsregisteret per kommune
// (each county kommune is well within the API's paging window) and upserts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { MR_KOMMUNE_NUMBERS } from "../articles-chat/mr-kommuner.ts";
import { mapEnhetToMrCompany, type MrCompanyRow } from "./mr-employers-map.ts";

const BRREG_BASE = "https://data.brreg.no";
const PAGE_SIZE = 1000;
const DELAY_MS = 150;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const startedAt = Date.now();
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let upserted = 0;
    let kommunerDone = 0;
    let errors = 0;

    for (const kommune of MR_KOMMUNE_NUMBERS) {
      try {
        for (let page = 0; ; page++) {
          const url =
            `${BRREG_BASE}/enhetsregisteret/api/enheter?organisasjonsform=AS,ASA` +
            `&kommunenummer=${kommune}&size=${PAGE_SIZE}&page=${page}`;
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) break;
          const data = await res.json();
          const enheter: any[] = data?._embedded?.enheter || [];
          if (!enheter.length) break;

          const rows = enheter
            .map(mapEnhetToMrCompany)
            .filter((r): r is MrCompanyRow => r !== null);
          if (rows.length) {
            const { error } = await sb.from("mr_companies").upsert(rows, { onConflict: "orgnr" });
            if (error) {
              errors++;
              console.error(`refresh-mr-employers: upsert ${kommune} p${page}:`, error.message);
            } else {
              upserted += rows.length;
            }
          }

          if (enheter.length < PAGE_SIZE) break;
          await sleep(DELAY_MS);
        }
        kommunerDone++;
        await sleep(DELAY_MS);
      } catch (e) {
        errors++;
        console.error(`refresh-mr-employers: error for kommune ${kommune}:`, e);
      }
    }

    const summary = {
      ok: true,
      kommuner: kommunerDone,
      upserted,
      errors,
      duration_ms: Date.now() - startedAt,
    };
    console.log("refresh-mr-employers:", JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refresh-mr-employers fatal:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
