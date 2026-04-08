import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Building2, AlertTriangle, TrendingUp, Users, Calendar } from "lucide-react";
import { GeoFilter, getKommuneParam } from "./GeoFilter";

interface SimpleCompany {
  orgnr: string;
  navn: string;
  stiftelsesdato?: string;
  registreringsdato?: string;
  kommune: string;
  naeringsbeskriv: string;
  antallAnsatte?: number;
  konkurs?: boolean;
}

interface Props {
  selectedFylker: string[];
  selectedKommuner: string[];
  onFylkerChange: (f: string[]) => void;
  onKommunerChange: (k: string[]) => void;
}

function getMonthOptions(isNo: boolean) {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString(isNo ? "nb-NO" : "en-US", { month: "long", year: "numeric" });
    months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return months;
}

export function EstablishmentsOverview({ selectedFylker, selectedKommuner, onFylkerChange, onKommunerChange }: Props) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [tab, setTab] = useState<"new" | "bankrupt">("new");
  const [newCompanies, setNewCompanies] = useState<SimpleCompany[]>([]);
  const [bankruptcies, setBankruptcies] = useState<SimpleCompany[]>([]);
  const [newTotal, setNewTotal] = useState(0);
  const [bankruptTotal, setBankruptTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brreg-proxy`;
  const headers = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };
  const monthOptions = getMonthOptions(isNo);

  const fetchData = async () => {
    setLoading(true);
    try {
      const kommuneParam = getKommuneParam(selectedFylker, selectedKommuner);
      let fraDate: string;
      let tilDate: string;
      if (selectedMonth) {
        const d = new Date(selectedMonth);
        fraDate = selectedMonth;
        tilDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      } else {
        fraDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
        tilDate = "";
      }

      let newUrl = `${baseUrl}?action=new_establishments&fra=${fraDate}`;
      if (tilDate) newUrl += `&til=${tilDate}`;
      if (kommuneParam) newUrl += `&kommune=${kommuneParam}`;

      let bankUrl = `${baseUrl}?action=bankruptcies`;
      if (fraDate) bankUrl += `&fra=${fraDate}`;
      if (tilDate) bankUrl += `&til=${tilDate}`;
      if (kommuneParam) bankUrl += `&kommune=${kommuneParam}`;

      const [newData, bankData] = await Promise.all([
        fetch(newUrl, { headers }).then((r) => r.json()),
        fetch(bankUrl, { headers }).then((r) => r.json()),
      ]);

      setNewCompanies(newData.companies || []);
      setNewTotal(newData.total || 0);
      setBankruptcies(bankData.companies || []);
      setBankruptTotal(bankData.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedFylker, selectedKommuner, selectedMonth]);

  const items = tab === "new" ? newCompanies : bankruptcies;

  return (
    <div>
      <div className="space-y-4 mb-6">
        <GeoFilter
          selectedFylker={selectedFylker}
          selectedKommuner={selectedKommuner}
          onFylkerChange={onFylkerChange}
          onKommunerChange={onKommunerChange}
        />
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm font-body text-foreground focus:outline-none focus:border-accent transition-colors"
          >
            <option value="">{isNo ? "Siste 30 dager" : "Last 30 days"}</option>
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("new")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-subhead transition-all ${
            tab === "new" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-card border border-border"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          {isNo ? "Nyetableringer" : "New Businesses"} ({newTotal})
        </button>
        <button
          onClick={() => setTab("bankrupt")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-subhead transition-all ${
            tab === "bankrupt" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" : "bg-card border border-border"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          {isNo ? "Konkurser" : "Bankruptcies"} ({bankruptTotal})
        </button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground font-body py-8">{isNo ? "Laster data fra Brønnøysundregistrene..." : "Loading data..."}</p>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground font-body py-8">{isNo ? "Ingen data funnet" : "No data found"}</p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.orgnr} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  tab === "new" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                }`}>
                  {tab === "new"
                    ? <Building2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    : <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-subhead font-medium text-sm text-headline">{c.navn}</p>
                    {(c.antallAnsatte ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground font-subhead flex-shrink-0">
                        <Users className="w-3 h-3" /> {c.antallAnsatte}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {c.orgnr} · {c.kommune}
                    {c.registreringsdato && ` · ${isNo ? "Reg." : "Reg."} ${c.registreringsdato}`}
                  </p>
                  {c.naeringsbeskriv && <p className="text-xs text-muted-foreground font-body mt-1">{c.naeringsbeskriv}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
