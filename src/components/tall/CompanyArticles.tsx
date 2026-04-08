import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ArticleTag {
  article_id: string;
  articles: {
    id: string;
    title: string;
    title_en: string | null;
    excerpt: string;
    excerpt_en: string | null;
    category: string;
    published_at: string | null;
    image_url: string | null;
    type: string;
  };
}

export function CompanyArticles({ orgnr }: { orgnr: string }) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [articles, setArticles] = useState<ArticleTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("article_company_tags")
      .select("article_id, articles(id, title, title_en, excerpt, excerpt_en, category, published_at, image_url, type)")
      .eq("orgnr", orgnr)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setArticles((data as any) || []);
        setLoading(false);
      });
  }, [orgnr]);

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
        {articles.map((tag) => {
          const a = tag.articles;
          if (!a) return null;
          const title = (!isNo && a.title_en) ? a.title_en : a.title;
          const excerpt = (!isNo && a.excerpt_en) ? a.excerpt_en : a.excerpt;
          const date = a.published_at
            ? new Date(a.published_at).toLocaleDateString(isNo ? "nb-NO" : "en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : null;

          return (
            <a
              key={a.id}
              href={`/artikkel/${a.id}`}
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
                  {title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {excerpt}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {a.category}
                  </Badge>
                  {date && (
                    <span className="text-[10px] text-muted-foreground">{date}</span>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
