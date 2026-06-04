import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useTheme } from "@/hooks/useTheme";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Building2, Sprout, Banknote, Lock } from "lucide-react";

const REGION = "nordvestlandet";
const OPEN_MODULES = ["naeringspuls_kpi", "konkursgraf_12mnd", "bransje_snapshot"];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("barometer_datapoints")
        .select("module_key, indicator, nace_code, period, value, unit, label, meta")
        .eq("region_slug", REGION)
        .in("module_key", OPEN_MODULES);
      if (error) { setError(true); setLoading(false); return; }
      setRows((data as Row[]) ?? []);
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

            {/* Teaser for låste moduler (mur kommer i PR 4) */}
            <section className="border border-dashed border-border rounded-xl p-5 flex items-start gap-3 bg-secondary/30">
              <Lock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <h3 className="font-headline text-base font-semibold text-headline">
                  {isNo ? "Mer kommer for abonnenter" : "More coming for subscribers"}
                </h3>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  {isNo
                    ? "Avvikstolkning, konkurser mot historisk normal, kommune-mot-kommune og bransje-historikk åpnes for abonnenter."
                    : "Deviation analysis, bankruptcies vs historical norm, municipality benchmarking and industry history will open for subscribers."}
                </p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
