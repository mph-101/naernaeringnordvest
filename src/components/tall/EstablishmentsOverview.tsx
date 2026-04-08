import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Building2, AlertTriangle, TrendingUp } from "lucide-react";

interface SimpleCompany {
  orgnr: string;
  navn: string;
  stiftelsesdato?: string;
  registreringsdato?: string;
  kommune: string;
  naeringsbeskriv: string;
  konkurs?: boolean;
}

const MORE_OG_ROMSDAL_KOMMUNER = "1505,1506,1507,1511,1514,1515,1516,1517,1520,1525,1528,1531,1532,1535,1539,1554,1557,1560,1563,1566,1573,1576,1577,1578,1579";

export function EstablishmentsOverview() {
  const { language } = useTheme();
  const isNo = language === "no";
  const [tab, setTab] = useState<"new" | "bankrupt">("new");
  const [newCompanies, setNewCompanies] = useState<SimpleCompany[]>([]);
  const [bankruptcies, setBankruptcies] = useState<SimpleCompany[]>([]);
  const [newTotal, setNewTotal] = useState(0);
  const [bankruptTotal, setBankruptTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brreg-proxy`;
  const headers = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

  useEffect(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    Promise.all([
      fetch(`${baseUrl}?action=new_establishments&fra=${thirtyDaysAgo}`, { headers }).then((r) => r.json()),
      fetch(`${baseUrl}?action=bankruptcies`, { headers }).then((r) => r.json()),
    ])
      .then(([newData, bankData]) => {
        setNewCompanies(newData.companies || []);
        setNewTotal(newData.total || 0);
        setBankruptcies(bankData.companies || []);
        setBankruptTotal(bankData.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const items = tab === "new" ? newCompanies : bankruptcies;
  const total = tab === "new" ? newTotal : bankruptTotal;

  return (
    <div>
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
        <p className="text-center text-muted-foreground font-body py-8">{isNo ? "Laster data fra Brønnøysundregistrene..." : "Loading data from Brønnøysund Register Centre..."}</p>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground font-body py-8">
          {isNo ? "Ingen data funnet" : "No data found"}
        </p>
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
                <div className="min-w-0">
                  <p className="font-subhead font-medium text-sm text-headline">{c.navn}</p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {c.orgnr} · {c.kommune}
                    {c.registreringsdato && ` · ${isNo ? "Reg." : "Reg."} ${c.registreringsdato}`}
                  </p>
                  {c.naeringsbeskriv && (
                    <p className="text-xs text-muted-foreground font-body mt-1">{c.naeringsbeskriv}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
