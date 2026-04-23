import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Zap, Droplets, Banknote, Percent, Bitcoin, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

interface MarketData {
  updated_at: string;
  power: { zone: string; ore_per_kwh: number }[] | null;
  fx: { code: string; nok: number }[] | null;
  policy_rate: { rate: number } | null;
  brent: { usd: number } | null;
  btc: { nok: number; change_24h: number | null } | null;
}

interface TickerItem {
  icon: typeof Zap;
  label: string;
  value: string;
  change?: number | null;
  sourceLabel: string;
  sourceUrl: string;
}

const REFRESH_MS = 5 * 60 * 1000;

const fmtNok = (n: number) =>
  new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(n);

const fmtDec = (n: number, d = 2) =>
  new Intl.NumberFormat("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

const SOURCES = {
  power: { label: "hvakosterstrommen.no", url: "https://www.hvakosterstrommen.no/strompris-api" },
  brent: { label: "Stooq", url: "https://stooq.com/q/?s=cb.f" },
  fx: { label: "Norges Bank", url: "https://www.norges-bank.no/tema/Statistikk/Valutakurser/" },
  rate: { label: "Norges Bank", url: "https://www.norges-bank.no/tema/pengepolitikk/Styringsrenten/" },
  btc: { label: "CoinGecko", url: "https://www.coingecko.com/en/coins/bitcoin" },
} as const;

export const MarketTicker = () => {
  const { language } = useTheme();
  const isNo = language === "no";
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke("market-data");
        if (cancelled) return;
        if (error) {
          console.warn("market-data error", error);
          setData(null);
        } else {
          setData(result as MarketData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="border-b border-border bg-card/40 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 py-1.5">
          <div className="text-xs text-muted-foreground font-body animate-pulse">
            {isNo ? "Henter markedstall…" : "Loading market data…"}
          </div>
        </div>
      </div>
    );
  }

  const items: TickerItem[] = [];

  // Power: average of available zones + show NO1/NO2/NO5 separately
  if (data.power && data.power.length > 0) {
    const avg =
      data.power.reduce((sum, p) => sum + p.ore_per_kwh, 0) / data.power.length;
    items.push({
      icon: Zap,
      label: isNo ? "Strøm (snitt)" : "Power (avg)",
      value: `${fmtDec(avg, 1)} øre/kWh`,
      sourceLabel: SOURCES.power.label,
      sourceUrl: SOURCES.power.url,
    });
    data.power.forEach((p) => {
      items.push({
        icon: Zap,
        label: p.zone,
        value: `${fmtDec(p.ore_per_kwh, 1)} øre`,
        sourceLabel: SOURCES.power.label,
        sourceUrl: SOURCES.power.url,
      });
    });
  }

  if (data.brent) {
    items.push({
      icon: Droplets,
      label: "Brent",
      value: `$${fmtDec(data.brent.usd, 2)}`,
      sourceLabel: SOURCES.brent.label,
      sourceUrl: SOURCES.brent.url,
    });
  }

  if (data.fx) {
    data.fx.forEach((f) => {
      items.push({
        icon: Banknote,
        label: `${f.code}/NOK`,
        value: fmtDec(f.nok, 4),
        sourceLabel: SOURCES.fx.label,
        sourceUrl: SOURCES.fx.url,
      });
    });
  }

  if (data.policy_rate) {
    items.push({
      icon: Percent,
      label: isNo ? "Styringsrente" : "Policy rate",
      value: `${fmtDec(data.policy_rate.rate, 2)} %`,
      sourceLabel: SOURCES.rate.label,
      sourceUrl: SOURCES.rate.url,
    });
  }

  if (data.btc) {
    items.push({
      icon: Bitcoin,
      label: "BTC",
      value: `${fmtNok(data.btc.nok)} kr`,
      change: data.btc.change_24h,
      sourceLabel: SOURCES.btc.label,
      sourceUrl: SOURCES.btc.url,
    });
  }

  if (items.length === 0) return null;

  // Duplicate for seamless marquee scroll
  const loop = [...items, ...items];

  return (
    <div
      className="border-b border-border bg-card/40 overflow-hidden group"
      aria-label={isNo ? "Markedstall i sanntid" : "Live market data"}
    >
      <div className="relative flex overflow-hidden whitespace-nowrap">
        <div className="flex animate-marquee gap-8 py-2 px-6 group-hover:[animation-play-state:paused]">
          {loop.map((item, i) => {
            const Icon = item.icon;
            const ChangeIcon =
              item.change == null
                ? null
                : item.change > 0
                ? TrendingUp
                : item.change < 0
                ? TrendingDown
                : Minus;
            const changeColor =
              item.change == null
                ? ""
                : item.change > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : item.change < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground";
            return (
              <div
                key={`${item.label}-${i}`}
                className="flex items-center gap-2 text-xs font-body"
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.value}</span>
                {ChangeIcon && item.change != null && (
                  <span className={`flex items-center gap-0.5 ${changeColor}`}>
                    <ChangeIcon className="w-3 h-3" />
                    {fmtDec(Math.abs(item.change), 2)}%
                  </span>
                )}
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors border-l border-border/60 pl-2 ml-1"
                  title={isNo ? `Kilde: ${item.sourceLabel}` : `Source: ${item.sourceLabel}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>{isNo ? "Kilde:" : "Source:"} {item.sourceLabel}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};