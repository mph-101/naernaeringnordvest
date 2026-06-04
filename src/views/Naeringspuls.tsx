import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useTheme } from "@/hooks/useTheme";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Building2, Sprout, Banknote, Lock } from "lucide-react";

const REGION = "nordvestlandet";
// Datapunkter hentes for ALLE moduler; RLS filtrerer lukkede for ikke-abonnenter.
// At en lukket modul gir datapunkter = brukeren har tilgang.

interface Row {
  module_key: string;
  indicator: string;
  nace_code: string;
  period: string;
  value: number | null;
  unit: string | null;
  label: string | null;
  meta: Record<string, unknown> | null;
}

// --- formatting (nb-NO) -----------------------------------------------------
const nf = (n: number, d = 0) =>
  n.toLocaleString("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtOms = (millNok: number) =>
  millNok >= 1000 ? `${nf(millNok / 1000, 1)} mrd kr` : `${nf(millNok)} mill kr`;
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${nf(n, 1)} %`;
const MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
const fmtMonth = (period: string) => {
  const m = /^(\d{4})M(\d{2})$/.exec(period);
  if (!m) return period;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1].slice(2)}`;
};

export default function Naeringspuls() {
  const { language } = useTheme();
  const isNo = language === "no";
  const [rows, setRows] = useState<Row[]>([]);
  const [modules, setModules] = useState<{ module_key: string; title: string; tilgangsniva: string; sort_order: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const [dp, mod] = await Promise.all([
        supabase.from("barometer_datapoints")
          .select("module_key, indicator, nace_code, period, value, unit, label, meta")
          .eq("region_slug", REGION),
        supabase.from("barometer_modules")
          .select("module_key, title, tilgangsniva, sort_order")
          .eq("region_slug", REGION).eq("is_active", true).order("sort_order"),
      ]);
      if (dp.error) { setError(true); setLoading(false); return; }
      setRows((dp.data as Row[]) ?? []);
      setModules((mod.data as typeof modules) ?? []);
      setLoading(false);
    })();
  }, []);

  // Latest value per KPI indicator (datapoints accumulate over time).
  const kpis = useMemo(() => {
    const latest = new Map<string, Row>();
    for (const r of rows.filter((r) => r.module_key === "naeringspuls_kpi")) {
      const cur = latest.get(r.indicator);
      if (!cur || r.period > cur.period) latest.set(r.indicator, r);
    }
    return latest;
  }, [rows]);

  const konkursSeries = useMemo(() =>
    rows
      .filter((r) => r.module_key === "konkursgraf_12mnd")
      .map((r) => ({ period: r.period, value: Number(r.value ?? 0), label: fmtMonth(r.period) }))
      .sort((a, b) => (a.period < b.period ? -1 : 1)),
  [rows]);

  const bransjer = useMemo(() =>
    rows
      .filter((r) => r.module_key === "bransje_snapshot" && r.value != null)
      .map((r) => ({
        label: r.label ?? r.nace_code,
        value: Number(r.value),
        yoy: r.meta?.yoy_pct != null ? Number(r.meta.yoy_pct) : null,
      }))
      .sort((a, b) => b.value - a.value),
  [rows]);

  // Kommuneprofil: gruppér kommune_grunntall-datapunkter på kommune (nace_code).
  const kommuner = useMemo(() => {
    const byKom = new Map<string, { navn: string; vals: Record<string, { value: number; period: string }> }>();
    for (const r of rows.filter((r) => r.module_key === "kommune_grunntall" && r.value != null)) {
      const code = r.nace_code;
      if (!byKom.has(code)) byKom.set(code, { navn: (r.meta?.kommune as string) ?? r.label ?? code, vals: {} });
      byKom.get(code)!.vals[r.indicator] = { value: Number(r.value), period: r.period };
    }
    return [...byKom.values()].sort((a, b) => (b.vals.befolkning?.value ?? 0) - (a.vals.befolkning?.value ?? 0));
  }, [rows]);

  // Lukket: avvikstolkning + kommune-benchmark (kommer kun tilbake for abonnenter via RLS).
  const avvik = useMemo(() =>
    rows.filter((r) => r.module_key === "naeringspuls_avvik" && r.value != null)
      .map((r) => ({ label: r.label, value: Number(r.value), meta: r.meta })),
  [rows]);
  const benchmark = useMemo(() =>
    rows.filter((r) => r.module_key === "kommune_benchmark" && r.value != null)
      .map((r) => ({ navn: (r.meta?.kommune as string) ?? r.label ?? r.nace_code, value: Number(r.value) }))
      .sort((a, b) => b.value - a.value),
  [rows]);
  // Alle lukkede moduler fra konfig; unlocked = vi fikk datapunkter for den.
  const lockedModules = useMemo(() => {
    const haveData = new Set(rows.map((r) => r.module_key));
    return modules
      .filter((m) => m.tilgangsniva !== "åpen")
      .map((m) => ({ ...m, unlocked: haveData.has(m.module_key) }));
  }, [modules, rows]);

  const maxBransje = bransjer.length ? bransjer[0].value : 1;
  const latestKonkursPeriod = konkursSeries.at(-1)?.period;

  const kpiCards = [
    { key: "konkurser_12mnd", icon: Building2,
      fmt: (v: number) => nf(v),
      title: isNo ? "Konkurser siste 12 md" : "Bankruptcies last 12 mo" },
    { key: "etableringer", icon: Sprout,
      fmt: (v: number) => nf(v),
      title: isNo ? "Nye foretak (siste år)" : "New enterprises (latest year)" },
    { key: "omsetning_total", icon: Banknote,
      fmt: (v: number) => fmtOms(v),
      title: isNo ? "Omsetning, alle næringer" : "Turnover, all industries" },
    { key: "omsetning_vekst", icon: TrendingUp,
      fmt: (v: number) => fmtPct(v),
      title: isNo ? "Omsetningsvekst å/å" : "Turnover growth YoY" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />

      <div className="bg-gradient-warm py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-headline text-3xl md:text-4xl font-bold text-accent-foreground mb-3">
            {isNo ? "Næringspulsen" : "The Business Pulse"}
          </h1>
          <p className="font-body text-accent-foreground/80 text-lg max-w-2xl">
            {isNo
              ? "Det datadrevne barometeret for næringslivet på Nordvestlandet. Åpne nøkkeltall fra Statistisk sentralbyrå, oppdatert løpende."
              : "The data-driven barometer for business in Northwestern Norway. Open key figures from Statistics Norway, updated continuously."}
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="font-body text-muted-foreground text-center py-20">
            {isNo ? "Kunne ikke laste tall akkurat nå." : "Could not load figures right now."}
          </p>
        ) : (
          <>
            {/* KPI-råtall */}
            <section>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map(({ key, icon: Icon, fmt, title }) => {
                  const row = kpis.get(key);
                  const v = row?.value != null ? Number(row.value) : null;
                  const down = key === "omsetning_vekst" && v != null && v < 0;
                  return (
                    <div key={key} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                        <Icon className="w-4 h-4" />
                        <span className="font-subhead text-xs uppercase tracking-wide">{title}</span>
                      </div>
                      <div className={`font-headline text-3xl font-bold ${down ? "text-destructive" : "text-headline"}`}>
                        {v != null ? fmt(v) : "—"}
                      </div>
                      {row?.period && (
                        <div className="font-body text-xs text-muted-foreground mt-1">
                          {key === "konkurser_12mnd" ? fmtMonth(row.period) : row.period}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Kommuneprofil — grunntall per kommune */}
            {kommuner.length > 0 && (
              <section>
                <h2 className="font-headline text-xl font-semibold text-headline mb-1">
                  {isNo ? "Kommuneprofil" : "Municipality profile"}
                </h2>
                <p className="font-body text-sm text-muted-foreground mb-4">
                  {isNo ? "Grunntall for de største kommunene. Kilde: SSB (07459, 10309, 06944)." : "Key figures for the largest municipalities. Source: SSB."}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {kommuner.map((k) => (
                    <div key={k.navn} className="bg-card border border-border rounded-xl p-5">
                      <h3 className="font-headline text-lg font-semibold text-headline mb-3">{k.navn}</h3>
                      <dl className="space-y-2 font-body text-sm">
                        {[
                          { label: isNo ? "Innbyggere" : "Population", v: k.vals.befolkning?.value, fmt: nf },
                          { label: isNo ? "Bedrifter" : "Businesses", v: k.vals.bedrifter?.value, fmt: nf },
                          { label: isNo ? "Varehandel-bedrifter" : "Retail businesses", v: k.vals.bedrifter_varehandel?.value, fmt: nf },
                          { label: isNo ? "Median inntekt e. skatt" : "Median income", v: k.vals.inntekt_median?.value, fmt: (n: number) => `${nf(n)} kr` },
                        ].map((row) => (
                          <div key={row.label} className="flex items-baseline justify-between gap-2">
                            <dt className="text-muted-foreground">{row.label}</dt>
                            <dd className="font-semibold text-headline tabular-nums">{row.v != null ? row.fmt(row.v) : "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Konkursgraf — inneværende 12 mnd */}
            <section className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-headline text-xl font-semibold text-headline mb-1">
                {isNo ? "Opna konkursar per måned" : "Bankruptcies per month"}
              </h2>
              <p className="font-body text-sm text-muted-foreground mb-4">
                {isNo ? "Møre og Romsdal, siste 24 måneder. Kilde: SSB (08551)." : "Møre og Romsdal, last 24 months. Source: SSB (08551)."}
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={konkursSeries} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} stroke="currentColor" className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--secondary))" }}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number) => [`${v}`, isNo ? "Konkurser" : "Bankruptcies"]}
                    />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {konkursSeries.map((d) => (
                        <Cell key={d.period}
                          fill={d.period === latestKonkursPeriod ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.45)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Bransjebarometer — øyeblikksbilde */}
            <section className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-headline text-xl font-semibold text-headline mb-1">
                {isNo ? "Omsetning per næring" : "Turnover by industry"}
              </h2>
              <p className="font-body text-sm text-muted-foreground mb-4">
                {isNo ? "Siste år, med endring fra året før. Kilde: SSB (12937)." : "Latest year, with change from prior year. Source: SSB (12937)."}
              </p>
              <div className="space-y-2">
                {bransjer.map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <div className="w-44 shrink-0 font-body text-sm text-foreground truncate" title={b.label}>{b.label}</div>
                    <div className="flex-1 bg-secondary rounded-full h-6 overflow-hidden">
                      <div className="h-full bg-primary/70 rounded-full"
                        style={{ width: `${Math.max(2, (b.value / maxBransje) * 100)}%` }} />
                    </div>
                    <div className="w-24 shrink-0 text-right font-body text-sm text-foreground tabular-nums">{fmtOms(b.value)}</div>
                    <div className={`w-16 shrink-0 text-right font-body text-xs tabular-nums flex items-center justify-end gap-0.5 ${
                      b.yoy == null ? "text-muted-foreground" : b.yoy >= 0 ? "text-accent" : "text-destructive"}`}>
                      {b.yoy != null && (b.yoy >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                      {b.yoy != null ? fmtPct(b.yoy) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Muren: lukkede moduler — full for abonnenter (RLS), teaser ellers */}
            {lockedModules.length > 0 && (
              <section>
                <h2 className="font-headline text-xl font-semibold text-headline mb-1">
                  {isNo ? "For abonnenter" : "For subscribers"}
                </h2>
                <p className="font-body text-sm text-muted-foreground mb-4">
                  {isNo ? "Avvikstolkning og dypere analyser." : "Deviation analysis and deeper insights."}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lockedModules.map((m) => {
                    if (m.unlocked && m.module_key === "naeringspuls_avvik" && avvik.length > 0) {
                      return (
                        <div key={m.module_key} className="bg-card border border-border rounded-xl p-5">
                          <h3 className="font-headline text-base font-semibold text-headline mb-3">{m.title}</h3>
                          <dl className="space-y-2 font-body text-sm">
                            {avvik.map((a) => (
                              <div key={a.label} className="flex items-baseline justify-between gap-2">
                                <dt className="text-muted-foreground">{a.label}</dt>
                                <dd className={`font-semibold tabular-nums ${a.value >= 0 ? "text-accent" : "text-destructive"}`}>{fmtPct(a.value)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      );
                    }
                    if (m.unlocked && m.module_key === "kommune_benchmark" && benchmark.length > 0) {
                      return (
                        <div key={m.module_key} className="bg-card border border-border rounded-xl p-5">
                          <h3 className="font-headline text-base font-semibold text-headline mb-1">{m.title}</h3>
                          <p className="font-body text-xs text-muted-foreground mb-3">{isNo ? "Bedrifter per 1000 innbyggere" : "Businesses per 1000 residents"}</p>
                          <dl className="space-y-2 font-body text-sm">
                            {benchmark.map((b) => (
                              <div key={b.navn} className="flex items-baseline justify-between gap-2">
                                <dt className="text-muted-foreground">{b.navn}</dt>
                                <dd className="font-semibold text-headline tabular-nums">{nf(b.value, 1)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      );
                    }
                    return (
                      <div key={m.module_key} className="bg-card border border-dashed border-border rounded-xl p-5">
                        <div className="flex items-start gap-3">
                          <Lock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-headline text-base font-semibold text-headline">{m.title}</h3>
                            <p className="font-body text-sm text-muted-foreground mt-1">
                              {isNo ? "Lås opp med abonnement." : "Unlock with a subscription."}
                            </p>
                            <Link to="/abonnement" className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-subhead hover:opacity-90 transition-opacity">
                              {isNo ? "Bli abonnent" : "Subscribe"}
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
