import { Link } from "react-router-dom";
import { Clock, ArrowUpRight, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { PUBLISHED_ARTICLE_LIST_SELECT, toUiArticle } from "@/lib/article-data";
import type { ArticleSource } from "@/lib/articles-chat";

interface Card {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  author: string;
  type: "article" | "video" | "podcast";
  premium: boolean;
}

interface RelatedArticlesProps {
  /**
   * When provided, the strip mirrors the actual articles the conversation
   * answer is grounded in (the same `[n]` citations rendered above). When
   * empty/undefined we fall back to the latest published articles — real
   * stories only; the old curated mock list put fictional articles behind
   * a paywall, which is misleading for a publication built on accuracy.
   */
  sources?: ArticleSource[];
}

export function RelatedArticles({ sources }: RelatedArticlesProps = {}) {
  const { language } = useTheme();
  const t = translations[language];

  const usingLiveSources = Array.isArray(sources) && sources.length > 0;

  const { data: latestRows = [] } = useQuery({
    queryKey: ["related-articles-fallback"],
    enabled: !usingLiveSources,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(PUBLISHED_ARTICLE_LIST_SELECT)
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const cards: Card[] = usingLiveSources
    ? sources!.slice(0, 6).map((s) => ({
        id: s.id,
        title: s.title,
        excerpt: s.excerpt,
        category: language === "no" ? "Kilde i samtalen" : "Source in conversation",
        readTime: s.author || "",
        author: s.author,
        type: "article" as const,
        premium: false,
      }))
    : latestRows.map((row) => {
        const a = toUiArticle(row, language);
        return {
          id: a.id,
          title: a.title,
          excerpt: a.excerpt,
          category: a.category,
          readTime: a.readTime,
          author: a.author,
          type: a.type,
          premium: a.premium,
        };
      });

  const getTypeLabel = (type: Card["type"]) => {
    switch (type) {
      case "video":
        return t.video;
      case "podcast":
        return t.podcast;
      default:
        return t.article;
    }
  };

  if (cards.length === 0) return null;

  return (
    <section className="border-t border-border py-10">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          {/* Lora-tittelen bærer seksjonen alene — ikonflisen var SaaS-støy */}
          <h2 className="font-headline text-lg font-bold text-headline">
            {usingLiveSources
              ? language === "no" ? "Artikler brukt i svaret" : "Articles used in the answer"
              : language === "no" ? "Siste saker" : "Latest stories"}
          </h2>
          <Link
            to="/?view=feed"
            className="font-subhead text-sm text-accent-ink hover:text-link-hover transition-colors flex items-center gap-1 group"
          >
            {t.viewAll}
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((article, index) => (
            <Link
              key={article.id}
              to={`/article/${article.id}`}
              className="group block w-full text-left p-5 bg-card hover:bg-secondary/50 rounded-xl border border-border hover:border-accent/30 transition-all duration-300 card-interactive animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="font-subhead text-sm text-accent-ink font-medium">
                  {article.category}
                </span>
                {!usingLiveSources && (
                  <>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-sm text-muted-foreground font-body">
                      {getTypeLabel(article.type)}
                    </span>
                  </>
                )}
                {article.premium && (
                  <Lock className="w-3 h-3 text-muted-foreground ml-auto" />
                )}
              </div>

              <h3 className="font-headline text-base font-bold text-headline group-hover:text-accent-ink transition-colors mb-2 leading-snug line-clamp-2">
                {article.title}
              </h3>

              {article.excerpt && (
                <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4 line-clamp-2">
                  {article.excerpt}
                </p>
              )}

              <div className="flex items-center text-xs text-muted-foreground font-body">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                {article.readTime || (language === "no" ? "Les artikkel" : "Read article")}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
