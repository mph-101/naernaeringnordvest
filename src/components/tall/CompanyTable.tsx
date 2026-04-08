import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { ArrowUpDown, ArrowUp, ArrowDown, Building2, Users, ChevronRight } from "lucide-react";
import { CompanyDetail } from "./CompanyDetail";

interface TableCompany {
  orgnr: string;
  navn: string;
  kommune: string;
  naeringsbeskriv: string;
  antallAnsatte: number;
  stiftelsesdato: string;
  konkurs: boolean;
}

type SortField = "antallAnsatte" | "navn" | "stiftelsesdato";

export function CompanyTable({ session }: { session: any }) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [companies, setCompanies] = useState<TableCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("antallAnsatte");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedOrgnr, setSelectedOrgnr] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brreg-proxy`;
  const headers = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };
  const PAGE_SIZE = 30;

  const fetchData = async (p: number, field: SortField, order: "asc" | "desc", append = false) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${baseUrl}?action=top&page=${p}&size=${PAGE_SIZE}&sort=${field}&order=${order}`,
        { headers }
      );
      const json = await res.json();
      const newCompanies = json.companies || [];
      setCompanies(prev => append ? [...prev, ...newCompanies] : newCompanies);
      setTotalElements(json.totalElements || 0);
      setPage(p);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(0, sortField, sortOrder);
  }, []);

  const handleSort = (field: SortField) => {
    const newOrder = field === sortField ? (sortOrder === "desc" ? "asc" : "desc") : "desc";
    setSortField(field);
    setSortOrder(newOrder);
    setCompanies([]);
    fetchData(0, field, newOrder);
  };

  const loadMore = () => {
    fetchData(page + 1, sortField, sortOrder, true);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
    return sortOrder === "desc"
      ? <ArrowDown className="w-3 h-3 text-primary" />
      : <ArrowUp className="w-3 h-3 text-primary" />;
  };

  if (selectedOrgnr) {
    return (
      <div>
        <button
          onClick={() => setSelectedOrgnr(null)}
          className="text-sm text-muted-foreground hover:text-foreground mb-4 font-body transition-colors"
        >
          ← {isNo ? "Tilbake til oversikt" : "Back to overview"}
        </button>
        <CompanyDetail orgnr={selectedOrgnr} companyName={selectedName} session={session} />
      </div>
    );
  }

  const columns: { field: SortField; label: string; labelEn: string; align: "left" | "right" }[] = [
    { field: "navn", label: "Selskap", labelEn: "Company", align: "left" },
    { field: "antallAnsatte", label: "Ansatte", labelEn: "Employees", align: "right" },
    { field: "stiftelsesdato", label: "Stiftet", labelEn: "Founded", align: "right" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-lg font-semibold text-headline">
          {isNo ? "Største selskaper" : "Largest Companies"}
        </h2>
        <p className="text-sm text-muted-foreground font-body">
          {totalElements.toLocaleString()} {isNo ? "selskaper totalt" : "companies total"}
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left py-3 px-4 font-subhead text-muted-foreground font-medium w-8">#</th>
                {columns.map((col) => (
                  <th
                    key={col.field}
                    className={`py-3 px-4 font-subhead text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                    onClick={() => handleSort(col.field)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {isNo ? col.label : col.labelEn}
                      <SortIcon field={col.field} />
                    </span>
                  </th>
                ))}
                <th className="py-3 px-4 font-subhead text-muted-foreground font-medium text-left">
                  {isNo ? "Kommune" : "Municipality"}
                </th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => (
                <tr
                  key={c.orgnr}
                  onClick={() => { setSelectedOrgnr(c.orgnr); setSelectedName(c.navn); }}
                  className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 text-muted-foreground font-body text-xs">
                    {i + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-warm flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-accent-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-subhead font-medium text-headline group-hover:text-accent transition-colors truncate text-sm">
                          {c.navn}
                        </p>
                        {c.naeringsbeskriv && (
                          <p className="text-xs text-muted-foreground font-body truncate max-w-xs">
                            {c.naeringsbeskriv}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 font-subhead font-medium text-sm">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      {c.antallAnsatte.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-body text-muted-foreground text-sm">
                    {c.stiftelsesdato?.substring(0, 4) || "—"}
                  </td>
                  <td className="py-3 px-4 font-body text-muted-foreground text-sm">
                    {c.kommune}
                  </td>
                  <td className="py-3 px-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-accent transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="py-6 text-center text-muted-foreground font-body text-sm">
            {isNo ? "Laster..." : "Loading..."}
          </div>
        )}

        {!loading && companies.length < totalElements && (
          <div className="py-4 text-center border-t border-border">
            <button
              onClick={loadMore}
              className="px-6 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-subhead hover:bg-secondary/80 transition-colors"
            >
              {isNo ? `Last flere (viser ${companies.length} av ${totalElements.toLocaleString()})` : `Load more (showing ${companies.length} of ${totalElements.toLocaleString()})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
