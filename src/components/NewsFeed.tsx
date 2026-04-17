import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Play, Headphones, FileText, Lock, TrendingUp, Tag as TagIcon, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { getArticleImage } from "@/lib/articles";
import { supabase } from "@/integrations/supabase/client";
import type { Tag } from "@/lib/tag-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TagWithCount extends Tag {
  count: number;
}

interface DbArticle {
  id: string;
  title: string;
  title_en: string | null;
  excerpt: string;
  excerpt_en: string | null;
  body: string;
  category: string;
  author: string;
  type: string;
  premium: boolean;
  read_time: string | null;
  image_url: string | null;
  published_at: string | null;
  key_points: any;
}

const regionToSportLabel: Record<string, { no: string; en: string }> = {
  more_og_romsdal: { no: "Møre og Romsdal", en: "Møre og Romsdal" },
  vestlandet: { no: "Vestlandet", en: "Western Norway" },
  nord_norge: { no: "Nord-Norge", en: "Northern Norway" },
  trondelag: { no: "Trøndelag", en: "Trøndelag" },
  ostlandet: { no: "Østlandet", en: "Eastern Norway" },
  sorlandet: { no: "Sørlandet", en: "Southern Norway" },
};

function timeAgo(dateStr: string, lang: "no" | "en"): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return lang === "no" ? `${days}d siden` : `${days}d ago`;
  if (hours > 0) return lang === "no" ? `${hours}t siden` : `${hours}h ago`;
  return lang === "no" ? "Nå" : "Now";
}

function estimateReadTime(body: string, type: string, lang: "no" | "en"): string {
  const words = body.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 220));
  const suffix = type === "video" ? (lang === "no" ? "min video" : "min watch") :
                 type === "podcast" ? (lang === "no" ? "min lytting" : "min listen") :
                 (lang === "no" ? "min lesing" : "min read");
  return `${mins} ${suffix}`;
}

export function NewsFeed() {
  const { language, region } = useTheme();
  const t = translations[language];
  const [dbArticles, setDbArticles] = useState<DbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState("Alle");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [topTags, setTopTags] = useState<TagWithCount[]>([]);
  const [articleTagMap, setArticleTagMap] = useState<Map<string, string[]>>(new Map());
  const [selectedSport, setSelectedSport] = useState<string>(() => {
    if (region && regionToSportLabel[region]) {
      return regionToSportLabel[region][language];
    }
    return "all";
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArticles = async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, title_en, excerpt, excerpt_en, body, category, author, type, premium, read_time, image_url, published_at, key_points")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(20);
      setDbArticles(data || []);
      setLoading(false);
    };
    fetchArticles();
  }, []);

  // Fetch tag links for the loaded articles + compute top tags
  useEffect(() => {
    if (dbArticles.length === 0) {
      setTopTags([]);
      setArticleTagMap(new Map());
      return;
    }
    const ids = dbArticles.map((a) => a.id);
    (async () => {
      const { data } = await supabase
        .from("article_tags")
        .select("article_id, tags(id, name, slug, description)")
        .in("article_id", ids);
      const map = new Map<string, string[]>();
      const counts = new Map<string, { tag: Tag; count: number }>();
      (data || []).forEach((row: any) => {
        if (!row.tags) return;
        const tag = row.tags as Tag;
        const list = map.get(row.article_id) || [];
        list.push(tag.id);
        map.set(row.article_id, list);
        const cur = counts.get(tag.id);
        if (cur) cur.count += 1;
        else counts.set(tag.id, { tag, count: 1 });
      });
      setArticleTagMap(map);
      const sorted = Array.from(counts.values())
        .sort((a, b) => b.count - a.count || a.tag.name.localeCompare(b.tag.name, "nb"))
        .slice(0, 12)
        .map((c) => ({ ...c.tag, count: c.count }));
      setTopTags(sorted);
    })();
  }, [dbArticles]);

  // Fetch categories for topic filtering
  const [categories, setCategories] = useState<{name: string; name_en: string | null}[]>([]);
  useEffect(() => {
    supabase.from("categories").select("name, name_en").then(({ data }) => {
      setCategories(data || []);
    });
  }, []);

  const topics = language === "no"
    ? ["Alle", ...categories.map(c => c.name)]
    : ["All", ...categories.map(c => c.name_en || c.name)];
  const allTopic = topics[0];

  const articles = dbArticles.map((a, index) => ({
    id: a.id,
    title: language === "en" && a.title_en ? a.title_en : a.title,
    excerpt: language === "en" && a.excerpt_en ? a.excerpt_en : a.excerpt,
    category: a.category,
    readTime: a.read_time || estimateReadTime(a.body, a.type, language),
    publishedAt: a.published_at ? timeAgo(a.published_at, language) : "",
    author: a.author,
    type: a.type as "article" | "video" | "podcast",
    premium: a.premium,
    image_url: a.image_url,
    featured: index === 0,
  }));

  const sports = t.sports;
  const allSport = sports[0];

  let filteredNews = selectedTopic === allTopic
    ? articles
    : articles.filter((item) => item.category === selectedTopic);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Play className="w-3.5 h-3.5" />;
      case "podcast": return <Headphones className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };

  const handleArticleClick = (item: typeof articles[0]) => {
    navigate(`/article/${item.id}`);
  };

  const getBackground = (item: typeof articles[0]) => {
    if (item.image_url) return `url(${item.image_url})`;
    return getArticleImage(item.id, item.category);
  };

  const featuredItem = filteredNews.find((item) => item.featured);
  const regularItems = filteredNews.filter((item) => !item.featured);

  if (loading) {
    return (
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      </section>
    );
  }

  if (articles.length === 0) {
    return (
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6 text-center text-muted-foreground">
          {language === "no" ? "Ingen publiserte artikler ennå." : "No published articles yet."}
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="font-headline text-2xl font-bold text-headline">{t.latestAnalysis}</h2>
              <p className="text-sm text-muted-foreground font-body mt-0.5">
                {language === "no" ? "Siste nyheter og analyser" : "Latest news and analysis"}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        {topics.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 mb-10">
            {topics.map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`px-4 py-2 rounded-full text-sm font-subhead whitespace-nowrap transition-all duration-200 ${
                  selectedTopic === topic
                    ? "bg-accent text-accent-foreground shadow-soft"
                    : "bg-card border border-border text-foreground hover:bg-secondary hover:border-accent/20"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        {/* Featured Article */}
        {featuredItem && (
          <button
            onClick={() => handleArticleClick(featuredItem)}
            className="group block w-full text-left mb-10 bg-card rounded-2xl shadow-soft hover:shadow-elevated transition-all duration-300 animate-fade-up overflow-hidden border border-border hover:border-accent/30"
          >
            <div className="md:flex">
              <div
                className="h-56 md:h-auto md:w-2/5 flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                style={{ background: getBackground(featuredItem), backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <div className="absolute inset-0 bg-black/10" />
                {!featuredItem.image_url && (
                  <span className="relative text-white/80 font-headline text-3xl font-bold tracking-tight select-none">
                    {featuredItem.category.slice(0, 2).toUpperCase()}
                  </span>
                )}
                {featuredItem.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-7 md:p-9 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  {featuredItem.premium && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent text-xs font-subhead font-semibold rounded-full">
                      <Lock className="w-3 h-3" />
                      {t.premium}
                    </span>
                  )}
                  <span className="font-subhead text-sm text-accent font-medium">{featuredItem.category}</span>
                  <span className="text-sm text-muted-foreground font-body">{featuredItem.publishedAt}</span>
                </div>
                <h3 className="font-headline text-xl md:text-2xl font-bold text-headline group-hover:text-accent transition-colors mb-3 leading-snug">
                  {featuredItem.title}
                </h3>
                <p className="text-muted-foreground font-body leading-relaxed mb-5 max-w-3xl line-clamp-3">
                  {featuredItem.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
                  <span>{language === "no" ? "Av" : "By"} {featuredItem.author}</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {featuredItem.readTime}
                  </span>
                </div>
              </div>
            </div>
          </button>
        )}

        {/* News Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {regularItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleArticleClick(item)}
              className="group block w-full text-left bg-card rounded-2xl border border-border hover:border-accent/30 hover:shadow-elevated transition-all duration-300 animate-fade-up overflow-hidden"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className="h-36 w-full flex items-center justify-center relative overflow-hidden"
                style={{ background: getBackground(item), backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                {!item.image_url && (
                  <span className="relative text-white/70 font-headline text-2xl font-bold tracking-tight select-none">
                    {item.category.slice(0, 2).toUpperCase()}
                  </span>
                )}
                {item.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>
                )}
                {item.type === "podcast" && (
                  <div className="absolute bottom-2 right-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Headphones className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1.5 text-sm text-accent font-subhead font-medium">
                    {getTypeIcon(item.type)}
                    {item.category}
                  </span>
                  {item.premium && <Lock className="w-3 h-3 text-muted-foreground ml-auto" />}
                </div>
                <h3 className="font-headline text-base font-bold text-headline group-hover:text-accent transition-colors mb-2.5 leading-snug line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4 line-clamp-2">
                  {item.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground font-body pt-3 border-t border-border">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {item.readTime}
                  </span>
                  <span>{item.publishedAt}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
