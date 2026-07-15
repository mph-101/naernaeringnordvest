import { useState, useEffect } from "react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";
import { Link } from "react-router-dom";
import { Building2, Users, TrendingUp, Banknote, ExternalLink } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Badge } from "@/components/ui/badge";

interface CompanyData {
  orgnr: string;
  navn: string;
  naeringsbeskriv: string;
  antallAnsatte: number;
  kommune: string;
}

interface RoleEntry {
  type: string;
  typeBeskrivelse: string;
  person: { fornavn: string; etternavn: string } | null;
  fratradt: boolean;
}

interface FinancialYear {
  year: string;
  omsetning: number;
  driftsresultat: number;
  arsresultat: number;
}

function formatNOK(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} mrd`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mill`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toLocaleString("nb-NO");
}

export function CompanyMiniProfile({ orgnr, companyName }: { orgnr: string; companyName?: string }) {
  const { language } = useTheme();
  const isNo = language === "no";

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [ceo, setCeo] = useState<string | null>(null);
  const [financials, setFinancials] = useState<FinancialYear | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = `${SUPABASE_URL}/functions/v1/brreg-proxy`;
    const headers = { Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

    Promise.all([
      fetch(`${base}?action=search&q=${orgnr}&size=1`, { headers }).then((r) => r.json()),
      fetch(`${base}?action=roles&orgnr=${orgnr}`, { headers }).then((r) => r.json()),
      fetch(`${base}?action=batch_financials&orgnrs=${orgnr}`, { headers }).then((r) => r.json()),
    ])
      .then(([searchData, rolesData, finData]) => {
        const c = searchData?.companies?.[0];
        if (c) setCompany(c);

        const dagligLeder = (rolesData?.roles || []).find(
          (r: RoleEntry) => r.type === "DAGL" && !r.fratradt && r.person
        );
        if (dagligLeder?.person) {
          setCeo(`${dagligLeder.person.fornavn} ${dagligLeder.person.etternavn}`);
        }

        const fin = finData?.financials?.[orgnr];
        if (fin) setFinancials(fin);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgnr]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
        <div className="h-5 bg-muted rounded w-1/3 mb-3" />
        <div className="h-4 bg-muted rounded w-2/3 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  const name = company?.navn || companyName || orgnr;
  const bio = company
    ? [company.naeringsbeskriv, company.kommune].filter(Boolean).join(" · ")
    : "";

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-soft transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className="font-headline text-sm font-semibold text-headline truncate">{name}</h4>
            <span className="text-[0.6875rem] text-muted-foreground font-body">Org.nr {orgnr}</span>
          </div>
        </div>
        <Link
          to={`/tall?selskap=${orgnr}`}
          className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline font-subhead"
        >
          {isNo ? "Se profil" : "View profile"}
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Bio */}
      {bio && (
        <p className="text-xs text-muted-foreground font-body mb-3 line-clamp-2">{bio}</p>
      )}

      {/* CEO */}
      {ceo && (
        <div className="flex items-center gap-1.5 text-xs text-foreground font-body mb-3">
          <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0 font-normal">
            {isNo ? "Daglig leder" : "CEO"}
          </Badge>
          <span className="font-medium">{ceo}</span>
        </div>
      )}

      {/* Key Figures */}
      <div className="grid grid-cols-3 gap-2">
        <KeyFigure
          icon={<Banknote className="w-3.5 h-3.5" />}
          label={isNo ? "Omsetning" : "Revenue"}
          value={financials ? formatNOK(financials.omsetning) : "–"}
          year={financials?.year}
        />
        <KeyFigure
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label={isNo ? "Resultat" : "Profit"}
          value={financials ? formatNOK(financials.arsresultat) : "–"}
          year={financials?.year}
          negative={financials ? financials.arsresultat < 0 : false}
        />
        <KeyFigure
          icon={<Users className="w-3.5 h-3.5" />}
          label={isNo ? "Ansatte" : "Employees"}
          value={company?.antallAnsatte?.toString() || "–"}
        />
      </div>
    </div>
  );
}

function KeyFigure({
  icon,
  label,
  value,
  year,
  negative,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  year?: string;
  negative?: boolean;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-[0.625rem] font-subhead uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-sm font-semibold font-headline ${negative ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
      {year && <span className="text-[9px] text-muted-foreground">({year})</span>}
    </div>
  );
}
