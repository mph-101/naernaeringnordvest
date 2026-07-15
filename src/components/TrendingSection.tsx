import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { PUBLISHED_ARTICLE_LIST_SELECT, toUiArticle } from "@/lib/article-data";

async function fetchTrendingArticles(): Promise<any[]> {
  // Aggregeringen skjer server-side (get_trending_articles-RPC) — klienten
  // mottar maks 12 (id, views)-rader i stedet for rå article_views-dumpen.
  const { data: top, error } = await supabase.rpc("get_trending_articles");
  if (error) throw error;
  const topIds: string[] = (top ?? []).map((r) => r.article_id);

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

  // Fallback / fyll opp med sist publiserte
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
  return articles.slice(0, 4);
}

export function TrendingSection() {
  const { language } = useTheme();
  // Rå rader caches språknøytralt; NO/EN-bytte koster null nettverk fordi
  // lokaliseringen skjer i toUiArticle-mappingen under.
  const { data: rawArticles, isLoading } = useQuery({
    queryKey: ["trending"],
    queryFn: fetchTrendingArticles,
    staleTime: 60_000,
  });

  const trending = useMemo(
    () => (rawArticles ?? []).map((a) => toUiArticle(a, language)),
    [rawArticles, language],
  );

  if (isLoading || trending.length === 0) return null;

  return (
    <section className="py-[20px]">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header — Lora-tittelen bærer seksjonen; rustrose er reservert feil */}
        <div className="mb-6">
          <h2 className="font-headline text-lg font-bold text-headline">
            {language === "no" ? "Mest lest" : "Most read"}
          </h2>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
          {trending.map((item, index) => (
            <Link
              key={item.id}
              to={`/article/${item.id}`}
              className="group flex-shrink-0 w-[260px] md:w-auto text-left bg-card rounded-2xl border border-border hover:border-accent/30 hover:shadow-elevated transition-all duration-300 overflow-hidden animate-fade-up"
              style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
            >
              <div className="p-5">
                {/* Rank number */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-headline text-2xl font-bold text-accent-ink">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="px-2.5 py-1 bg-accent/10 text-accent-ink text-xs font-subhead font-medium rounded-full">
                    {item.category}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-headline text-sm font-bold text-headline group-hover:text-accent-ink transition-colors leading-snug line-clamp-2 mb-3">
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
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
