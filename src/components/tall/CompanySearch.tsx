import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { Search, Building2, Users, Plus } from "lucide-react";
import { CompanyDetail } from "./CompanyDetail";
import { GeoFilter, getKommuneParam } from "./GeoFilter";
import { AddToListDialog } from "./AddToListDialog";
import { toast } from "@/hooks/use-toast";

interface Company {
  orgnr: string;
  navn: string;
  kommune: string;
  poststed: string;
  naeringskode: string;
  naeringsbeskriv: string;
  antallAnsatte: number;
  stiftelsesdato: string;
  konkurs: boolean;
  underAvvikling: boolean;
}

interface Props {
  session: any;
  selectedFylker: string[];
  selectedKommuner: string[];
  onFylkerChange: (v: string[]) => void;
  onKommunerChange: (v: string[]) => void;
}

export function CompanySearch({ session, selectedFylker, selectedKommuner, onFylkerChange, onKommunerChange }: Props) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [addToListCompany, setAddToListCompany] = useState<Company | null>(null);

  // Auto-open company from URL param
  useEffect(() => {
    const selskapParam = searchParams.get("selskap");
    if (selskapParam && !selectedCompany) {
      // Fetch company info by orgnr and auto-select it
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brreg-proxy?action=search&q=${selskapParam}&size=1`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const c = data?.companies?.[0];
          if (c) setSelectedCompany(c);
        })
        .catch(() => {});
    }
  }, []);

  const search = async (p = 0) => {
    setLoading(true);
    setSearched(true);
    try {
      let url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brreg-proxy?action=search&q=${encodeURIComponent(query)}&page=${p}&size=20`;
      const kommune = getKommuneParam(selectedFylker, selectedKommuner);
      if (kommune) url += `&kommune=${kommune}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setResults(json.companies || []);
      setTotalElements(json.totalElements || 0);
      setPage(p);
    } catch (e) {
      console.error(e);
      toast({ title: isNo ? "Feil ved søk" : "Search error", variant: "destructive" });
    }
    setLoading(false);
  };

  const [searched, setSearched] = useState(false);

  if (selectedCompany) {
    return (
      <div>
        <button
          onClick={() => {
            setSelectedCompany(null);
            // Clear selskap param from URL
            searchParams.delete("selskap");
            setSearchParams(searchParams, { replace: true });
          }}
          className="text-sm text-muted-foreground hover:text-foreground mb-4 font-body transition-colors"
        >
          ← {isNo ? "Tilbake til søk" : "Back to search"}
        </button>
        <CompanyDetail orgnr={selectedCompany.orgnr} companyName={selectedCompany.navn} session={session} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <GeoFilter
          selectedFylker={selectedFylker}
          selectedKommuner={selectedKommuner}
          onFylkerChange={onFylkerChange}
          onKommunerChange={onKommunerChange}
        />
      </div>
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder={isNo ? "Søk etter selskap, org.nr. eller sted..." : "Search company, org. number or location..."}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-card font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <button
          onClick={() => search()}
          disabled={loading}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-subhead text-sm font-semibold hover:bg-primary/90 transition-colors shadow-soft disabled:opacity-50"
        >
          {loading ? "..." : isNo ? "Søk" : "Search"}
        </button>
      </div>

      {searched && (
        <p className="text-sm text-muted-foreground mb-4 font-body">
          {totalElements.toLocaleString()} {isNo ? "treff" : "results"}
        </p>
      )}

      <div className="space-y-2">
        {results.map((c) => (
          <div
            key={c.orgnr}
            className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-accent/40 hover:shadow-soft transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <button
                onClick={() => setSelectedCompany(c)}
                className="flex items-start gap-3 min-w-0 text-left flex-1"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-warm flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-headline font-semibold text-headline group-hover:text-accent transition-colors truncate">
                    {c.navn}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    Org.nr: {c.orgnr} · {c.kommune || c.poststed}
                  </p>
                  {c.naeringsbeskriv && (
                    <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-1">
                      {c.naeringsbeskriv}
                    </p>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.antallAnsatte > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground font-subhead">
                    <Users className="w-3 h-3" />
                    {c.antallAnsatte}
                  </span>
                )}
                {c.konkurs && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-subhead">
                    {isNo ? "Konkurs" : "Bankrupt"}
                  </span>
                )}
                {session && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setAddToListCompany(c); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                    title={isNo ? "Legg til i liste" : "Add to list"}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalElements > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => search(page - 1)}
            disabled={page === 0 || loading}
            className="px-4 py-2 rounded-lg border border-border text-sm font-subhead disabled:opacity-30 hover:bg-secondary transition-colors"
          >
            {isNo ? "Forrige" : "Previous"}
          </button>
          <span className="px-4 py-2 text-sm text-muted-foreground font-body">
            {isNo ? `Side ${page + 1}` : `Page ${page + 1}`}
          </span>
          <button
            onClick={() => search(page + 1)}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-border text-sm font-subhead disabled:opacity-30 hover:bg-secondary transition-colors"
          >
            {isNo ? "Neste" : "Next"}
          </button>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground font-body">
          {isNo ? `Ingen selskaper funnet for «${query}»` : `No companies found for "${query}"`}
        </div>
      )}

      {addToListCompany && session && (
        <AddToListDialog
          orgnr={addToListCompany.orgnr}
          companyName={addToListCompany.navn}
          session={session}
          onClose={() => setAddToListCompany(null)}
        />
      )}
    </div>
  );
}
