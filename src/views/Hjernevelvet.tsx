import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brain, MapPin, Calendar, Users, ArrowRight, Loader2, MessageSquare } from "lucide-react";
import { Header } from "@/components/Header";
import { ViewToggle } from "@/components/ViewToggle";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { fetchRegions, type EditorialRegion } from "@/lib/regions";
import {
  type HjernevelvArticle,
  type HjernevelvPanel,
  type HjernevelvWriter,
  FORMAT_LABEL,
  STATUS_LABEL,
  formatPanelDate,
} from "@/lib/hjernevelv";

const Hjernevelvet = () => {
  const { isAuthenticated, loading: authLoading, userId } = useAuth();
  const { language } = useTheme();
  const navigate = useNavigate();
  const isNo = language === "no";

  const [regions, setRegions] = useState<EditorialRegion[]>([]);
  const [activeRegion, setActiveRegion] = useState<string | "all">("all");
  const [writers, setWriters] = useState<HjernevelvWriter[]>([]);
  const [articles, setArticles] = useState<HjernevelvArticle[]>([]);
  const [panels, setPanels] = useState<HjernevelvPanel[]>([]);
  const [loading, setLoading] = useState(true);

  const t = isNo
    ? {
        title: "Hjernevelvet",
        tagline: "Eksterne stemmer fra norsk næringsliv. Kvartalsvise paneler. Regional dybde.",
        loginRequired: "Hjernevelvet er for innloggede lesere",
        loginCta: "Logg inn",
        regions: "Region", all: "Hele landet",
        upcoming: "Kommende paneler", past: "Tidligere paneler", noPanels: "Ingen paneler planlagt enda.",
        writers: "Skribenter", noWriters: "Ingen aktive skribenter ennå.",
        essays: "Siste essays", noEssays: "Ingen essays publisert ennå.",
        readEssay: "Les essay", joinPanel: "Se panel", expertise: "Fagområder",
      }
    : {
        title: "The Mind Vault",
        tagline: "External voices from Norwegian business. Quarterly panels. Regional depth.",
        loginRequired: "The Mind Vault is for signed-in readers",
        loginCta: "Sign in",
        regions: "Region", all: "All regions",
        upcoming: "Upcoming panels", past: "Past panels", noPanels: "No panels scheduled yet.",
        writers: "Writers", noWriters: "No active writers yet.",
        essays: "Latest essays", noEssays: "No essays published yet.",
        readEssay: "Read essay", joinPanel: "View panel", expertise: "Fields",
      };

  // Load regions once
  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => {});
  }, []);

  // Load content (only when signed in — RLS blocks anon)
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [w, a, p] = await Promise.all([
        supabase
          .from("hjernevelv_writers" as any)
          .select("*")
          .eq("active", true)
          .order("name", { ascending: true }),
        supabase
          .from("hjernevelv_articles" as any)
          .select("*")
          .eq("published", true)
          .order("published_at", { ascending: false })
          .limit(30),
        supabase
          .from("hjernevelv_panels" as any)
          .select("*")
          .neq("status", "planned")
          .order("scheduled_at", { ascending: true })
          .limit(30),
      ]);
      if (cancelled) return;
      setWriters((w.data as unknown as HjernevelvWriter[]) ?? []);
      setArticles((a.data as unknown as HjernevelvArticle[]) ?? []);
      setPanels((p.data as unknown as HjernevelvPanel[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, userId]);

  const filtered = useMemo(() => {
    const match = (slug: string | null) => activeRegion === "all" || slug === activeRegion;
    const now = new Date();
    return {
      writers: writers.filter((w) => match(w.region_slug)),
      articles: articles.filter((a) => match(a.region_slug)),
      upcomingPanels: panels.filter((p) => match(p.region_slug) && new Date(p.scheduled_at) >= now),
      pastPanels: panels.filter((p) => match(p.region_slug) && new Date(p.scheduled_at) < now),
    };
  }, [writers, articles, panels, activeRegion]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <ViewToggle view="feed" onViewChange={() => {}} />
        <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <ViewToggle view="feed" onViewChange={() => {}} />
        <main className="max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 text-accent mb-5">
            <Brain className="w-8 h-8" />
          </div>
          <h1 className="font-headline text-3xl font-bold text-headline mb-3">{t.title}</h1>
          <p className="text-muted-foreground font-body mb-8">{t.tagline}</p>
          <div className="bg-card border border-border rounded-xl p-6 inline-block">
            <p className="text-sm font-body text-foreground mb-4">{t.loginRequired}</p>
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-subhead text-sm font-medium hover:opacity-90 transition"
            >
              {t.loginCta}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <ViewToggle view="feed" onViewChange={() => {}} />
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-subhead uppercase tracking-wider mb-3">
            <Brain className="w-3.5 h-3.5" />
            {t.title}
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-headline mb-3 leading-tight">
            {t.title}
          </h1>
          <p className="text-lg text-muted-foreground font-body max-w-2xl">{t.tagline}</p>
        </header>

        {/* Region tabs */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 -mx-6 px-6">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-subhead uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
            {t.regions}:
          </span>
          <button
            onClick={() => setActiveRegion("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-subhead whitespace-nowrap transition border ${
              activeRegion === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-foreground/80 hover:border-primary/30"
            }`}
          >
            {t.all}
          </button>
          {regions.map((r) => (
            <button
              key={r.slug}
              onClick={() => setActiveRegion(r.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-subhead whitespace-nowrap transition border ${
                activeRegion === r.slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground/80 hover:border-primary/30"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-14">
            {/* Upcoming panels */}
            <section>
              <h2 className="font-headline text-2xl font-semibold text-headline mb-5 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                {t.upcoming}
              </h2>
              {filtered.upcomingPanels.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">{t.noPanels}</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filtered.upcomingPanels.map((p) => (
                    <Link
                      key={p.id}
                      to={`/hjernevelvet/panel/${p.id}`}
                      className="group block bg-card border border-border rounded-2xl p-6 hover:border-accent/40 card-interactive transition"
                    >
                      <div className="flex items-center gap-2 text-xs font-subhead text-accent mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-accent/10">
                          {FORMAT_LABEL[p.format][language]}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {STATUS_LABEL[p.status][language]}
                        </span>
                      </div>
                      <h3 className="font-headline text-lg font-semibold text-headline mb-1 group-hover:text-accent transition">
                        {p.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-body mb-3">
                        {formatPanelDate(p.scheduled_at, language)}
                      </p>
                      {p.description && (
                        <p className="text-sm text-foreground/80 font-body line-clamp-2">{p.description}</p>
                      )}
                      <div className="mt-4 inline-flex items-center gap-1 text-sm font-subhead text-accent">
                        {t.joinPanel} <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Writers */}
            <section>
              <h2 className="font-headline text-2xl font-semibold text-headline mb-5 flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                {t.writers}
              </h2>
              {filtered.writers.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">{t.noWriters}</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.writers.map((w) => (
                    <Link
                      key={w.id}
                      to={`/hjernevelvet/skribent/${w.slug}`}
                      className="group block bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {w.avatar_url ? (
                          <img src={w.avatar_url} alt={w.name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-headline text-muted-foreground">
                            {w.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-headline text-sm font-semibold text-headline group-hover:text-accent transition truncate">
                            {w.name}
                          </div>
                          {w.region_slug && (
                            <div className="text-xs text-muted-foreground font-body truncate">
                              {regions.find((r) => r.slug === w.region_slug)?.name}
                            </div>
                          )}
                        </div>
                      </div>
                      {w.bio && (
                        <p className="text-xs text-foreground/80 font-body line-clamp-3 mb-3">{w.bio}</p>
                      )}
                      {w.expertise.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {w.expertise.slice(0, 3).map((e) => (
                            <span key={e} className="text-[0.625rem] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-subhead">
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Essays */}
            <section>
              <h2 className="font-headline text-2xl font-semibold text-headline mb-5 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" />
                {t.essays}
              </h2>
              {filtered.articles.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">{t.noEssays}</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filtered.articles.map((a) => {
                    const writer = writers.find((w) => w.id === a.writer_id);
                    return (
                      <Link
                        key={a.id}
                        to={`/hjernevelvet/essay/${a.id}`}
                        className="group block bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/40 card-interactive transition"
                      >
                        {a.image_url && (
                          <div className="h-40 w-full overflow-hidden">
                            <img src={a.image_url} alt={a.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-5">
                          {a.topic && (
                            <span className="inline-block text-[0.625rem] uppercase tracking-wider text-accent font-subhead mb-2">
                              {a.topic}
                            </span>
                          )}
                          <h3 className="font-headline text-lg font-semibold text-headline mb-2 group-hover:text-accent transition leading-snug">
                            {a.title}
                          </h3>
                          <p className="text-sm text-muted-foreground font-body line-clamp-2 mb-3">{a.excerpt}</p>
                          {writer && (
                            <div className="text-xs text-muted-foreground font-body">
                              {isNo ? "Av" : "By"} <span className="text-foreground">{writer.name}</span>
                              {a.read_time && <> · {a.read_time}</>}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Past panels */}
            {filtered.pastPanels.length > 0 && (
              <section>
                <h2 className="font-headline text-xl font-semibold text-headline mb-4">{t.past}</h2>
                <ul className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
                  {filtered.pastPanels.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/hjernevelvet/panel/${p.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40 transition"
                      >
                        <div className="min-w-0">
                          <div className="font-body text-sm text-foreground truncate">{p.title}</div>
                          <div className="text-xs text-muted-foreground">{formatPanelDate(p.scheduled_at, language)}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Hjernevelvet;
