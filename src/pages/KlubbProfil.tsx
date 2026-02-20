import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { getClubById, formatMNOK } from "@/data/clubs";
import { IdrettAIChat } from "@/components/IdrettAIChat";
import { ArrowLeft, Trophy, MapPin, Calendar, Users, TrendingUp, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-elevated">
        <p className="font-subhead text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="font-subhead text-sm font-medium" style={{ color: p.color }}>
            {p.name}: {formatMNOK(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function KlubbProfil() {
  const { id } = useParams<{ id: string }>();
  const club = getClubById(id!);

  if (!club) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="font-headline text-3xl text-headline mb-4">Klubb ikke funnet</h1>
          <Link to="/idrett" className="text-accent hover:underline font-subhead">← Tilbake til oversikten</Link>
        </div>
      </div>
    );
  }

  const latest = club.finansdata[club.finansdata.length - 1];
  const prev = club.finansdata[club.finansdata.length - 2];
  const omsetningVekst = ((latest.omsetning - prev.omsetning) / Math.abs(prev.omsetning)) * 100;
  const egenkapitalVekst = ((latest.egenkapital - prev.egenkapital) / Math.abs(prev.egenkapital)) * 100;

  const chartData = club.finansdata.map((f) => ({
    year: String(f.year),
    Omsetning: f.omsetning,
    Driftsresultat: f.driftsresultat,
    Årsresultat: f.aarsresultat,
    Egenkapital: f.egenkapital,
    Totalkapital: f.totalkapital,
  }));

  const inntektData = club.finansdata.map((f) => ({
    year: String(f.year),
    Spillerinntekter: f.inntektskilder.spillerinntekter,
    Billetter: f.inntektskilder.billettinntekter,
    Sponsor: f.inntektskilder.sponsorinntekter,
    "TV-penger": f.inntektskilder.tvPenger,
    Andre: f.inntektskilder.andreInntekter,
  }));

  const COLORS = {
    positive: "hsl(142 72% 40%)",
    negative: "hsl(0 75% 55%)",
    accent: "hsl(25 85% 55%)",
    primary: "hsl(35 90% 50%)",
    muted: "hsl(30 10% 45%)",
    blue: "hsl(210 80% 55%)",
    purple: "hsl(270 60% 55%)",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-warm py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <Link to="/idrett" className="inline-flex items-center gap-2 text-accent-foreground/70 hover:text-accent-foreground transition-colors font-subhead text-sm mb-6">
            <ArrowLeft className="w-4 h-4" />
            Alle klubber
          </Link>
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-accent-foreground/20 flex items-center justify-center flex-shrink-0">
              <span className="font-headline text-3xl font-bold text-accent-foreground">{club.navn.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <h1 className="font-headline text-3xl md:text-4xl font-bold text-accent-foreground mb-1">{club.navn}</h1>
              <p className="font-body text-accent-foreground/70 text-base mb-4">{club.beskrivelse}</p>
              <div className="flex flex-wrap gap-4 text-accent-foreground/70 font-subhead text-sm">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{club.by}</span>
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Grunnlagt {club.grunnlagt}</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" />{club.stadion} ({club.stadionKapasitet.toLocaleString("no")})</span>
                {club.titler > 0 && (
                  <span className="flex items-center gap-1"><Trophy className="w-4 h-4" />{club.titler} seriemesterskap</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* KPI-kort */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Omsetning 2023", value: formatMNOK(latest.omsetning), change: omsetningVekst },
            {
              label: "Driftsresultat 2023",
              value: formatMNOK(latest.driftsresultat),
              positive: latest.driftsresultat >= 0,
            },
            { label: "Egenkapital 2023", value: formatMNOK(latest.egenkapital), change: egenkapitalVekst },
            { label: "Totalkapital 2023", value: formatMNOK(latest.totalkapital) },
          ].map((kpi, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
              <p className="font-subhead text-xs text-muted-foreground mb-1">{kpi.label}</p>
              <p className={`font-headline text-xl font-bold ${
                "positive" in kpi
                  ? kpi.positive
                    ? "text-green-600 dark:text-green-400"
                    : "text-destructive"
                  : "text-headline"
              }`}>
                {kpi.value}
              </p>
              {"change" in kpi && kpi.change !== undefined && (
                <p className={`font-subhead text-xs mt-1 flex items-center gap-0.5 ${kpi.change >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                  {kpi.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.change >= 0 ? "+" : ""}{kpi.change.toFixed(1)}% vs 2022
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Omsetning + resultat */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
          <h2 className="font-headline text-xl font-semibold text-headline mb-6">Omsetning og resultater</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="omsetningGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 20% 88% / 0.5)" />
              <XAxis dataKey="year" tick={{ fontFamily: "DM Sans", fontSize: 12 }} />
              <YAxis tick={{ fontFamily: "DM Sans", fontSize: 12 }} tickFormatter={(v) => `${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: "DM Sans", fontSize: 12 }} />
              <Area type="monotone" dataKey="Omsetning" stroke={COLORS.primary} fill="url(#omsetningGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="Driftsresultat" stroke={COLORS.accent} fill="transparent" strokeWidth={2} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="Årsresultat" stroke={COLORS.muted} fill="transparent" strokeWidth={2} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Egenkapital / Totalkapital */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
          <h2 className="font-headline text-xl font-semibold text-headline mb-6">Balanse — kapital</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 20% 88% / 0.5)" />
              <XAxis dataKey="year" tick={{ fontFamily: "DM Sans", fontSize: 12 }} />
              <YAxis tick={{ fontFamily: "DM Sans", fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: "DM Sans", fontSize: 12 }} />
              <Bar dataKey="Totalkapital" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Egenkapital" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Inntektskilder */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
          <h2 className="font-headline text-xl font-semibold text-headline mb-6">Inntektskilder per år</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={inntektData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 20% 88% / 0.5)" />
              <XAxis dataKey="year" tick={{ fontFamily: "DM Sans", fontSize: 12 }} />
              <YAxis tick={{ fontFamily: "DM Sans", fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: "DM Sans", fontSize: 12 }} />
              <Bar dataKey="Spillerinntekter" stackId="a" fill={COLORS.primary} />
              <Bar dataKey="Billetter" stackId="a" fill={COLORS.accent} />
              <Bar dataKey="Sponsor" stackId="a" fill={COLORS.blue} />
              <Bar dataKey="TV-penger" stackId="a" fill={COLORS.purple} />
              <Bar dataKey="Andre" stackId="a" fill={COLORS.muted} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Historisk tabell */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft overflow-x-auto">
          <h2 className="font-headline text-xl font-semibold text-headline mb-4">Historisk finansdata</h2>
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border">
                {["År", "Omsetning", "Driftsresultat", "Årsresultat", "Totalkapital", "Egenkapital"].map((h) => (
                  <th key={h} className="pb-3 text-right first:text-left font-subhead font-medium text-muted-foreground text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {club.finansdata.map((f) => (
                <tr key={f.year} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 font-subhead font-semibold text-headline">{f.year}</td>
                  <td className="py-3 text-right">{formatMNOK(f.omsetning)}</td>
                  <td className={`py-3 text-right font-medium ${f.driftsresultat >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    {f.driftsresultat >= 0 ? "+" : ""}{formatMNOK(f.driftsresultat)}
                  </td>
                  <td className={`py-3 text-right font-medium ${f.aarsresultat >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    {f.aarsresultat >= 0 ? "+" : ""}{formatMNOK(f.aarsresultat)}
                  </td>
                  <td className="py-3 text-right">{formatMNOK(f.totalkapital)}</td>
                  <td className="py-3 text-right">{formatMNOK(f.egenkapital)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lenker */}
        <div className="flex gap-3">
          <Link to="/idrett" className="px-5 py-2.5 border border-border rounded-xl font-subhead text-sm hover:bg-secondary transition-colors text-foreground">
            ← Alle klubber
          </Link>
          <Link to="/idrett/sammenlign" className="px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors">
            Sammenlign med andre →
          </Link>
        </div>
      </main>
      <IdrettAIChat />
    </div>
  );
}
