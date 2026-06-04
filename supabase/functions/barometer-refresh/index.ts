// barometer-refresh — fyller barometer_datapoints med ferske SSB-tall for
// Møre og Romsdal (SSB-region 15 = editorial-region 'nordvestlandet').
//
// Åpne moduler: naeringspuls_kpi, konkursgraf_12mnd, bransje_snapshot,
// kommune_grunntall. Lukkede moduler (bak mur): naeringspuls_avvik
// (avvikstolkning), kommune_benchmark.
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

// Kommuner i kommuneprofilen (gjeldende koder). På kommune-moduler brukes
// nace_code-feltet som breakdown-nøkkel = kommunekode.
const KOMMUNER = [
  { code: "1506", navn: "Molde" },
  { code: "1508", navn: "Ålesund" },
  { code: "1505", navn: "Kristiansund" },
];
const KOMMUNE_CODES = KOMMUNER.map((k) => k.code);
const kommuneNavn = (code: string) => KOMMUNER.find((k) => k.code === code)?.navn ?? code;

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
const median = (a: number[]): number => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round1 = (x: number) => Math.round(x * 10) / 10;

// --- Konkurser (08551): åpen graf + KPI, lukket avvikstolkning -------------
async function konkurser(): Promise<Datapoint[]> {
  const { cells } = await ssbFetch("08551", [
    item("Region", [SSB_REGION]),
    item("NACE2007", ["00-99"]),
    item("ContentsCode", ["Konkurser"]),
    top("Tid", 132),
  ]);
  const series = cells
    .filter((c) => c.value != null)
    .map((c) => ({ period: c.dims.Tid, value: c.value as number }))
    .sort((a, b) => byPeriodAsc(a.period, b.period));
  if (series.length === 0) return [];

  const out: Datapoint[] = [];
  for (const p of series.slice(-24)) {
    out.push({
      region_slug: REGION_SLUG, module_key: "konkursgraf_12mnd",
      indicator: "konkurser", nace_code: "", period: p.period,
      label: "Opna konkursar", value: p.value, unit: "antall",
      meta: {}, source_table: "08551",
    });
  }
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
  // Lukket: 12-mnd-sum mot sesongnormal (median per kalendermnd eks 2020-21).
  const byMonth: Record<string, number[]> = {};
  for (const r of series) {
    const yr = r.period.slice(0, 4);
    if (yr === "2020" || yr === "2021") continue;
    (byMonth[r.period.slice(5)] ??= []).push(r.value);
  }
  const seasonal = Object.values(byMonth).reduce((a, arr) => a + median(arr), 0);
  if (seasonal > 0) {
    out.push({
      region_slug: REGION_SLUG, module_key: "naeringspuls_avvik",
      indicator: "konkurser_avvik", nace_code: "", period: latest,
      label: "Konkurser mot sesongnormal",
      value: round1(((sum12 - seasonal) / seasonal) * 100), unit: "prosent",
      meta: { observed: sum12, baseline: Math.round(seasonal) }, source_table: "08551",
    });
  }
  return out;
}

// --- Etableringer (14623): åpen KPI + lukket avvik vs 5-årssnitt -----------
async function etableringer(): Promise<Datapoint[]> {
  const { cells } = await ssbFetch("14623", [
    item("Region", [SSB_REGION]),
    item("Kjonn", ["F"]),
    item("OrgFormer", ["_T"]),
    item("NACE2007", ["00-99"]),
    item("AntAnsatte", ["99"]),
    item("AntEtabl", ["00"]),
    item("ContentsCode", ["EtablertForetak"]),
    top("Tid", 8),
  ]);
  // _rens: SSB returns 0 for the not-yet-published latest year — drop 0/null.
  const series = cells
    .filter((c) => c.value != null && c.value !== 0)
    .map((c) => ({ period: c.dims.Tid, value: c.value as number }))
    .sort((a, b) => byPeriodAsc(a.period, b.period));
  if (series.length === 0) return [];
  const latest = series[series.length - 1];
  const out: Datapoint[] = [{
    region_slug: REGION_SLUG, module_key: "naeringspuls_kpi",
    indicator: "etableringer", nace_code: "", period: latest.period,
    label: "Nye foretak (siste år)", value: latest.value, unit: "antall",
    meta: { note: "siste publiserte år" }, source_table: "14623",
  }];
  if (series.length >= 6) {
    const avg5 = series.slice(-6, -1).reduce((a, b) => a + b.value, 0) / 5;
    out.push({
      region_slug: REGION_SLUG, module_key: "naeringspuls_avvik",
      indicator: "etableringer_avvik", nace_code: "", period: latest.period,
      label: "Nye foretak mot 5-årssnitt",
      value: round1(((latest.value - avg5) / avg5) * 100), unit: "prosent",
      meta: { observed: latest.value, baseline: round1(avg5) }, source_table: "14623",
    });
  }
  return out;
}

// --- Omsetning (12937): åpen snapshot/KPI + lukket vekst-avvik -------------
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

  const byNaceYear = new Map<string, number>();
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
  out.push({
    region_slug: REGION_SLUG, module_key: "naeringspuls_kpi",
    indicator: "omsetning_total", nace_code: "", period: latestYear,
    label: "Omsetning, alle næringer", value: Math.round(totalLatest),
    unit: "mill_nok", meta: { naeringer: out.length }, source_table: "12937",
  });
  if (prevYear && totalPrev > 0) {
    const vekst = ((totalLatest - totalPrev) / totalPrev) * 100;
    out.push({
      region_slug: REGION_SLUG, module_key: "naeringspuls_kpi",
      indicator: "omsetning_vekst", nace_code: "", period: latestYear,
      label: "Omsetningsvekst å/å", value: round1(vekst),
      unit: "prosent", meta: { prev_period: prevYear }, source_table: "12937",
    });
    out.push({
      region_slug: REGION_SLUG, module_key: "naeringspuls_avvik",
      indicator: "omsetning_avvik", nace_code: "", period: latestYear,
      label: "Omsetningsvekst mot året før", value: round1(vekst), unit: "prosent",
      meta: { observed: Math.round(totalLatest), baseline: Math.round(totalPrev) },
      source_table: "12937",
    });
  }
  return out;
}

// --- Kommune: åpen grunntall + lukket benchmark ----------------------------
// 07459: utelat Kjonn/Alder helt -> SSB eliminerer (totalbefolkning).
async function kommune(): Promise<Datapoint[]> {
  const [bef, bed, innt] = await Promise.all([
    ssbFetch("07459", [item("Region", KOMMUNE_CODES), item("ContentsCode", ["Personer1"]), top("Tid", 1)]),
    ssbFetch("10309", [item("Region", KOMMUNE_CODES), item("NACE2007", ["00-99", "45-47"]), item("AntAnsatte", ["99"]), item("ContentsCode", ["Virksheter"]), top("Tid", 1)]),
    ssbFetch("06944", [item("Region", KOMMUNE_CODES), item("HusholdType", ["0000"]), item("ContentsCode", ["InntSkatt"]), top("Tid", 1)]),
  ]);
  const out: Datapoint[] = [];
  const push = (module: string, indicator: string, kcode: string, period: string, value: number, unit: string, table: string, meta: Record<string, unknown> = {}) =>
    out.push({
      region_slug: REGION_SLUG, module_key: module, indicator,
      nace_code: kcode, period, label: kommuneNavn(kcode), value, unit,
      meta: { kommune: kommuneNavn(kcode), ...meta }, source_table: table,
    });

  const befByK: Record<string, number> = {};
  const bedByK: Record<string, number> = {};
  let bedYear = "";
  for (const c of bef.cells) if (c.value != null) {
    befByK[c.dims.Region] = c.value as number;
    push("kommune_grunntall", "befolkning", c.dims.Region, c.dims.Tid, c.value as number, "antall", "07459");
  }
  for (const c of bed.cells) if (c.value != null) {
    if (c.dims.NACE2007 === "00-99") { bedByK[c.dims.Region] = c.value as number; bedYear = c.dims.Tid; }
    push("kommune_grunntall", c.dims.NACE2007 === "45-47" ? "bedrifter_varehandel" : "bedrifter", c.dims.Region, c.dims.Tid, c.value as number, "antall", "10309");
  }
  for (const c of innt.cells) if (c.value != null) push("kommune_grunntall", "inntekt_median", c.dims.Region, c.dims.Tid, c.value as number, "kr", "06944");

  // Lukket benchmark: bedriftstetthet (bedrifter per 1000 innbyggere).
  for (const code of KOMMUNE_CODES) {
    if (befByK[code] && bedByK[code]) {
      push("kommune_benchmark", "bedrifter_per_1000", code, bedYear,
        round1((bedByK[code] / befByK[code]) * 1000), "per_1000", "10309",
        { bedrifter: bedByK[code], befolkning: befByK[code] });
    }
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

  const results = await Promise.allSettled([
    konkurser(),
    etableringer(),
    omsetning(),
    kommune(),
  ]);

  const rows: Datapoint[] = [];
  const errors: string[] = [];
  const names = ["konkurser", "etableringer", "omsetning", "kommune"];
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
