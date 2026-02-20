import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { clubs, getLatestFinancials, formatMNOK } from "@/data/clubs";
import { IdrettAIChat } from "@/components/IdrettAIChat";
import { Search, TrendingUp, TrendingDown, ArrowUpDown, Trophy, Building2 } from "lucide-react";

type SortKey = "navn" | "omsetning" | "driftsresultat" | "egenkapital" | "titler";

export default function Idrett() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("omsetning");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return clubs
      .filter((c) => c.navn.toLowerCase().includes(q) || c.by.toLowerCase().includes(q))
      .sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;
        if (sortKey === "navn") {
          aVal = a.navn;
          bVal = b.navn;
        } else if (sortKey === "titler") {
          aVal = a.titler;
          bVal = b.titler;
        } else {
          aVal = getLatestFinancials(a)[sortKey];
          bVal = getLatestFinancials(b)[sortKey];
        }
        if (typeof aVal === "string") {
          return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
        }
        return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      });
  }, [query, sortKey, sortDir]);

  const totalOmsetning = clubs.reduce((s, c) => s + getLatestFinancials(c).omsetning, 0);
  const profittable = clubs.filter((c) => getLatestFinancials(c).driftsresultat > 0).length;
  const topClub = [...clubs].sort((a, b) => getLatestFinancials(b).omsetning - getLatestFinancials(a).omsetning)[0];

  const SortButton = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(k)}
      className={`flex items-center gap-1 text-xs font-subhead font-medium transition-colors ${
        sortKey === k ? "text-accent" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-warm py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="font-subhead text-sm text-accent-foreground/70 mb-2 uppercase tracking-wider">Eliteserien</p>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-accent-foreground mb-4">
            Klubbdatabasen
          </h1>
          <p className="font-body text-accent-foreground/80 text-lg max-w-2xl">
            Finansielle nøkkeltall for alle 16 Eliteserien-klubber. Data for 2020–2023.
          </p>

          {/* KPI-kort */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-accent-foreground/10 backdrop-blur-sm rounded-2xl p-4 border border-accent-foreground/20">
              <p className="font-subhead text-xs text-accent-foreground/60 mb-1">Samlet omsetning 2023</p>
              <p className="font-headline text-2xl font-bold text-accent-foreground">{formatMNOK(totalOmsetning)}</p>
            </div>
            <div className="bg-accent-foreground/10 backdrop-blur-sm rounded-2xl p-4 border border-accent-foreground/20">
              <p className="font-subhead text-xs text-accent-foreground/60 mb-1">Lønnsomme klubber</p>
              <p className="font-headline text-2xl font-bold text-accent-foreground">{profittable} / 16</p>
            </div>
            <div className="bg-accent-foreground/10 backdrop-blur-sm rounded-2xl p-4 border border-accent-foreground/20">
              <p className="font-subhead text-xs text-accent-foreground/60 mb-1">Høyest omsetning</p>
              <p className="font-headline text-xl font-bold text-accent-foreground">{topClub.navn}</p>
            </div>
            <div className="bg-accent-foreground/10 backdrop-blur-sm rounded-2xl p-4 border border-accent-foreground/20">
              <p className="font-subhead text-xs text-accent-foreground/60 mb-1">Klubber</p>
              <p className="font-headline text-2xl font-bold text-accent-foreground">16</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Søk + sammenlign */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søk etter klubb eller by..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-card font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <Link
            to="/idrett/sammenlign"
            className="px-5 py-3 bg-accent text-accent-foreground rounded-xl font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft text-center whitespace-nowrap"
          >
            Sammenlign klubber →
          </Link>
        </div>

        {/* Sortering-header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 mb-2">
          <div className="col-span-4"><SortButton k="navn" label="Klubb" /></div>
          <div className="col-span-2 text-right"><SortButton k="omsetning" label="Omsetning" /></div>
          <div className="col-span-2 text-right"><SortButton k="driftsresultat" label="Driftsres." /></div>
          <div className="col-span-2 text-right"><SortButton k="egenkapital" label="Egenkapital" /></div>
          <div className="col-span-2 text-right"><SortButton k="titler" label="Titler" /></div>
        </div>

        {/* Klubbliste */}
        <div className="space-y-2">
          {filtered.map((club, i) => {
            const fin = getLatestFinancials(club);
            const positive = fin.driftsresultat >= 0;
            return (
              <Link
                key={club.id}
                to={`/idrett/klubb/${club.id}`}
                className="block bg-card border border-border rounded-2xl p-4 hover:border-accent/40 hover:shadow-elevated transition-all animate-fade-up group"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Klubb-info */}
                  <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-warm flex items-center justify-center flex-shrink-0">
                      <span className="font-headline font-bold text-accent-foreground text-sm">
                        {club.navn.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-headline font-semibold text-headline group-hover:text-accent transition-colors">
                        {club.navn}
                      </p>
                      <p className="font-subhead text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {club.by} · {club.stadion}
                      </p>
                    </div>
                  </div>

                  {/* Omsetning */}
                  <div className="col-span-4 md:col-span-2 text-right">
                    <p className="font-subhead text-xs text-muted-foreground md:hidden">Omsetning</p>
                    <p className="font-subhead font-semibold text-foreground">{formatMNOK(fin.omsetning)}</p>
                  </div>

                  {/* Driftsresultat */}
                  <div className="col-span-4 md:col-span-2 text-right">
                    <p className="font-subhead text-xs text-muted-foreground md:hidden">Driftsres.</p>
                    <p className={`font-subhead font-semibold flex items-center justify-end gap-1 ${positive ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatMNOK(fin.driftsresultat)}
                    </p>
                  </div>

                  {/* Egenkapital */}
                  <div className="col-span-4 md:col-span-2 text-right">
                    <p className="font-subhead text-xs text-muted-foreground md:hidden">Egenkapital</p>
                    <p className="font-subhead font-semibold text-foreground">{formatMNOK(fin.egenkapital)}</p>
                  </div>

                  {/* Titler */}
                  <div className="col-span-12 md:col-span-2 flex md:justify-end items-center gap-1">
                    {club.titler > 0 && <Trophy className="w-3.5 h-3.5 text-accent" />}
                    <span className="font-subhead text-sm font-medium text-muted-foreground">
                      {club.titler} titl{club.titler === 1 ? "er" : "er"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground font-body">
            Ingen klubber funnet for «{query}»
          </div>
        )}
      </main>
      <IdrettAIChat />
    </div>
  );
}
