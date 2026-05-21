import { useState, useEffect } from "react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";
import { useTheme } from "@/hooks/useTheme";
import { Building2, Users, TrendingUp, TrendingDown, User, ChevronDown, ChevronUp, ExternalLink, FileText, Megaphone } from "lucide-react";
import { AddToListDialog } from "./AddToListDialog";
import { CompanyArticles } from "./CompanyArticles";
import { FollowCompanyButton } from "@/components/FollowCompanyButton";

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

interface Announcement {
  id: string;
  kunngjoringstype: string;
  dato: string;
  beskrivelse: string;
}

function formatNOK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MNOK`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)} TNOK`;
  return `${n.toLocaleString()} NOK`;
}

type ChartMetric = "omsetning" | "driftsresultat" | "arsresultat" | "egenkapital";

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary font-body transition-colors">
      <ExternalLink className="w-3 h-3" /> {label}
    </a>
  );
}

export function CompanyDetail({ orgnr, companyName: initialName, session }: { orgnr: string; companyName?: string; session: any }) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [financials, setFinancials] = useState<FinancialYear[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingFin, setLoadingFin] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [companyName, setCompanyName] = useState(initialName || "");
  const [showAddToList, setShowAddToList] = useState(false);
  const [antallAnsatte, setAntallAnsatte] = useState<number | null>(null);
  const [kommune, setKommune] = useState("");
  const [naeringsbeskriv, setNaeringsbeskriv] = useState("");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("omsetning");
  const [showAllYears, setShowAllYears] = useState(false);

  const baseUrl = `${SUPABASE_URL}/functions/v1/brreg-proxy`;
  const headers = { Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

  const brregEnhetUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${orgnr}`;
  const brregRegnskapUrl = `https://data.brreg.no/regnskapsregisteret/regnskap/${orgnr}`;
  const brregKunnUrl = `https://www.brreg.no/registersok/kunngjoringer/`;

  useEffect(() => {
    fetch(`${baseUrl}?action=search&q=${orgnr}&size=1`, { headers })
      .then((r) => r.json())
      .then((d) => {
        const c = d.companies?.[0];
        if (c) {
          if (!companyName) setCompanyName(c.navn);
          setAntallAnsatte(c.antallAnsatte ?? null);
          setKommune(c.kommune || "");
          setNaeringsbeskriv(c.naeringsbeskriv || "");
        }
      });

    fetch(`${baseUrl}?action=financials&orgnr=${orgnr}`, { headers })
      .then((r) => r.json())
      .then((d) => setFinancials(d.financials || []))
      .catch(() => {})
      .finally(() => setLoadingFin(false));

    fetch(`${baseUrl}?action=roles&orgnr=${orgnr}`, { headers })
      .then((r) => r.json())
      .then((d) => setRoles(d.roles || []))
      .catch(() => {})
      .finally(() => setLoadingRoles(false));

  }, [orgnr]);

  const activeRoles = roles.filter((r) => !r.fratradt);

  const metricLabels: Record<ChartMetric, string> = {
    omsetning: isNo ? "Omsetning" : "Revenue",
    driftsresultat: isNo ? "Driftsresultat" : "Operating Profit",
    arsresultat: isNo ? "Årsresultat" : "Net Profit",
    egenkapital: isNo ? "Egenkapital" : "Equity",
  };

  const chartData = [...financials].reverse();
  const visibleTableYears = showAllYears ? financials : financials.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-headline">{companyName || orgnr}</h2>
          <p className="text-sm text-muted-foreground font-body">
            Org.nr: {orgnr}{kommune && ` · ${kommune}`}
          </p>
          {naeringsbeskriv && <p className="text-xs text-muted-foreground font-body mt-1">{naeringsbeskriv}</p>}
          <div className="flex items-center gap-4 mt-2">
            {antallAnsatte !== null && (
              <span className="flex items-center gap-1.5 text-sm font-subhead text-foreground">
                <Users className="w-4 h-4 text-muted-foreground" />
                {antallAnsatte.toLocaleString()} {isNo ? "ansatte" : "employees"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <SourceLink href={brregEnhetUrl} label={isNo ? "Enhetsregisteret" : "Entity Registry"} />
            <SourceLink href={brregKunnUrl} label={isNo ? "Kunngjøringer" : "Announcements"} />
          </div>
        </div>
        {session && (
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-shrink-0">
            <FollowCompanyButton orgnr={orgnr} companyName={companyName} />
            <button
              onClick={() => setShowAddToList(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-subhead hover:bg-primary/90 transition-colors"
            >
              + {isNo ? "Legg til i liste" : "Add to list"}
            </button>
          </div>
        )}
      </div>

      {/* Multi-metric Chart */}
      {!loadingFin && chartData.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-headline text-lg font-semibold text-headline">
              {isNo ? "Historisk utvikling" : "Historical Trend"} ({chartData.length} {isNo ? "år" : "years"})
            </h3>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(metricLabels) as ChartMetric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMetric(m)}
                  className={`px-2.5 py-1 text-xs font-subhead rounded-lg transition-all ${
                    chartMetric === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {metricLabels[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-[2px] h-48">
            {chartData.map((f) => {
              const values = chartData.map((x) => x[chartMetric]);
              const maxVal = Math.max(...values.map(Math.abs), 1);
              const val = f[chartMetric];
              const isNegative = val < 0;
              const heightPct = (Math.abs(val) / maxVal) * 100;
              return (
                <div key={f.year} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative min-w-0">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border border-border rounded px-2 py-1 text-[10px] font-subhead whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-md">
                    {f.year}: {formatNOK(val)}
                  </div>
                  <div
                    className={`w-full rounded-t-sm min-h-[2px] transition-all ${
                      isNegative ? "bg-destructive/70" : "bg-primary/70"
                    } group-hover:${isNegative ? "bg-destructive" : "bg-primary"}`}
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                  />
                  <span className="text-[9px] font-body text-muted-foreground truncate w-full text-center">
                    {chartData.length > 12 ? f.year.slice(2) : f.year}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Financials Table */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline text-lg font-semibold text-headline">
            {isNo ? "Nøkkeltall" : "Key Figures"}
            {financials.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({financials.length} {isNo ? "år" : "years"})
              </span>
            )}
          </h3>
          <SourceLink href={brregRegnskapUrl} label={isNo ? "Regnskapsregisteret" : "Financial Registry"} />
        </div>
        {loadingFin ? (
          <p className="text-muted-foreground font-body text-sm">{isNo ? "Laster..." : "Loading..."}</p>
        ) : financials.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground font-body text-sm mb-1">
              {isNo ? "Ingen regnskapsdata tilgjengelig" : "No financial data available"}
            </p>
            <p className="text-muted-foreground/70 font-body text-xs mb-3">
              {isNo
                ? "Banker, forsikringsselskaper og andre finansinstitusjoner bruker egne oppstillingsplaner som ikke er tilgjengelig via det åpne API-et."
                : "Banks, insurance companies and other financial institutions use specific reporting formats not available via the public API."}
            </p>
            <a
              href={`https://www.proff.no/bransjesøk?q=${orgnr}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary font-subhead hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {isNo ? "Se regnskap på Proff.no" : "View financials on Proff.no"}
            </a>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-subhead text-muted-foreground font-medium">{isNo ? "År" : "Year"}</th>
                    <th className="text-right py-2 font-subhead text-muted-foreground font-medium">{isNo ? "Omsetning" : "Revenue"}</th>
                    <th className="text-right py-2 font-subhead text-muted-foreground font-medium">{isNo ? "Driftsres." : "Op. Profit"}</th>
                    <th className="text-right py-2 font-subhead text-muted-foreground font-medium">{isNo ? "Årsresultat" : "Net Profit"}</th>
                    <th className="text-right py-2 font-subhead text-muted-foreground font-medium">{isNo ? "Egenkapital" : "Equity"}</th>
                    <th className="text-right py-2 font-subhead text-muted-foreground font-medium">{isNo ? "Sum eiendeler" : "Total Assets"}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTableYears.map((f, i) => {
                    const prev = financials[i + 1];
                    const revChange = prev && prev.omsetning ? ((f.omsetning - prev.omsetning) / Math.abs(prev.omsetning)) * 100 : null;
                    return (
                      <tr key={f.year} className="border-b border-border/50">
                        <td className="py-2.5 font-subhead font-medium">{f.year}</td>
                        <td className="py-2.5 text-right font-subhead">
                          <div>{formatNOK(f.omsetning)}</div>
                          {revChange !== null && (
                            <div className={`text-[10px] ${revChange >= 0 ? "text-accent" : "text-destructive"}`}>
                              {revChange >= 0 ? "+" : ""}{revChange.toFixed(1)}%
                            </div>
                          )}
                        </td>
                        <td className={`py-2.5 text-right font-subhead ${f.driftsresultat >= 0 ? "" : "text-destructive"}`}>
                          <div className="flex items-center justify-end gap-1">
                            {f.driftsresultat >= 0 ? <TrendingUp className="w-3 h-3 text-accent" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                            {formatNOK(f.driftsresultat)}
                          </div>
                        </td>
                        <td className={`py-2.5 text-right font-subhead ${f.arsresultat >= 0 ? "" : "text-destructive"}`}>{formatNOK(f.arsresultat)}</td>
                        <td className="py-2.5 text-right font-subhead">{formatNOK(f.egenkapital)}</td>
                        <td className="py-2.5 text-right font-subhead">{formatNOK(f.sumEiendeler)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {financials.length > 5 && (
              <button
                onClick={() => setShowAllYears(!showAllYears)}
                className="mt-3 flex items-center gap-1 text-sm text-primary font-subhead hover:underline mx-auto"
              >
                {showAllYears ? (
                  <><ChevronUp className="w-4 h-4" /> {isNo ? "Vis færre" : "Show less"}</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> {isNo ? `Vis alle ${financials.length} år` : `Show all ${financials.length} years`}</>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Related Articles */}
      <CompanyArticles orgnr={orgnr} />

      {/* Announcements */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-5 h-5 text-primary" />
          <h3 className="font-headline text-lg font-semibold text-headline">
            {isNo ? "Kunngjøringer" : "Announcements"}
          </h3>
        </div>
        <p className="text-muted-foreground font-body text-sm mb-3">
          {isNo
            ? "Kunngjøringer fra Foretaksregisteret, Konkursregisteret og andre registre er tilgjengelig på Brønnøysundregistrenes nettsider."
            : "Announcements from the business registers are available on the Brønnøysund Register Centre website."}
        </p>
        <a
          href={brregKunnUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary font-subhead hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {isNo ? "Søk i kunngjøringer på Brønnøysundregistrene" : "Search announcements on Brreg"}
        </a>
      </div>

      {/* Roles */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline text-lg font-semibold text-headline">
            {isNo ? "Roller" : "Roles"}
          </h3>
          <SourceLink href={`${brregEnhetUrl}/roller`} label={isNo ? "Enhetsregisteret" : "Entity Registry"} />
        </div>
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
                     {r.person && (r.person.fornavn || r.person.etternavn)
                       ? `${r.person.fornavn} ${r.person.etternavn}`.trim()
                       : r.enhet?.navn || (isNo ? "Ikke oppgitt" : "Not specified")}
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

      {/* Data source footer */}
      <div className="text-center py-2">
        <p className="text-[11px] text-muted-foreground font-body">
          {isNo ? "Data hentet fra" : "Data sourced from"}{" "}
          <a href="https://data.brreg.no" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Brønnøysundregistrene (data.brreg.no)
          </a>
          {" · "}
          <a href="https://www.brreg.no/om-oss/informasjonskapsler-og-personvern/" target="_blank" rel="noopener noreferrer" className="hover:underline">
            NLOD
          </a>
        </p>
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
