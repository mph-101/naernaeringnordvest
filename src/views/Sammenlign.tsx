import { useState } from "react";
import { IdrettAIChat } from "@/components/IdrettAIChat";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { clubs, getLatestFinancials, formatMNOK } from "@/data/clubs";
import { ArrowLeft, X, TrendingUp, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";

const PALETTE = [
  "hsl(35 90% 50%)",
  "hsl(25 85% 55%)",
  "hsl(210 80% 55%)",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-elevated">
        <p className="font-subhead text-xs text-muted-foreground mb-2">{label}</p>
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

export default function Sammenlign() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    }
  };

  const selectedClubs = clubs.filter((c) => selected.includes(c.id));

  // Build year-by-year comparison data
  const years = [2020, 2021, 2022, 2023];

  const omsetningData = years.map((year) => {
    const row: any = { year: String(year) };
    selectedClubs.forEach((c) => {
      const f = c.finansdata.find((fd) => fd.year === year);
      if (f) row[c.navn] = f.omsetning;
    });
    return row;
  });

  const egenkapitalData = years.map((year) => {
    const row: any = { year: String(year) };
    selectedClubs.forEach((c) => {
      const f = c.finansdata.find((fd) => fd.year === year);
      if (f) row[c.navn] = f.egenkapital;
    });
    return row;
  });

  const driftsresultatData = years.map((year) => {
    const row: any = { year: String(year) };
    selectedClubs.forEach((c) => {
      const f = c.finansdata.find((fd) => fd.year === year);
      if (f) row[c.navn] = f.driftsresultat;
    });
    return row;
  });

  const metrics = [
    { key: "omsetning", label: "Omsetning 2023" },
    { key: "driftsresultat", label: "Driftsresultat 2023" },
    { key: "egenkapital", label: "Egenkapital 2023" },
    { key: "totalkapital", label: "Totalkapital 2023" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="bg-gradient-warm py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <Link to="/tall" className="inline-flex items-center gap-2 text-accent-foreground/70 hover:text-accent-foreground transition-colors font-subhead text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            Alle klubber
          </Link>
          <h1 className="font-headline text-4xl font-bold text-accent-foreground mb-2">Sammenlign klubber</h1>
          <p className="font-body text-accent-foreground/70">Velg 2–3 klubber for å sammenligne finansielle nøkkeltall side om side.</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Valgte klubber */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedClubs.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-subhead font-medium"
                style={{ borderColor: PALETTE[i], color: PALETTE[i], background: `${PALETTE[i]}15` }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: PALETTE[i] }}
                />
                {c.navn}
                <button onClick={() => toggle(c.id)} className="ml-1 hover:opacity-70 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {selected.length < 3 && (
              <div className="flex items-center px-4 py-2 rounded-full border border-dashed border-border text-muted-foreground text-sm font-subhead">
                + Velg {3 - selected.length} til
              </div>
            )}
          </div>
        )}

        {/* Klubb-velger */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
          {clubs.map((club) => {
            const idx = selected.indexOf(club.id);
            const isSelected = idx !== -1;
            const fin = getLatestFinancials(club);
            return (
              <button
                key={club.id}
                onClick={() => toggle(club.id)}
                disabled={!isSelected && selected.length >= 3}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "shadow-elevated"
                    : "border-border bg-card hover:border-accent/40 hover:shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
                style={
                  isSelected
                    ? { borderColor: PALETTE[idx], background: `${PALETTE[idx]}10` }
                    : {}
                }
              >
                <div
                  className="w-8 h-8 rounded-full bg-gradient-warm flex items-center justify-center mb-2"
                  style={isSelected ? { background: PALETTE[idx] } : {}}
                >
                  <span className="font-headline font-bold text-accent-foreground text-sm">
                    {club.navn.charAt(0)}
                  </span>
                </div>
                <p className="font-subhead text-sm font-semibold text-headline leading-tight">{club.navn}</p>
                <p className="font-subhead text-xs text-muted-foreground mt-0.5">{formatMNOK(fin.omsetning)}</p>
              </button>
            );
          })}
        </div>

        {/* Sammenligning */}
        {selectedClubs.length >= 2 && (
          <div className="space-y-8 animate-fade-in">
            {/* Side-om-side KPI */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <h2 className="font-headline text-xl font-semibold text-headline mb-5">Nøkkeltall 2023</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 text-left font-subhead font-medium text-muted-foreground text-xs">Nøkkeltall</th>
                      {selectedClubs.map((c, i) => (
                        <th key={c.id} className="pb-3 text-right font-subhead font-semibold text-xs" style={{ color: PALETTE[i] }}>
                          {c.navn}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map(({ key, label }) => (
                      <tr key={key} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 font-subhead text-muted-foreground text-xs">{label}</td>
                        {selectedClubs.map((c) => {
                          const fin = getLatestFinancials(c);
                          const val = fin[key as keyof typeof fin] as number;
                          const isResult = key === "driftsresultat";
                          return (
                            <td key={c.id} className={`py-3 text-right font-subhead font-semibold ${isResult ? (val >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive") : "text-foreground"}`}>
                              {isResult && val >= 0 ? "+" : ""}{formatMNOK(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 font-subhead text-muted-foreground text-xs">Seriemesterskap</td>
                      {selectedClubs.map((c) => (
                        <td key={c.id} className="py-3 text-right font-subhead font-semibold text-foreground">{c.titler}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 font-subhead text-muted-foreground text-xs">Stadionkapasitet</td>
                      {selectedClubs.map((c) => (
                        <td key={c.id} className="py-3 text-right font-subhead font-semibold text-foreground">{c.stadionKapasitet.toLocaleString("no")}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Omsetning trend */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <h2 className="font-headline text-xl font-semibold text-headline mb-5">Omsetningsutvikling 2020–2023</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={omsetningData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 20% 88% / 0.5)" />
                  <XAxis dataKey="year" tick={{ fontFamily: "DM Sans", fontSize: 12 }} />
                  <YAxis tick={{ fontFamily: "DM Sans", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: "DM Sans", fontSize: 12 }} />
                  {selectedClubs.map((c, i) => (
                    <Line key={c.id} type="monotone" dataKey={c.navn} stroke={PALETTE[i]} strokeWidth={2.5} dot={{ r: 4, fill: PALETTE[i] }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Driftsresultat */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <h2 className="font-headline text-xl font-semibold text-headline mb-5">Driftsresultat 2020–2023</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={driftsresultatData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 20% 88% / 0.5)" />
                  <XAxis dataKey="year" tick={{ fontFamily: "DM Sans", fontSize: 12 }} />
                  <YAxis tick={{ fontFamily: "DM Sans", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: "DM Sans", fontSize: 12 }} />
                  {selectedClubs.map((c, i) => (
                    <Bar key={c.id} dataKey={c.navn} fill={PALETTE[i]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Egenkapital */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <h2 className="font-headline text-xl font-semibold text-headline mb-5">Egenkapitalutvikling 2020–2023</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={egenkapitalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 20% 88% / 0.5)" />
                  <XAxis dataKey="year" tick={{ fontFamily: "DM Sans", fontSize: 12 }} />
                  <YAxis tick={{ fontFamily: "DM Sans", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: "DM Sans", fontSize: 12 }} />
                  {selectedClubs.map((c, i) => (
                    <Line key={c.id} type="monotone" dataKey={c.navn} stroke={PALETTE[i]} strokeWidth={2.5} dot={{ r: 4, fill: PALETTE[i] }} strokeDasharray="5 3" />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {selectedClubs.length < 2 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gradient-warm mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-accent-foreground" />
            </div>
            <p className="font-headline text-xl text-headline mb-2">Velg {2 - selectedClubs.length} klubb{selectedClubs.length === 0 ? "er" : ""} til</p>
            <p className="font-body text-muted-foreground">Velg minst 2 klubber ovenfor for å se sammenligningen</p>
          </div>
        )}
      </main>
      <IdrettAIChat />
    </div>
  );
}
