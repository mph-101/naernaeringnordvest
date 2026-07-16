import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUrlParam } from "@/lib/params";
import { ArrowLeft, Globe, Linkedin, Twitter, Loader2, MapPin } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import type { HjernevelvArticle, HjernevelvWriter } from "@/lib/hjernevelv";

const HjernevelvWriterPage = () => {
  const slug = getUrlParam();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { language } = useTheme();
  const isNo = language === "no";

  const [writer, setWriter] = useState<HjernevelvWriter | null>(null);
  const [articles, setArticles] = useState<HjernevelvArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !slug) {
      if (!authLoading) setLoading(false);
      return;
    }
    (async () => {
      const { data: w } = await supabase
        .from("hjernevelv_writers" as any)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      const writerRow = (w as unknown as HjernevelvWriter) || null;
      setWriter(writerRow);
      if (writerRow) {
        const { data: a } = await supabase
          .from("hjernevelv_articles" as any)
          .select("*")
          .eq("writer_id", writerRow.id)
          .eq("published", true)
          .order("published_at", { ascending: false });
        setArticles(((a as unknown as HjernevelvArticle[]) || []));
      }
      setLoading(false);
    })();
  }, [slug, isAuthenticated, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="text-muted-foreground font-body mb-4">{isNo ? "Logg inn for å se denne siden" : "Sign in to view this page"}</p>
          <button onClick={() => navigate("/login")} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-subhead">
            {isNo ? "Logg inn" : "Sign in"}
          </button>
        </main>
      </div>
    );
  }

  if (!writer) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center text-muted-foreground font-body">
          {isNo ? "Skribent ikke funnet" : "Writer not found"}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> {isNo ? "Tilbake" : "Back"}
        </button>

        <header className="flex flex-col sm:flex-row gap-5 items-start mb-8">
          {writer.avatar_url ? (
            <img src={writer.avatar_url} alt={writer.name} className="w-24 h-24 rounded-2xl object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center text-2xl font-headline text-muted-foreground">
              {writer.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-headline text-3xl font-bold text-headline mb-1">{writer.name}</h1>
            {writer.region_slug && (
              <div className="inline-flex items-center gap-1 text-xs text-muted-foreground font-body mb-3">
                <MapPin className="w-3 h-3" /> {writer.region_slug}
              </div>
            )}
            {writer.bio && <p className="text-foreground/85 font-body leading-relaxed">{writer.bio}</p>}
            <div className="flex flex-wrap gap-2 mt-4">
              {writer.expertise.map((e) => (
                <span key={e} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-subhead">
                  {e}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
              {writer.website_url && <a href={writer.website_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><Globe className="w-4 h-4" /></a>}
              {writer.linkedin_url && <a href={writer.linkedin_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><Linkedin className="w-4 h-4" /></a>}
              {writer.twitter_url && <a href={writer.twitter_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><Twitter className="w-4 h-4" /></a>}
            </div>
          </div>
        </header>

        <section>
          <h2 className="font-headline text-xl font-semibold text-headline mb-4">{isNo ? "Essays" : "Essays"}</h2>
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body">{isNo ? "Ingen publiserte essays ennå." : "No published essays yet."}</p>
          ) : (
            <ul className="space-y-3">
              {articles.map((a) => (
                <li key={a.id}>
                  <Link to={`/hjernevelvet/essay/${a.id}`} className="block bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition">
                    {a.topic && <span className="text-xs text-accent-ink font-subhead font-medium">{a.topic}</span>}
                    <h3 className="font-headline text-lg font-semibold text-headline mt-1 mb-1">{a.title}</h3>
                    <p className="text-sm text-muted-foreground font-body line-clamp-2">{a.excerpt}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default HjernevelvWriterPage;
