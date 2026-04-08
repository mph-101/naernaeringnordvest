import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getArticleById } from "@/lib/articles";

interface TagWithArticle {
  article_id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string | null;
  image_url: string | null;
  type: string;
}

export function CompanyArticles({ orgnr }: { orgnr: string }) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [articles, setArticles] = useState<TagWithArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("article_company_tags")
      .select("article_id")
      .eq("orgnr", orgnr)
      .order("created_at", { ascending: false })
      .then(async ({ data: tags }) => {
        if (!tags || tags.length === 0) {
          setArticles([]);
          setLoading(false);
          return;
        }

        const results: TagWithArticle[] = [];

        for (const tag of tags) {
          // Try static articles first
          const staticArticle = getArticleById(tag.article_id, language);
          if (staticArticle) {
            results.push({
              article_id: tag.article_id,
              title: staticArticle.title,
              excerpt: staticArticle.excerpt,
              category: staticArticle.category,
              date: staticArticle.publishedAt,
              image_url: staticArticle.image || null,
              type: staticArticle.type,
            });
            continue;
          }

          // Try DB articles
          const { data: dbArticle } = await supabase
            .from("articles")
            .select("id, title, title_en, excerpt, excerpt_en, category, published_at, image_url, type")
            .eq("id", tag.article_id)
            .eq("published", true)
            .maybeSingle();

          if (dbArticle) {
            results.push({
              article_id: dbArticle.id,
              title: (!isNo && dbArticle.title_en) ? dbArticle.title_en : dbArticle.title,
              excerpt: (!isNo && dbArticle.excerpt_en) ? dbArticle.excerpt_en : dbArticle.excerpt,
              category: dbArticle.category,
              date: dbArticle.published_at
                ? new Date(dbArticle.published_at).toLocaleDateString(isNo ? "nb-NO" : "en-US", {
                    day: "numeric", month: "short", year: "numeric",
                  })
                : null,
              image_url: dbArticle.image_url,
              type: dbArticle.type,
            });
          }
        }

        setArticles(results);
        setLoading(false);
      });
  }, [orgnr, language]);

  if (loading) return null;
  if (articles.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="font-headline text-lg font-semibold text-headline">
          {isNo ? "Relaterte artikler" : "Related Articles"}
        </h3>
        <Badge variant="secondary" className="ml-auto">
          {articles.length}
        </Badge>
      </div>
      <div className="space-y-3">
        {articles.map((a) => (
          <Link
            key={a.article_id}
            to={`/article/${a.article_id}`}
            className="flex gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
          >
            {a.image_url && (
              <img
                src={a.image_url}
                alt=""
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-subhead text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {a.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {a.excerpt}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {a.category}
                </Badge>
                {a.date && (
                  <span className="text-[10px] text-muted-foreground">{a.date}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
