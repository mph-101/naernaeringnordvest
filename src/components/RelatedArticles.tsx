import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ArrowUpRight, Lock, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import type { ArticleSource } from "@/lib/articles-chat";

interface Article {
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
   * empty/undefined we fall back to the curated mock list so the section
   * still has content on the static landing.
   */
  sources?: ArticleSource[];
}

export function RelatedArticles({ sources }: RelatedArticlesProps = {}) {
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const { language } = useTheme();
  const t = translations[language];

  const usingLiveSources = Array.isArray(sources) && sources.length > 0;
  const liveArticles: Article[] = usingLiveSources
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
    : [];
  const mockArticles: Article[] = usingLiveSources
    ? liveArticles
    : t.relatedArticles.map((item, index) => ({
        ...item,
        type: index === 1 ? "podcast" : "article",
        premium: true,
      }));

  const handleArticleClick = (article: Article) => {
    if (usingLiveSources) return; // handled by <Link> wrapper
    if (article.premium) {
      setSelectedArticle(article);
      setShowPaywall(true);
    }
  };

  const getTypeLabel = (type: Article["type"]) => {
    switch (type) {
      case "video":
        return t.video;
      case "podcast":
        return t.podcast;
      default:
        return t.article;
    }
  };

  return (
    <>
      <section className="border-t border-border py-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent-ink" />
              </div>
              <h2 className="font-headline text-lg font-bold text-headline">
                {usingLiveSources
                  ? language === "no" ? "Artikler brukt i svaret" : "Articles used in the answer"
                  : t.relatedCoverage}
              </h2>
            </div>
            <Link
              to="/?view=feed"
              className="font-subhead text-sm text-accent-ink hover:text-link-hover transition-colors flex items-center gap-1 group"
            >
              {t.viewAll}
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {mockArticles.map((article, index) => {
              const inner = (
                <>
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
                </>
              );
              const cls = "group block w-full text-left p-5 bg-card hover:bg-secondary/50 rounded-xl border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-soft animate-fade-up";
              const style = { animationDelay: `${index * 100}ms` } as const;
              return usingLiveSources ? (
                <Link key={article.id} to={`/article/${article.id}`} className={cls} style={style}>
                  {inner}
                </Link>
              ) : (
                <button
                  key={article.id}
                  onClick={() => handleArticleClick(article)}
                  className={cls}
                  style={style}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Paywall-modal — Radix Dialog gir dialog-rolle, aria-modal, fokusfelle,
          Escape og navngitt lukkeknapp; den håndrullede varianten manglet alt. */}
      <Dialog open={showPaywall && !!selectedArticle} onOpenChange={(open) => { if (!open) setShowPaywall(false); }}>
        <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-subhead text-sm text-accent-ink font-medium">
                    {selectedArticle.category}
                  </span>
                </div>
                <DialogTitle className="font-headline text-lg font-bold text-headline leading-snug mb-2">
                  {selectedArticle.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground font-body">
                  {language === "no" ? "Av" : "By"} {selectedArticle.author} · {selectedArticle.readTime}
                </DialogDescription>
              </div>

              <div className="p-6">
                <p className="text-muted-foreground font-body leading-relaxed mb-6">
                  {selectedArticle.excerpt}
                </p>

                <div className="relative">
                  <p className="text-foreground font-body leading-relaxed line-clamp-4">
                    {selectedArticle.excerpt}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent" />
                </div>
              </div>

              <div className="p-6 bg-surface-subtle rounded-b-2xl border-t border-border">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-6 h-6 text-accent-ink" />
                  </div>
                  <h4 className="font-headline text-lg font-bold text-headline mb-2">
                    {t.subscribeTitle}
                  </h4>
                  <p className="text-sm text-muted-foreground font-body">
                    {t.subscribeDesc}
                  </p>
                </div>

                <div className="space-y-3">
                  <button className="w-full py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
                    {t.subscribeButton}
                  </button>
                  <button className="w-full py-3 bg-card border border-border text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary transition-colors">
                    {t.signIn}
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
