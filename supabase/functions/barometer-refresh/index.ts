// barometer-refresh — fyller barometer_datapoints med ferske SSB-tall for
// Møre og Romsdal (SSB-region 15 = editorial-region 'nordvestlandet').
//
// Tre indikatorer (jf. overlevering / naeringspuls.py):
//   - konkurser   (08551, månedlig, NACE 00-99 = total)
//   - etableringer(14623, årlig, Foretak; _rens fjerner ikke-publisert siste år)
//   - omsetning   (12937, årlig, per NACE-hovedområde via vs:NACE2007StrHoved)
//
// Skriver kun via service_role (RLS-gating skjer på lesesiden). Idempotent
// upsert på (region_slug, module_key, indicator, nace_code, period).
// Cron-trigget (verify_jwt=false); kan også POST-es manuelt for test.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  ssbFetch,
  item,
  top,
  valueset,
  NACE_HOVEDOMRADE,
  type SsbCell,
} from "../_shared/ssb.ts";

const SSB_REGION = "15";
const REGION_SLUG = "nordvestlandet";

const json = (body: unknown, status = 200, req?: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });

interface Datapoint {
  region_slug: string;
  module_key: string;
  indicator: string;
  nace_code: string;
  period: string;
  label: string | null;
  value: number | null;
  unit: string | null;
  meta: Record<string, unknown>;
  source_table: string;
}

const byPeriodAsc = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// --- Konkurser (08551) -----------------------------------------------------
async function konkurser(): Promise<Datapoint[]> {
  const { cells } = await ssbFetch("08551", [
    item("Region", [SSB_REGION]),
    item("NACE2007", ["00-99"]),
    item("ContentsCode", ["Konkurser"]),
    top("Tid", 24),
  ]);
  const series = cells
    .filter((c) => c.value != null)
    .map((c) => ({ period: c.dims.Tid, value: c.value as number }))
    .sort((a, b) => byPeriodAsc(a.period, b.period));
  if (series.length === 0) return [];

  const out: Datapoint[] = [];
  // Monthly series for the open konkursgraf (last 24 points).
  for (const p of series) {
    out.push({
      region_slug: REGION_SLUG, module_key: "konkursgraf_12mnd",
      indicator: "konkurser", nace_code: "", period: p.period,
      label: "Opna konkursar", value: p.value, unit: "antall",
      meta: {}, source_table: "08551",
    });
  }
  // Rolling 12-month sum as a KPI (anchored on the latest month).
  const last12 = series.slice(-12);
  const sum12 = last12.reduce((a, b) => a + b.value, 0);
  const latest = series[series.length - 1].period;
  out.push({
    region_slug: REGION_SLUG, module_key: "naeringspuls_kpi",
    indicator: "konkurser_12mnd", nace_code: "", period: latest,
    label: "Konkurser siste 12 md", value: sum12, unit: "antall",
    meta: { from: last12[0].period, to: latest, months: last12.length },
    source_table: "08551",
  });
  return out;
}

// --- Etableringer (14623) --------------------------------------------------
async function etableringer(): Promise<Datapoint[]> {
  const { cells } = await ssbFetch("14623", [
    item("Region", [SSB_REGION]),
    item("Kjonn", ["F"]),
    item("OrgFormer", ["_T"]),
    item("NACE2007", ["00-99"]),
    item("AntAnsatte", ["99"]),
    item("AntEtabl", ["00"]),
    item("ContentsCode", ["EtablertForetak"]),
    top("Tid", 7),
  ]);
  // _rens: SSB returns 0 for the not-yet-published latest year — drop 0/null.
  const series = cells
    .filter((c) => c.value != null && c.value !== 0)
    .map((c) => ({ period: c.dims.Tid, value: c.value as number }))
    .sort((a, b) => byPeriodAsc(a.period, b.period));
  if (series.length === 0) return [];
  const latest = series[series.length - 1];
  return [{
    region_slug: REGION_SLUG, module_key: "naeringspuls_kpi",
    indicator: "etableringer", nace_code: "", period: latest.period,
    label: "Nye foretak (siste år)", value: latest.value, unit: "antall",
    meta: { note: "siste publiserte år" }, source_table: "14623",
  }];
}

// --- Omsetning (12937) -----------------------------------------------------
async function omsetning(): Promise<Datapoint[]> {
  const { cells, labels } = await ssbFetch("12937", [
    item("Region", [SSB_REGION]),
    valueset("NACE2007", "NACE2007StrHoved", NACE_HOVEDOMRADE),
    item("ContentsCode", ["Oms"]),
    top("Tid", 2),
  ]);
  const valued = cells.filter((c) => c.value != null) as (SsbCell & { value: number })[];
  if (valued.length === 0) return [];
  const years = [...new Set(valued.map((c) => c.dims.Tid))].sort(byPeriodAsc);
  if (years.length < 1) return [];
  const latestYear = years[years.length - 1];
  const prevYear = years.length >= 2 ? years[years.length - 2] : null;

  const byNaceYear = new Map<string, number>(); // `${nace}|${year}` -> oms
  for (const c of valued) byNaceYear.set(`${c.dims.NACE2007}|${c.dims.Tid}`, c.value);

  const out: Datapoint[] = [];
  let totalLatest = 0;
  let totalPrev = 0;
  for (const nace of NACE_HOVEDOMRADE) {
    const cur = byNaceYear.get(`${nace}|${latestYear}`);
    if (cur == null) continue;
    totalLatest += cur;
    const prev = prevYear ? byNaceYear.get(`${nace}|${prevYear}`) ?? null : null;
    if (prev != null) totalPrev += prev;
    const yoy = prev != null && prev !== 0 ? ((cur - prev) / prev) * 100 : null;
    out.push({
      region_slug: REGION_SLUG, module_key: "bransje_snapshot",
      indicator: "omsetning", nace_code: nace, period: latestYear,
      label: labels.NACE2007?.[nace] ?? `Næring ${nace}`,
      value: cur, unit: "mill_nok",
      meta: { yoy_pct: yoy, prev_value: prev, prev_period: prevYear },
      source_table: "12937",
    });
  }
  // KPI: total omsetning + year-over-year growth.
  out.push({
    region_slug: REGION_SLUG, module_key: "naeringspuls_kpi",
    indicator: "omsetning_total", nace_code: "", period: latestYear,
    label: "Omsetning, alle næringer", value: Math.round(totalLatest),
    unit: "mill_nok", meta: { naeringer: out.length }, source_table: "12937",
  });
  if (prevYear && totalPrev > 0) {
    out.push({
      region_slug: REGION_SLUG, module_key: "naeringspuls_kpi",
      indicator: "omsetning_vekst", nace_code: "", period: latestYear,
      label: "Omsetningsvekst å/å",
      value: Math.round(((totalLatest - totalPrev) / totalPrev) * 1000) / 10,
      unit: "prosent", meta: { prev_period: prevYear }, source_table: "12937",
    });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Run all three indicators; one failing must not kill the others.
  const results = await Promise.allSettled([
    konkurser(),
    etableringer(),
    omsetning(),
  ]);

  const rows: Datapoint[] = [];
  const errors: string[] = [];
  const names = ["konkurser", "etableringer", "omsetning"];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") rows.push(...r.value);
    else errors.push(`${names[i]}: ${r.reason?.message ?? r.reason}`);
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from("barometer_datapoints")
      .upsert(rows, {
        onConflict: "region_slug,module_key,indicator,nace_code,period",
      });
    if (error) {
      return json({ ok: false, error: error.message, errors }, 500, req);
    }
  }

  return json({
    ok: errors.length === 0,
    upserted: rows.length,
    indicators: { ok: names.filter((_, i) => results[i].status === "fulfilled") },
    errors,
    region: REGION_SLUG,
  }, 200, req);
});
