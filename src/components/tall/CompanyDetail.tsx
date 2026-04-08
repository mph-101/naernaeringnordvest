import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Building2, Users, TrendingUp, TrendingDown, User } from "lucide-react";
import { AddToListDialog } from "./AddToListDialog";

interface FinancialYear {
  year: string;
  omsetning: number;
  driftsresultat: number;
  arsresultat: number;
  egenkapital: number;
  sumEiendeler: number;
}

interface Role {
  type: string;
  typeBeskrivelse: string;
  person: { fornavn: string; etternavn: string } | null;
  enhet: { orgnr: string; navn: string } | null;
  fratradt: boolean;
}

function formatNOK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MNOK`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)} TNOK`;
  return `${n.toLocaleString()} NOK`;
}

export function CompanyDetail({ orgnr, session }: { orgnr: string; session: any }) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [financials, setFinancials] = useState<FinancialYear[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingFin, setLoadingFin] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [showAddToList, setShowAddToList] = useState(false);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brreg-proxy`;
  const headers = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

  useEffect(() => {
    // Fetch company info
    fetch(`${baseUrl}?action=search&q=${orgnr}&size=1`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (d.companies?.[0]) setCompanyName(d.companies[0].navn);
      });

    // Fetch financials
    fetch(`${baseUrl}?action=financials&orgnr=${orgnr}`, { headers })
      .then((r) => r.json())
      .then((d) => setFinancials(d.financials || []))
      .catch(() => {})
      .finally(() => setLoadingFin(false));

    // Fetch roles
    fetch(`${baseUrl}?action=roles&orgnr=${orgnr}`, { headers })
      .then((r) => r.json())
      .then((d) => setRoles(d.roles || []))
      .catch(() => {})
      .finally(() => setLoadingRoles(false));
  }, [orgnr]);

  const activeRoles = roles.filter((r) => !r.fratradt);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-headline">{companyName || orgnr}</h2>
          <p className="text-sm text-muted-foreground font-body">Org.nr: {orgnr}</p>
        </div>
        {session && (
          <button
            onClick={() => setShowAddToList(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-subhead hover:bg-primary/90 transition-colors"
          >
            + {isNo ? "Legg til i liste" : "Add to list"}
          </button>
        )}
      </div>

      {/* Financials */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-headline text-lg font-semibold text-headline mb-4">
          {isNo ? "Nøkkeltall" : "Key Figures"}
        </h3>
        {loadingFin ? (
          <p className="text-muted-foreground font-body text-sm">{isNo ? "Laster..." : "Loading..."}</p>
        ) : financials.length === 0 ? (
          <p className="text-muted-foreground font-body text-sm">{isNo ? "Ingen regnskapsdata funnet" : "No financial data found"}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-subhead text-muted-foreground font-medium">{isNo ? "År" : "Year"}</th>
                  <th className="text-right py-2 font-subhead text-muted-foreground font-medium">{isNo ? "Omsetning" : "Revenue"}</th>
                  <th className="text-right py-2 font-subhead text-muted-foreground font-medium">{isNo ? "Driftsres." : "Op. Profit"}</th>
                  <th className="text-right py-2 font-subhead text-muted-foreground font-medium">{isNo ? "Årsresultat" : "Net Profit"}</th>
                  <th className="text-right py-2 font-subhead text-muted-foreground font-medium">{isNo ? "Egenkapital" : "Equity"}</th>
                </tr>
              </thead>
              <tbody>
                {financials.slice(0, 5).map((f) => (
                  <tr key={f.year} className="border-b border-border/50">
                    <td className="py-2.5 font-subhead font-medium">{f.year}</td>
                    <td className="py-2.5 text-right font-subhead">{formatNOK(f.omsetning)}</td>
                    <td className={`py-2.5 text-right font-subhead flex items-center justify-end gap-1 ${f.driftsresultat >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {f.driftsresultat >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatNOK(f.driftsresultat)}
                    </td>
                    <td className={`py-2.5 text-right font-subhead ${f.arsresultat >= 0 ? "" : "text-destructive"}`}>{formatNOK(f.arsresultat)}</td>
                    <td className="py-2.5 text-right font-subhead">{formatNOK(f.egenkapital)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Roles */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-headline text-lg font-semibold text-headline mb-4">
          {isNo ? "Roller" : "Roles"}
        </h3>
        {loadingRoles ? (
          <p className="text-muted-foreground font-body text-sm">{isNo ? "Laster..." : "Loading..."}</p>
        ) : activeRoles.length === 0 ? (
          <p className="text-muted-foreground font-body text-sm">{isNo ? "Ingen roller funnet" : "No roles found"}</p>
        ) : (
          <div className="space-y-2">
            {activeRoles.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-subhead text-sm font-medium">
                    {r.person ? `${r.person.fornavn} ${r.person.etternavn}` : r.enhet?.navn || "—"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-body bg-secondary px-2 py-1 rounded-full">
                  {r.typeBeskrivelse}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddToList && (
        <AddToListDialog
          orgnr={orgnr}
          companyName={companyName}
          session={session}
          onClose={() => setShowAddToList(false)}
        />
      )}
    </div>
  );
}
