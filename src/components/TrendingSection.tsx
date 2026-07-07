import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Flame } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { PUBLISHED_ARTICLE_LIST_SELECT, toUiArticle, type UiArticle } from "@/lib/article-data";

export function TrendingSection() {
  const { language } = useTheme();
  const navigate = useNavigate();
  const [trending, setTrending] = useState<UiArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // 1) Top viewed in last 7 days
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: views } = await supabase
        .from("article_views")
        .select("article_id")
        .gte("viewed_at", since);

      const counts = new Map<string, number>();
      (views ?? []).forEach((v: any) => {
        if (!v.article_id) return;
        counts.set(v.article_id, (counts.get(v.article_id) ?? 0) + 1);
      });
      const topIds = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id)
        .slice(0, 12);

      let articles: any[] = [];
      if (topIds.length > 0) {
        const { data } = await supabase
          .from("articles")
          .select(PUBLISHED_ARTICLE_LIST_SELECT)
          .eq("published", true)
          .in("id", topIds);
        const order = new Map(topIds.map((id, i) => [id, i]));
        articles = (data ?? []).sort(
          (a: any, b: any) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99),
        );
      }

      // 2) Fallback / fill with most recently published
      if (articles.length < 4) {
        const { data: recent } = await supabase
          .from("articles")
          .select(PUBLISHED_ARTICLE_LIST_SELECT)
          .eq("published", true)
          .order("published_at", { ascending: false })
          .limit(8);
        const have = new Set(articles.map((a) => a.id));
        (recent ?? []).forEach((a: any) => {
          if (!have.has(a.id) && articles.length < 4) {
            articles.push(a);
            have.add(a.id);
          }
        });
      }

      if (cancelled) return;
      setTrending(articles.slice(0, 4).map((a) => toUiArticle(a, language)));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);

  if (loading || trending.length === 0) return null;

  const handleClick = (item: UiArticle) => {
    navigate(`/article/${item.id}`);
  };

  return (
    <section className="py-[20px]">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-headline">
                {language === "no" ? "Trending nå" : "Trending Now"}
              </h2>
              <p className="text-xs text-muted-foreground font-body">
                {language === "no" ? "Mest leste saker akkurat nå" : "Most read stories right now"}
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
          {trending.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className="group flex-shrink-0 w-[260px] md:w-auto text-left bg-card rounded-2xl border border-border hover:border-accent/30 hover:shadow-elevated transition-all duration-300 overflow-hidden animate-fade-up"
              style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
            >
              <div className="p-5">
                {/* Rank number */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-headline text-2xl font-bold text-accent/30">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="px-2.5 py-1 bg-accent/10 text-accent text-xs font-subhead font-medium rounded-full">
                    {item.category}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-headline text-sm font-bold text-headline group-hover:text-accent transition-colors leading-snug line-clamp-2 mb-3">
                  {item.title}
                </h3>

                {/* Meta */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                  <Clock className="w-3 h-3" />
                  <span>{item.readTime}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span>{item.author}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
