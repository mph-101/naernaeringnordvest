import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUrlParam } from "@/lib/params";
import { ArrowLeft, Tag as TagIcon, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import type { Tag as TagType } from "@/lib/tag-utils";

interface ArticleSummary {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  read_time: string | null;
  image_url: string | null;
  published_at: string | null;
}

const Tag = () => {
  const slug = getUrlParam();
  const navigate = useNavigate();
  const { language } = useTheme();
  const [tag, setTag] = useState<TagType | null>(null);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // 1) Fetch the tag itself
      const { data: tagRow } = await supabase
        .from("tags")
        .select("id, name, slug, description")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (!tagRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setTag(tagRow as TagType);

      // 2) Fetch the article ids tagged with it, then resolve them
      const { data: links } = await supabase
        .from("article_tags")
        .select("article_id")
        .eq("tag_id", (tagRow as any).id);
      const ids = (links || []).map((l: any) => l.article_id);
      if (ids.length === 0) {
        setArticles([]);
        setLoading(false);
        return;
      }
      const { data: arts } = await supabase
        .from("articles")
        .select("id, title, excerpt, category, author, read_time, image_url, published_at")
        .in("id", ids)
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (cancelled) return;
      setArticles((arts || []) as ArticleSummary[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="font-headline text-3xl font-bold mb-4">
            {language === "no" ? "Tag finnes ikke" : "Tag not found"}
          </h1>
          <button onClick={() => navigate("/")} className="text-primary hover:underline">
            {language === "no" ? "Tilbake til forsiden" : "Back to home"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />

      {/* SEO */}
      {tag && (
        <head>
          <title>{`#${tag.name} – Nær Næring`}</title>
          <meta
            name="description"
            content={tag.description || `Alle artikler tagget med ${tag.name} på Nær Næring.`}
          />
          <link rel="canonical" href={`${window.location.origin}/tag/${tag.slug}`} />
        </head>
      )}

      <main className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === "no" ? "Tilbake" : "Back"}
        </button>

        <header className="mb-10 pb-8 border-b border-border">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-3 font-body">
            <TagIcon className="w-4 h-4" />
            <span>{language === "no" ? "Emne" : "Topic"}</span>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-headline mb-3">
            {tag?.name || "…"}
          </h1>
          {tag?.description && (
            <p className="text-lg text-muted-foreground font-body leading-relaxed">{tag.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-4 font-body">
            {loading
              ? language === "no" ? "Laster…" : "Loading…"
              : language === "no"
              ? `${articles.length} artikkel${articles.length === 1 ? "" : "ler"}`
              : `${articles.length} article${articles.length === 1 ? "" : "s"}`}
          </p>
        </header>

        {!loading && articles.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 font-body">
            {language === "no"
              ? "Ingen publiserte artikler er tagget med dette enda."
              : "No published articles are tagged with this yet."}
          </p>
        ) : (
          <div className="space-y-6">
            {articles.map((a) => (
              <Link
                key={a.id}
                to={`/article/${a.id}`}
                className="block group bg-card rounded-xl p-5 border border-border hover:shadow-elevated transition-all"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-body mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-subhead font-medium">
                    {a.category}
                  </span>
                  {a.read_time && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {a.read_time}
                    </span>
                  )}
                </div>
                <h2 className="font-headline text-xl md:text-2xl font-semibold text-headline group-hover:text-primary transition-colors mb-2 leading-snug">
                  {a.title}
                </h2>
                <p className="text-muted-foreground font-body line-clamp-2">{a.excerpt}</p>
                <p className="text-xs text-muted-foreground font-body mt-3">
                  {language === "no" ? "Av" : "By"} {a.author}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Tag;
