// detect-barometer-signals — avviksdetektor for næringsbarometeret.
// Porter vurder_*-logikken fra naeringspuls.py (kildeuavhengig). Leser SSB-
// historikk, regner avvik per indikator, og inserter `pending`-rader i
// barometer_signals som mater den godkjenningsstyrte arbeidsflyten (speiler
// job_changes). En redaktør vurderer dem og kan spinne dem til forsidesaker.
//
// Avviksmetode (overlevering §51-59), terskler kalibrert mot 3-4 års historikk:
//   - konkurser  (08551, mnd): faktisk 12-mnd-sum mot sesongnormal = median per
//                kalendermåned eks. pandemiår 2020-21. Terskel 20 %.
//   - etableringer (14623, år): siste reelle år mot glidende 5-årssnitt. 22 %.
//   - omsetning  (12937, år): siste år mot året før, per bransje. 13 %.
//
// Modus: ?mode=backtest (standard, INSERTER IKKE — kalibreringsverktøy) eller
// ?mode=run (inserter dagens signaler). Terskler kan overstyres i body for test.
// Cron-trigget (verify_jwt=false).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { ssbFetch, item, top, valueset, NACE_HOVEDOMRADE } from "../_shared/ssb.ts";

const SSB_REGION = "15";
const REGION_SLUG = "nordvestlandet";

// Kalibrerte standardterskler (andel, ikke prosent). "Spaken" — flyttes hit.
const DEFAULT_THRESHOLDS = { konkurser: 0.20, etableringer: 0.22, omsetning: 0.13 };
// Sesongnormalen for konkurser ekskluderer pandemiårene.
const KONKURS_EXCLUDE_YEARS = new Set(["2020", "2021"]);

const json = (body: unknown, status = 200, req?: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });

const median = (a: number[]): number => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const byAsc = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const round1 = (x: number) => Math.round(x * 10) / 10;

interface Signal {
  region_slug: string;
  indicator: string;
  nace_code: string;
  period: string;
  direction: "opp" | "ned";
  deviation_pct: number;
  observed_value: number;
  baseline_value: number;
  source_table: string;
  source_payload: Record<string, unknown>;
  status: "pending";
}

interface IndicatorResult {
  signals: Signal[];
  backtest: Record<string, number>;
  now: Record<string, unknown>;
}

const mkSignal = (
  indicator: string, nace: string, period: string, dev: number,
  observed: number, baseline: number, table: string,
  payload: Record<string, unknown>,
): Signal => ({
  region_slug: REGION_SLUG, indicator, nace_code: nace, period,
  direction: dev >= 0 ? "opp" : "ned", deviation_pct: round1(dev * 100),
  observed_value: round1(observed), baseline_value: round1(baseline),
  source_table: table, source_payload: payload, status: "pending",
});

// --- Konkurser -------------------------------------------------------------
async function konkurser(thr: number): Promise<IndicatorResult> {
  const { cells } = await ssbFetch("08551", [
    item("Region", [SSB_REGION]), item("NACE2007", ["00-99"]),
    item("ContentsCode", ["Konkurser"]), top("Tid", 132),
  ]);
  const h = cells.filter((c) => c.value != null)
    .map((c) => ({ p: c.dims.Tid, v: c.value as number }))
    .sort((a, b) => byAsc(a.p, b.p));

  const byMonth: Record<string, number[]> = {};
  for (const r of h) {
    if (KONKURS_EXCLUDE_YEARS.has(r.p.slice(0, 4))) continue;
    (byMonth[r.p.slice(5)] ??= []).push(r.v);
  }
  const seasonalAnnual = Object.values(byMonth).reduce((a, arr) => a + median(arr), 0);

  const anchors: { p: string; a12: number; dev: number }[] = [];
  for (let i = 11; i < h.length; i++) {
    const a12 = h.slice(i - 11, i + 1).reduce((x, r) => x + r.v, 0);
    anchors.push({ p: h[i].p, a12, dev: seasonalAnnual ? (a12 - seasonalAnnual) / seasonalAnnual : 0 });
  }
  const backtest: Record<string, number> = {};
  for (const a of anchors.slice(-48)) {
    const y = a.p.slice(0, 4);
    backtest[y] = (backtest[y] || 0) + (Math.abs(a.dev) >= thr ? 1 : 0);
  }
  const cur = anchors.at(-1);
  const signals: Signal[] = [];
  if (cur && Math.abs(cur.dev) >= thr) {
    signals.push(mkSignal("konkurser", "", cur.p, cur.dev, cur.a12, seasonalAnnual, "08551",
      { sesongnormal: seasonalAnnual, sum_12mnd: cur.a12, anker: cur.p }));
  }
  return { signals, backtest, now: { sum_12mnd: cur?.a12, sesongnormal: seasonalAnnual, avvik_pct: cur ? round1(cur.dev * 100) : null } };
}

// --- Etableringer ----------------------------------------------------------
async function etableringer(thr: number): Promise<IndicatorResult> {
  const { cells } = await ssbFetch("14623", [
    item("Region", [SSB_REGION]), item("Kjonn", ["F"]), item("OrgFormer", ["_T"]),
    item("NACE2007", ["00-99"]), item("AntAnsatte", ["99"]), item("AntEtabl", ["00"]),
    item("ContentsCode", ["EtablertForetak"]), top("Tid", 12),
  ]);
  // _rens: drop ikke-publisert siste år (0/null).
  const h = cells.filter((c) => c.value != null && c.value !== 0)
    .map((c) => ({ p: c.dims.Tid, v: c.value as number }))
    .sort((a, b) => byAsc(a.p, b.p));

  const points: { y: string; v: number; avg5: number; dev: number }[] = [];
  for (let i = 5; i < h.length; i++) {
    const avg5 = h.slice(i - 5, i).reduce((x, r) => x + r.v, 0) / 5;
    points.push({ y: h[i].p, v: h[i].v, avg5, dev: avg5 ? (h[i].v - avg5) / avg5 : 0 });
  }
  const backtest: Record<string, number> = {};
  for (const p of points) backtest[p.y] = Math.abs(p.dev) >= thr ? 1 : 0;
  const cur = points.at(-1);
  const signals: Signal[] = [];
  if (cur && Math.abs(cur.dev) >= thr) {
    signals.push(mkSignal("etableringer", "", cur.y, cur.dev, cur.v, cur.avg5, "14623",
      { siste_aar: cur.y, antall: cur.v, snitt_5aar: round1(cur.avg5) }));
  }
  return { signals, backtest, now: { aar: cur?.y, antall: cur?.v, snitt_5aar: cur ? round1(cur.avg5) : null, avvik_pct: cur ? round1(cur.dev * 100) : null } };
}

// --- Omsetning (per bransje) -----------------------------------------------
async function omsetning(thr: number): Promise<IndicatorResult> {
  const { cells, labels } = await ssbFetch("12937", [
    item("Region", [SSB_REGION]),
    valueset("NACE2007", "NACE2007StrHoved", NACE_HOVEDOMRADE),
    item("ContentsCode", ["Oms"]), top("Tid", 8),
  ]);
  const byN: Record<string, { y: string; v: number }[]> = {};
  for (const c of cells) {
    if (c.value == null) continue;
    (byN[c.dims.NACE2007] ??= []).push({ y: c.dims.Tid, v: c.value as number });
  }
  const backtest: Record<string, number> = {};
  const signals: Signal[] = [];
  const nowFlagged: string[] = [];
  for (const [nace, arr] of Object.entries(byN)) {
    arr.sort((a, b) => byAsc(a.y, b.y));
    for (let i = 1; i < arr.length; i++) {
      const dev = arr[i - 1].v ? (arr[i].v - arr[i - 1].v) / arr[i - 1].v : 0;
      if (Math.abs(dev) >= thr) backtest[arr[i].y] = (backtest[arr[i].y] || 0) + 1;
    }
    const cur = arr.at(-1), prev = arr.at(-2);
    if (cur && prev && prev.v) {
      const dev = (cur.v - prev.v) / prev.v;
      if (Math.abs(dev) >= thr) {
        signals.push(mkSignal("omsetning", nace, cur.y, dev, cur.v, prev.v, "12937",
          { bransje: labels.NACE2007?.[nace] ?? nace, aar: cur.y, omsetning: cur.v, forrige: prev.v }));
        nowFlagged.push(`${labels.NACE2007?.[nace] ?? nace}: ${round1(dev * 100)}%`);
      }
    }
  }
  return { signals, backtest, now: { flagged: nowFlagged } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const url = new URL(req.url);
  const mode = (body.mode ?? url.searchParams.get("mode") ?? "backtest") as string;
  const thr = { ...DEFAULT_THRESHOLDS, ...(body.thresholds ?? {}) };

  const results = await Promise.allSettled([
    konkurser(thr.konkurser),
    etableringer(thr.etableringer),
    omsetning(thr.omsetning),
  ]);
  const names = ["konkurser", "etableringer", "omsetning"];
  const report: Record<string, unknown> = {};
  const signals: Signal[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      report[names[i]] = { now: r.value.now, backtest: r.value.backtest, would_flag: r.value.signals.length };
      signals.push(...r.value.signals);
    } else errors.push(`${names[i]}: ${r.reason?.message ?? r.reason}`);
  });

  let inserted = 0;
  if (mode === "run" && signals.length > 0) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // ignoreDuplicates: behold redaktørens status på allerede-kjente signaler.
    const { error, count } = await supabase
      .from("barometer_signals")
      .upsert(signals, { onConflict: "region_slug,indicator,nace_code,period", ignoreDuplicates: true, count: "exact" });
    if (error) return json({ ok: false, mode, error: error.message, errors }, 500, req);
    inserted = count ?? 0;
  }

  return json({
    ok: errors.length === 0, mode, thresholds: thr,
    would_flag: signals.length, inserted, report, errors,
  }, 200, req);
});
