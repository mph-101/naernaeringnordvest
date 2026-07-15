import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, TrendingUp, Eye, Users, Clock, Filter, Globe, Smartphone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Range = "7d" | "30d" | "90d";

interface TopArticle {
  article_id: string;
  title: string;
  region_slug: string | null;
  views: number;
  unique_sessions: number;
  avg_read_seconds: number;
  completion_rate: number;
}

interface DailyTraffic {
  day: string;
  views: number;
  unique_sessions: number;
  unique_users: number;
}

interface Breakdown {
  bucket: string;
  views: number;
  unique_sessions: number;
}

interface FunnelStep {
  step: string;
  step_order: number;
  user_count: number;
}

interface UserGrowth {
  day: string;
  new_signups: number;
  daily_active_users: number;
}

const FUNNEL_LABELS: Record<string, string> = {
  signup: "Registrert",
  onboarding_completed: "Fullført onboarding",
  article_read: "Lest første artikkel",
  paywall_viewed: "Sett paywall",
  subscription_started: "Startet abonnement",
};

function rangeToDates(range: Range) {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: new Date(to.getTime() + 1).toISOString(), days };
}

export const AnalyticsDashboard = () => {
  const { hasRole } = useAuth();
  const isStaffViewer = hasRole("admin") || hasRole("editor");
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);

  const [top, setTop] = useState<TopArticle[]>([]);
  const [daily, setDaily] = useState<DailyTraffic[]>([]);
  const [referrers, setReferrers] = useState<Breakdown[]>([]);
  const [devices, setDevices] = useState<Breakdown[]>([]);
  const [regions, setRegions] = useState<Breakdown[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [growth, setGrowth] = useState<UserGrowth[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { from, to } = rangeToDates(range);
      try {
        const [topRes, dailyRes, refRes, devRes, regRes, funRes, growthRes] = await Promise.all([
          supabase.rpc("analytics_top_articles", { _from: from, _to: to, _limit: 20 }),
          isStaffViewer
            ? supabase.rpc("analytics_daily_traffic", { _from: from, _to: to })
            : Promise.resolve({ data: [], error: null } as any),
          isStaffViewer
            ? supabase.rpc("analytics_breakdown", { _from: from, _to: to, _dimension: "referrer_host" })
            : Promise.resolve({ data: [], error: null } as any),
          isStaffViewer
            ? supabase.rpc("analytics_breakdown", { _from: from, _to: to, _dimension: "device_type" })
            : Promise.resolve({ data: [], error: null } as any),
          isStaffViewer
            ? supabase.rpc("analytics_breakdown", { _from: from, _to: to, _dimension: "region_slug" })
            : Promise.resolve({ data: [], error: null } as any),
          isStaffViewer
            ? supabase.rpc("analytics_conversion_funnel", { _from: from, _to: to })
            : Promise.resolve({ data: [], error: null } as any),
          isStaffViewer
            ? supabase.rpc("analytics_user_growth", { _from: from, _to: to })
            : Promise.resolve({ data: [], error: null } as any),
        ]);
        if (cancelled) return;
        setTop((topRes.data as TopArticle[]) || []);
        setDaily((dailyRes.data as DailyTraffic[]) || []);
        setReferrers((refRes.data as Breakdown[]) || []);
        setDevices((devRes.data as Breakdown[]) || []);
        setRegions((regRes.data as Breakdown[]) || []);
        setFunnel((funRes.data as FunnelStep[]) || []);
        setGrowth((growthRes.data as UserGrowth[]) || []);
      } catch (err) {
        console.error("analytics load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [range, isStaffViewer]);

  const totals = useMemo(() => {
    const views = top.reduce((sum, a) => sum + Number(a.views), 0);
    const sessions = daily.reduce((sum, d) => sum + Number(d.unique_sessions), 0);
    const users = daily.reduce((sum, d) => sum + Number(d.unique_users), 0);
    const avgRead =
      top.length > 0
        ? Math.round(top.reduce((s, a) => s + Number(a.avg_read_seconds), 0) / top.length)
        : 0;
    return { views, sessions, users, avgRead };
  }, [top, daily]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-headline">Lesere & brukere</h2>
          <p className="text-sm text-muted-foreground font-body">
            {isStaffViewer
              ? "Sidevisninger, lesetid, trafikkilder og konverteringstrakt mot abonnement."
              : "Statistikk for artikler du har skrevet."}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
          {(["7d", "30d", "90d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-sm font-body transition-colors ${
                range === r
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "7d" ? "7 dager" : r === "30d" ? "30 dager" : "90 dager"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {isStaffViewer && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard icon={Eye} label="Sidevisninger" value={totals.views.toLocaleString("nb-NO")} />
              <SummaryCard icon={Users} label="Unike økter" value={totals.sessions.toLocaleString("nb-NO")} />
              <SummaryCard icon={TrendingUp} label="Innloggede" value={totals.users.toLocaleString("nb-NO")} />
              <SummaryCard icon={Clock} label="Snitt lesetid" value={`${totals.avgRead}s`} />
            </div>
          )}

          <Tabs defaultValue="articles" className="w-full">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="articles">Artikler</TabsTrigger>
              {isStaffViewer && <TabsTrigger value="traffic">Trafikk</TabsTrigger>}
              {isStaffViewer && <TabsTrigger value="sources">Kilder & enheter</TabsTrigger>}
              {isStaffViewer && <TabsTrigger value="funnel">Konvertering</TabsTrigger>}
              {isStaffViewer && <TabsTrigger value="users">Brukervekst</TabsTrigger>}
            </TabsList>

            <TabsContent value="articles" className="mt-4">
              <TopArticlesTable items={top} />
            </TabsContent>

            {isStaffViewer && (
              <TabsContent value="traffic" className="mt-4">
                <SparkBars
                  title="Daglig trafikk"
                  series={daily.map((d) => ({
                    label: new Date(d.day).toLocaleDateString("nb-NO", { day: "2-digit", month: "short" }),
                    value: Number(d.views),
                    sub: `${d.unique_sessions} økter`,
                  }))}
                />
              </TabsContent>
            )}

            {isStaffViewer && (
              <TabsContent value="sources" className="mt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <BreakdownCard icon={Globe} title="Trafikkilder" items={referrers} />
                  <BreakdownCard icon={Smartphone} title="Enheter" items={devices} />
                  <BreakdownCard icon={MapPin} title="Regioner" items={regions} />
                </div>
              </TabsContent>
            )}

            {isStaffViewer && (
              <TabsContent value="funnel" className="mt-4">
                <FunnelView steps={funnel} />
              </TabsContent>
            )}

            {isStaffViewer && (
              <TabsContent value="users" className="mt-4">
                <SparkBars
                  title="Nye registreringer & DAU"
                  series={growth.map((d) => ({
                    label: new Date(d.day).toLocaleDateString("nb-NO", { day: "2-digit", month: "short" }),
                    value: Number(d.daily_active_users),
                    sub: `${d.new_signups} nye`,
                  }))}
                />
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) => (
  <div className="p-4 rounded-xl bg-card border border-border shadow-soft">
    <div className="flex items-center gap-2 text-muted-foreground mb-1">
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs font-body uppercase tracking-wider">{label}</span>
    </div>
    <p className="font-headline text-2xl font-semibold text-headline">{value}</p>
  </div>
);

const TopArticlesTable = ({ items }: { items: TopArticle[] }) => {
  if (!items.length) {
    return (
      <div className="p-8 text-center text-muted-foreground font-body bg-muted/20 rounded-lg border border-border">
        Ingen sidevisninger registrert i denne perioden ennå.
      </div>
    );
  }
  const max = Math.max(...items.map((i) => Number(i.views)), 1);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-12 px-4 py-2.5 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground font-body">
        <div className="col-span-6">Artikkel</div>
        <div className="col-span-2 text-right">Visninger</div>
        <div className="col-span-2 text-right">Snitt lesetid</div>
        <div className="col-span-2 text-right">Fullført</div>
      </div>
      <div className="divide-y divide-border">
        {items.map((a) => (
          <a
            key={a.article_id}
            href={`/article/${a.article_id}`}
            target="_blank"
            rel="noreferrer"
            className="grid grid-cols-12 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
          >
            <div className="col-span-6 min-w-0">
              <div className="font-body text-sm text-foreground truncate">{a.title}</div>
              {a.region_slug && (
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {a.region_slug}
                </div>
              )}
              <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(Number(a.views) / max) * 100}%` }}
                />
              </div>
            </div>
            <div className="col-span-2 text-right font-body text-sm text-foreground">
              {Number(a.views).toLocaleString("nb-NO")}
              <div className="text-xs text-muted-foreground">{a.unique_sessions} unike</div>
            </div>
            <div className="col-span-2 text-right font-body text-sm text-foreground">
              {Math.round(Number(a.avg_read_seconds))}s
            </div>
            <div className="col-span-2 text-right font-body text-sm text-foreground">
              {Number(a.completion_rate).toFixed(0)}%
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const SparkBars = ({
  title,
  series,
}: {
  title: string;
  series: { label: string; value: number; sub: string }[];
}) => {
  if (!series.length) {
    return <div className="p-6 text-center text-muted-foreground bg-muted/20 rounded-lg">Ingen data.</div>;
  }
  const max = Math.max(...series.map((s) => s.value), 1);
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <h3 className="font-subhead text-sm font-medium text-foreground mb-3">{title}</h3>
      <div className="flex items-end gap-1 h-40">
        {series.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
            <div className="text-[0.625rem] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {s.value}
            </div>
            <div
              className="w-full bg-primary/70 group-hover:bg-primary rounded-t transition-colors"
              style={{ height: `${Math.max(2, (s.value / max) * 100)}%` }}
              title={`${s.label}: ${s.value} (${s.sub})`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[0.625rem] text-muted-foreground">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
};

const BreakdownCard = ({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: Breakdown[];
}) => {
  const max = Math.max(...items.map((i) => Number(i.views)), 1);
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-subhead text-sm font-medium text-foreground">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body">Ingen data.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 8).map((b) => (
            <li key={b.bucket} className="text-sm font-body">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-foreground truncate pr-2">{b.bucket}</span>
                <span className="text-muted-foreground tabular-nums">{Number(b.views).toLocaleString("nb-NO")}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${(Number(b.views) / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const FunnelView = ({ steps }: { steps: FunnelStep[] }) => {
  if (!steps.length) {
    return <div className="p-6 text-center text-muted-foreground bg-muted/20 rounded-lg">Ingen hendelser registrert ennå.</div>;
  }
  const max = Math.max(...steps.map((s) => Number(s.user_count)), 1);
  const first = Number(steps[0]?.user_count) || 1;
  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
      <h3 className="font-subhead text-sm font-medium text-foreground mb-1">
        Brukerreise mot abonnement
      </h3>
      {steps.map((s, i) => {
        const pct = (Number(s.user_count) / max) * 100;
        const conv = i === 0 ? 100 : (Number(s.user_count) / first) * 100;
        return (
          <div key={s.step}>
            <div className="flex justify-between text-sm font-body mb-1">
              <span className="text-foreground">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                {FUNNEL_LABELS[s.step] || s.step}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {Number(s.user_count).toLocaleString("nb-NO")}{" "}
                <span className="text-xs">({conv.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
