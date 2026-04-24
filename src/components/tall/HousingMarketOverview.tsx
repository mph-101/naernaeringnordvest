import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { fetchRegions, regionLabel, EditorialRegion } from "@/lib/regions";
import { Home, Hammer, Landmark, ExternalLink, Newspaper, Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface SsbPoint { value: number; period: string }
interface HousingData {
  region: string;
  scope?: string;
  updated_at: string;
  priceIndex: SsbPoint | null;
  priceIndexYoy: SsbPoint | null;
  housingStarts: SsbPoint | null;
  householdDebt: SsbPoint | null;
}

interface ArticleRow {
  id: string;
  title: string;
  excerpt: string;
  published_at: string | null;
  category: string;
  region_slug: string | null;
}

const KEYWORDS = [
  "boligmarked", "boligpris", "boligpriser", "bolig", "eiendom",
  "boliglån", "boligbygging", "boligbygger", "leiemarked", "husleie",
  "rentehopp", "boliglånsrente", "eiendomsmegler", "boligkjøp",
];

const fmtNumber = (n: number, isNo: boolean, digits = 0) =>
  new Intl.NumberFormat(isNo ? "nb-NO" : "en-US", {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(n);

const SOURCES = {
  priceIndex:    { label: "SSB tabell 07221", url: "https://www.ssb.no/statbank/table/07221" },
  priceIndexYoy: { label: "SSB tabell 07221", url: "https://www.ssb.no/statbank/table/07221" },
  housingStarts: { label: "SSB tabell 05940", url: "https://www.ssb.no/statbank/table/05940" },
  householdDebt: { label: "SSB tabell 10945", url: "https://www.ssb.no/statbank/table/10945" },
};

export function HousingMarketOverview() {
  const { language, region: profileRegion } = useTheme();
  const isNo = language === "no";
  const [regions, setRegions] = useState<EditorialRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>(profileRegion || "nasjonal");
  const [data, setData] = useState<HousingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => setRegions([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase.functions.invoke("ssb-housing", { body: { region: selectedRegion } })
      .then(({ data: result, error }) => {
        if (cancelled) return;
        if (error) { console.warn("ssb-housing error", error); setData(null); }
        else setData(result as HousingData);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedRegion]);

  useEffect(() => {
    let cancelled = false;
    setArticlesLoading(true);
    const orFilter = KEYWORDS.map((k) => `title.ilike.%${k}%,excerpt.ilike.%${k}%`).join(",");
    let q = supabase
      .from("articles")
      .select("id, title, excerpt, published_at, category, region_slug")
      .eq("published", true)
      .or(orFilter)
      .order("published_at", { ascending: false })
      .limit(8);
    if (selectedRegion && selectedRegion !== "nasjonal") {
      q = q.or(`region_slug.eq.${selectedRegion},region_slug.is.null`);
    }
    q.then(({ data: rows, error }) => {
      if (cancelled) return;
      if (error) { console.warn("articles fetch error", error); setArticles([]); }
      else setArticles((rows || []) as ArticleRow[]);
    }).then(() => { if (!cancelled) setArticlesLoading(false); });
    return () => { cancelled = true; };
  }, [selectedRegion]);

  const regionName = useMemo(
    () => regionLabel(regions, selectedRegion) || (isNo ? "Nasjonalt" : "National"),
    [regions, selectedRegion, isNo]
  );

  const yoyValue = data?.priceIndexYoy?.value ?? null;
  const YoyIcon = yoyValue != null && yoyValue < 0 ? TrendingDown : TrendingUp;

  const metrics = [
    {
      key: "priceIndex",
      icon: Home,
      label: isNo ? "Boligprisindeks" : "House price index",
      point: data?.priceIndex,
      format: (v: number) => `${fmtNumber(v, isNo, 1)}`,
      help: isNo ? "Brukte boliger, 2015=100" : "Used homes, 2015=100",
    },
    {
      key: "priceIndexYoy",
      icon: YoyIcon,
      label: isNo ? "Endring siste år" : "Year-over-year change",
      point: data?.priceIndexYoy,
      format: (v: number) => `${v >= 0 ? "+" : ""}${fmtNumber(v, isNo, 1)} %`,
      help: isNo ? "Boligprisindeks vs samme kvartal i fjor" : "House price index vs same quarter last year",
    },
    {
      key: "housingStarts",
      icon: Hammer,
      label: isNo ? "Igangsatte boliger" : "Housing starts",
      point: data?.housingStarts,
      format: (v: number) => `${fmtNumber(v, isNo, 0)}`,
      help: isNo ? "Antall boliger siste år (nasjonalt)" : "Dwellings started last year (national)",
    },
    {
      key: "householdDebt",
      icon: Landmark,
      label: isNo ? "Husholdningsgjeld (K2)" : "Household debt (K2)",
      point: data?.householdDebt,
      format: (v: number) => `${fmtNumber(v, isNo, 1)} %`,
      help: isNo ? "12-måneders vekst (nasjonalt)" : "12-month growth (national)",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-headline">
            {isNo ? "Boligmarkedet" : "Housing market"} — {regionName}
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            {isNo
              ? "Boligpriser, igangsetting og gjeldsvekst fra SSB."
              : "House prices, construction starts and household debt from SSB."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-subhead text-muted-foreground">
            {isNo ? "Region" : "Region"}
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm font-body text-foreground focus:outline-none focus:border-accent transition-colors"
          >
            {regions.map((r) => (
              <option key={r.slug} value={r.slug}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          const src = SOURCES[m.key as keyof typeof SOURCES];
          return (
            <div key={m.key} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <Icon className="w-4 h-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-subhead text-sm text-headline">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground font-body truncate">{m.help}</p>
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : m.point ? (
                  <>
                    <span className="font-headline text-2xl font-bold text-headline">
                      {m.format(m.point.value)}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-body">{m.point.period}</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground font-body">{isNo ? "Ikke tilgjengelig" : "Not available"}</span>
                )}
              </div>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-auto pt-2 border-t border-border/60"
              >
                <span>{isNo ? "Kilde:" : "Source:"} {src.label}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          );
        })}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Newspaper className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-headline text-lg font-bold text-headline">
            {isNo ? "Saker om boligmarkedet" : "Housing market stories"}
          </h3>
        </div>
        {articlesLoading ? (
          <p className="text-sm text-muted-foreground font-body py-6 text-center">
            {isNo ? "Laster saker..." : "Loading stories..."}
          </p>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body py-6 text-center">
            {isNo ? "Ingen saker funnet enda." : "No stories yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {articles.map((a) => (
              <Link
                key={a.id}
                to={`/article/${a.id}`}
                className="bg-card border border-border rounded-xl p-4 hover:border-accent transition-colors block"
              >
                <p className="font-subhead font-medium text-sm text-headline line-clamp-2">{a.title}</p>
                <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-2">{a.excerpt}</p>
                <p className="text-[11px] text-muted-foreground font-body mt-2">
                  {a.category}
                  {a.published_at && ` · ${new Date(a.published_at).toLocaleDateString(isNo ? "nb-NO" : "en-US", { day: "numeric", month: "short" })}`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}