import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tag as TagIcon, Clock, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

interface RelatedArticle {
  id: string;
  title: string;
  title_en: string | null;
  excerpt: string;
  excerpt_en: string | null;
  category: string;
  read_time: string | null;
  image_url: string | null;
  published_at: string | null;
  shared_tags: string[];
}

interface RelatedByTagsProps {
  articleId: string;
  className?: string;
}

/**
 * Shows up to 4 articles that share at least one tag with the current article,
 * ranked by number of shared tags. Public-facing — only published articles.
 */
export const RelatedByTags = ({ articleId, className = "" }: RelatedByTagsProps) => {
  const { language } = useTheme();
  const [items, setItems] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // 1) Tags on the current article
      const { data: ownTagRows } = await supabase
        .from("article_tags")
        .select("tag_id, tags(name)")
        .eq("article_id", articleId);

      const tagIds = (ownTagRows || []).map((r: any) => r.tag_id).filter(Boolean);
      if (tagIds.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      const tagNameById = new Map<string, string>();
      (ownTagRows || []).forEach((r: any) => {
        if (r.tag_id && r.tags?.name) tagNameById.set(r.tag_id, r.tags.name);
      });

      // 2) Other articles sharing those tags
      const { data: linkRows } = await supabase
        .from("article_tags")
        .select("article_id, tag_id")
        .in("tag_id", tagIds)
        .neq("article_id", articleId);

      if (!linkRows || linkRows.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      // Aggregate per article
      const byArticle = new Map<string, Set<string>>();
      linkRows.forEach((r: any) => {
        if (!byArticle.has(r.article_id)) byArticle.set(r.article_id, new Set());
        byArticle.get(r.article_id)!.add(r.tag_id);
      });
      const candidateIds = Array.from(byArticle.keys());

      // 3) Fetch published article details
      const { data: articles } = await supabase
        .from("articles")
        .select("id, title, title_en, excerpt, excerpt_en, category, read_time, image_url, published_at, published")
        .in("id", candidateIds)
        .eq("published", true);

      if (cancelled) return;

      const enriched: RelatedArticle[] = (articles || [])
        .map((a: any) => {
          const sharedIds = byArticle.get(a.id) || new Set<string>();
          const sharedNames = Array.from(sharedIds)
            .map((tid) => tagNameById.get(tid))
            .filter(Boolean) as string[];
          return {
            id: a.id,
            title: a.title,
            title_en: a.title_en,
            excerpt: a.excerpt,
            excerpt_en: a.excerpt_en,
            category: a.category,
            read_time: a.read_time,
            image_url: a.image_url,
            published_at: a.published_at,
            shared_tags: sharedNames,
          };
        })
        .sort((a, b) => {
          if (b.shared_tags.length !== a.shared_tags.length) {
            return b.shared_tags.length - a.shared_tags.length;
          }
          // Newer first as tiebreaker
          const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
          const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 4);

      setItems(enriched);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  if (loading || items.length === 0) return null;

  const heading = language === "no" ? "Mer om dette emnet" : "More on this topic";

  return (
    <section className={`border-t border-border pt-8 mt-10 ${className}`}>
      <div className="flex items-center gap-2 mb-5">
        <TagIcon className="w-4 h-4 text-primary" aria-hidden />
        <h2 className="font-headline text-xl md:text-2xl text-foreground">{heading}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((a) => {
          const title = language === "en" && a.title_en ? a.title_en : a.title;
          const excerpt = language === "en" && a.excerpt_en ? a.excerpt_en : a.excerpt;
          return (
            <Link
              key={a.id}
              to={`/article/${a.id}`}
              className="group flex gap-4 p-3 rounded-lg border border-border bg-card hover:bg-accent/10 hover:border-primary/40 transition-colors"
            >
              {a.image_url && (
                <div className="hidden sm:block flex-shrink-0 w-24 h-24 rounded-md overflow-hidden bg-muted">
                  <img
                    src={a.image_url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-headline text-base text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  <ArrowUpRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="font-body text-sm text-muted-foreground line-clamp-2 mt-1">{excerpt}</p>
                <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  {a.read_time && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {a.read_time}
                    </span>
                  )}
                  {a.shared_tags.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-subhead"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
