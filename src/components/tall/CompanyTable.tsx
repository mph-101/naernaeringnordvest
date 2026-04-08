import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { ArrowUpDown, ArrowUp, ArrowDown, Building2, Users, ChevronRight, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { CompanyDetail } from "./CompanyDetail";
import { GeoFilter, getKommuneParam } from "./GeoFilter";

interface TableCompany {
  orgnr: string;
  navn: string;
  kommune: string;
  naeringsbeskriv: string;
  antallAnsatte: number;
  stiftelsesdato: string;
  konkurs: boolean;
}

interface FinData {
  year: string;
  omsetning: number;
  driftsresultat: number;
  arsresultat: number;
}

type SortField = "antallAnsatte" | "navn" | "stiftelsesdato" | "omsetning" | "arsresultat";

interface Props {
  session: any;
  selectedFylker: string[];
  selectedKommuner: string[];
  onFylkerChange: (f: string[]) => void;
  onKommunerChange: (k: string[]) => void;
}

function formatNOK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MNOK`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)} TNOK`;
  return `${n.toLocaleString()}`;
}

export function CompanyTable({ session, selectedFylker, selectedKommuner, onFylkerChange, onKommunerChange }: Props) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [companies, setCompanies] = useState<TableCompany[]>([]);
  const [financials, setFinancials] = useState<Record<string, FinData | null>>({});
  const [loading, setLoading] = useState(true);
  const [loadingFin, setLoadingFin] = useState(false);
  const [sortField, setSortField] = useState<SortField>("antallAnsatte");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedOrgnr, setSelectedOrgnr] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brreg-proxy`;
  const headers = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };
  const PAGE_SIZE = 30;

  // Server-side sortable fields (BRREG API supports these)
  const isServerSort = (f: SortField) => f === "antallAnsatte" || f === "navn" || f === "stiftelsesdato";

  const fetchData = async (p: number, field: SortField, order: "asc" | "desc", append = false) => {
    setLoading(true);
    try {
      const kommuneParam = getKommuneParam(selectedFylker, selectedKommuner);
      const serverField = isServerSort(field) ? field : "antallAnsatte";
      const serverOrder = isServerSort(field) ? order : "desc";
      let url = `${baseUrl}?action=top&page=${p}&size=${PAGE_SIZE}&sort=${serverField}&order=${serverOrder}`;
      if (kommuneParam) url += `&kommune=${kommuneParam}`;
      const res = await fetch(url, { headers });
      const json = await res.json();
      const newCompanies = json.companies || [];
      setCompanies(prev => append ? [...prev, ...newCompanies] : newCompanies);
      setTotalElements(json.totalElements || 0);
      setPage(p);

      // Fetch financials for all companies
      const orgnrs = newCompanies.map((c: TableCompany) => c.orgnr);
      if (orgnrs.length) {
        fetchFinancials(orgnrs, append);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchFinancials = async (orgnrs: string[], append = false) => {
    setLoadingFin(true);
    try {
      const res = await fetch(`${baseUrl}?action=batch_financials&orgnrs=${orgnrs.join(",")}`, { headers });
      const json = await res.json();
      setFinancials(prev => append ? { ...prev, ...(json.financials || {}) } : { ...prev, ...(json.financials || {}) });
    } catch (e) { console.error(e); }
    setLoadingFin(false);
  };

  useEffect(() => {
    setFinancials({});
    fetchData(0, sortField, sortOrder);
  }, [selectedFylker, selectedKommuner]);

  const handleSort = (field: SortField) => {
    const newOrder = field === sortField ? (sortOrder === "desc" ? "asc" : "desc") : "desc";
    setSortField(field);
    setSortOrder(newOrder);

    if (isServerSort(field)) {
      setCompanies([]);
      setFinancials({});
      fetchData(0, field, newOrder);
    }
    // Client-side sort for financial fields happens in render
  };

  // Get sorted companies (client-side sort for financial fields)
  const getSortedCompanies = () => {
    if (isServerSort(sortField)) return companies;

    return [...companies].sort((a, b) => {
      const fa = financials[a.orgnr];
      const fb = financials[b.orgnr];
      const va = fa ? (sortField === "omsetning" ? fa.omsetning : fa.arsresultat) : -Infinity;
      const vb = fb ? (sortField === "omsetning" ? fb.omsetning : fb.arsresultat) : -Infinity;
      return sortOrder === "desc" ? vb - va : va - vb;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
    return sortOrder === "desc" ? <ArrowDown className="w-3 h-3 text-primary" /> : <ArrowUp className="w-3 h-3 text-primary" />;
  };

  if (selectedOrgnr) {
    return (
      <div>
        <button onClick={() => setSelectedOrgnr(null)} className="text-sm text-muted-foreground hover:text-foreground mb-4 font-body transition-colors">
          ← {isNo ? "Tilbake til oversikt" : "Back to overview"}
        </button>
        <CompanyDetail orgnr={selectedOrgnr} companyName={selectedName} session={session} />
      </div>
    );
  }

  const columns: { field: SortField; label: string; labelEn: string; align: "left" | "right" }[] = [
    { field: "navn", label: "Selskap", labelEn: "Company", align: "left" },
    { field: "antallAnsatte", label: "Ansatte", labelEn: "Employees", align: "right" },
    { field: "omsetning", label: "Omsetning", labelEn: "Revenue", align: "right" },
    { field: "arsresultat", label: "Resultat", labelEn: "Net Profit", align: "right" },
    { field: "stiftelsesdato", label: "Stiftet", labelEn: "Founded", align: "right" },
  ];

  const sorted = getSortedCompanies();

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-headline text-lg font-semibold text-headline">
          {isNo ? "Største selskaper" : "Largest Companies"}
        </h2>
        <p className="text-sm text-muted-foreground font-body">
          {totalElements.toLocaleString()} {isNo ? "selskaper" : "companies"}
        </p>
      </div>

      <div className="mb-4">
        <GeoFilter
          selectedFylker={selectedFylker}
          selectedKommuner={selectedKommuner}
          onFylkerChange={onFylkerChange}
          onKommunerChange={onKommunerChange}
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left py-3 px-4 font-subhead text-muted-foreground font-medium w-8">#</th>
                {columns.map((col) => (
                  <th key={col.field} className={`py-3 px-4 font-subhead text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors ${col.align === "right" ? "text-right" : "text-left"}`} onClick={() => handleSort(col.field)}>
                    <span className="inline-flex items-center gap-1.5">
                      {isNo ? col.label : col.labelEn}
                      <SortIcon field={col.field} />
                    </span>
                  </th>
                ))}
                <th className="py-3 px-4 font-subhead text-muted-foreground font-medium text-left">{isNo ? "Kommune" : "Municipality"}</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => {
                const fin = financials[c.orgnr];
                return (
                  <tr key={c.orgnr} onClick={() => { setSelectedOrgnr(c.orgnr); setSelectedName(c.navn); }} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors group">
                    <td className="py-3 px-4 text-muted-foreground font-body text-xs">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-warm flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-accent-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-subhead font-medium text-headline group-hover:text-accent transition-colors truncate text-sm">{c.navn}</p>
                          {c.naeringsbeskriv && <p className="text-xs text-muted-foreground font-body truncate max-w-xs">{c.naeringsbeskriv}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 font-subhead font-medium text-sm">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        {c.antallAnsatte.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-subhead text-sm">
                      {loadingFin && !fin ? (
                        <span className="text-muted-foreground">…</span>
                      ) : fin ? (
                        formatNOK(fin.omsetning)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-right font-subhead text-sm ${fin && fin.arsresultat < 0 ? "text-destructive" : ""}`}>
                      {loadingFin && !fin ? (
                        <span className="text-muted-foreground">…</span>
                      ) : fin ? (
                        <span className="inline-flex items-center justify-end gap-1">
                          {fin.arsresultat >= 0 ? <TrendingUp className="w-3 h-3 text-accent" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                          {formatNOK(fin.arsresultat)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-body text-muted-foreground text-sm">{c.stiftelsesdato?.substring(0, 4) || "—"}</td>
                    <td className="py-3 px-4 font-body text-muted-foreground text-sm">{c.kommune}</td>
                    <td className="py-3 px-2"><ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-accent transition-colors" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading && <div className="py-6 text-center text-muted-foreground font-body text-sm">{isNo ? "Laster..." : "Loading..."}</div>}
        {!loading && companies.length < totalElements && (
          <div className="py-4 text-center border-t border-border">
            <button onClick={() => fetchData(page + 1, sortField, sortOrder, true)} className="px-6 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-subhead hover:bg-secondary/80 transition-colors">
              {isNo ? `Last flere (viser ${companies.length} av ${totalElements.toLocaleString()})` : `Load more (showing ${companies.length} of ${totalElements.toLocaleString()})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
