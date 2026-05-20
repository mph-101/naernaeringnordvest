import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUrlParam } from "@/lib/params";
import { ArrowLeft, Loader2, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import type { HjernevelvArticle, HjernevelvWriter } from "@/lib/hjernevelv";

const HjernevelvEssay = () => {
  const id = getUrlParam();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { language } = useTheme();
  const isNo = language === "no";

  const [article, setArticle] = useState<HjernevelvArticle | null>(null);
  const [writer, setWriter] = useState<HjernevelvWriter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !id) {
      if (!authLoading) setLoading(false);
      return;
    }
    (async () => {
      const { data: a } = await supabase
        .from("hjernevelv_articles" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      const articleRow = (a as unknown as HjernevelvArticle) || null;
      setArticle(articleRow);
      if (articleRow) {
        const { data: w } = await supabase
          .from("hjernevelv_writers" as any)
          .select("*")
          .eq("id", articleRow.writer_id)
          .maybeSingle();
        setWriter((w as unknown as HjernevelvWriter) || null);
      }
      setLoading(false);
    })();
  }, [id, isAuthenticated, authLoading]);

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
          <p className="text-muted-foreground font-body mb-4">{isNo ? "Logg inn for å lese essayet" : "Sign in to read the essay"}</p>
          <button onClick={() => navigate("/login")} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-subhead">
            {isNo ? "Logg inn" : "Sign in"}
          </button>
        </main>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center text-muted-foreground font-body">
          {isNo ? "Essayet finnes ikke" : "Essay not found"}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <article className="max-w-2xl mx-auto px-6 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> {isNo ? "Tilbake" : "Back"}
        </button>

        {article.topic && (
          <span className="inline-block text-xs uppercase tracking-wider text-accent font-subhead mb-2">
            {article.topic}
          </span>
        )}
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-headline leading-tight mb-4">
          {article.title}
        </h1>
        <p className="text-lg text-foreground/80 font-body leading-relaxed mb-6">{article.excerpt}</p>

        {writer && (
          <Link to={`/hjernevelvet/skribent/${writer.slug}`} className="flex items-center gap-3 mb-8 group">
            {writer.avatar_url ? (
              <img src={writer.avatar_url} alt={writer.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-headline text-muted-foreground">
                {writer.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
            )}
            <div>
              <div className="text-sm font-body text-foreground group-hover:text-accent transition">{writer.name}</div>
              <div className="text-xs text-muted-foreground font-body inline-flex items-center gap-1">
                {article.read_time && <><Clock className="w-3 h-3" /> {article.read_time}</>}
              </div>
            </div>
          </Link>
        )}

        {article.image_url && (
          <img src={article.image_url} alt={article.title} className="w-full rounded-2xl mb-8" />
        )}

        <div
          className="prose prose-lg max-w-none font-body text-foreground/90 prose-headings:font-headline prose-headings:text-headline prose-a:text-accent prose-p:leading-[1.6] prose-p:mt-0 prose-p:mb-[2.5em]"
          dangerouslySetInnerHTML={{ __html: article.body }}
        />
      </article>
    </div>
  );
};

export default HjernevelvEssay;
