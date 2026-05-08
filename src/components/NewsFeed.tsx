import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Play, Headphones, FileText, Lock, TrendingUp, Tag as TagIcon, X, MapPin, Megaphone } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { getArticleImage } from "@/lib/articles";
import { supabase } from "@/integrations/supabase/client";
import type { Tag } from "@/lib/tag-utils";
import { fetchRegions, type EditorialRegion } from "@/lib/regions";
import { cropToBackgroundStyle, parseCrop, parseFocal } from "@/lib/image-crop";

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
  image_crop: any;
  image_focal: any;
  published_at: string | null;
  key_points: any;
  region_slug: string | null;
}

interface NativeAd {
  id: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  sponsor_name: string;
  sponsor_logo_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  pinned_position: number;
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

export const NewsFeed = () => {
  const { language, region } = useTheme();
  const t = translations[language];
  const [dbArticles, setDbArticles] = useState<DbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState("Alle");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [topTags, setTopTags] = useState<TagWithCount[]>([]);
  const [articleTagMap, setArticleTagMap] = useState<Map<string, string[]>>(new Map());
  const [editorialRegions, setEditorialRegions] = useState<EditorialRegion[]>([]);
  const [selectedRegionSlug, setSelectedRegionSlug] = useState<string | "all">("all");
  const [userEditorialRegion, setUserEditorialRegion] = useState<string | null>(null);
  const [articleSharedRegions, setArticleSharedRegions] = useState<Map<string, string[]>>(new Map());
  const [nativeAds, setNativeAds] = useState<NativeAd[]>([]);
  const navigate = useNavigate();

  // Load region list + the signed-in user's primary region (used as default filter)
  useEffect(() => {
    fetchRegions().then(setEditorialRegions).catch(() => {});
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("editorial_region")
        .eq("user_id", user.id)
        .maybeSingle();
      const slug = (data as any)?.editorial_region as string | null | undefined;
      if (slug) {
        setUserEditorialRegion(slug);
        setSelectedRegionSlug(slug);
      }
    })();
  }, []);

  useEffect(() => {
    const fetchArticles = async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, title_en, excerpt, excerpt_en, body, category, author, type, premium, read_time, image_url, image_crop, image_focal, published_at, key_points, region_slug")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(40);
      setDbArticles((data || []) as unknown as DbArticle[]);
      setLoading(false);
    };
    fetchArticles();
  }, []);

  // Fetch active native ads (RLS already filters by active + dates)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("native_ads" as any)
        .select("id, title, excerpt, image_url, sponsor_name, sponsor_logo_url, cta_label, cta_url, pinned_position")
        .order("pinned_position", { ascending: true });
      setNativeAds(((data || []) as unknown) as NativeAd[]);
    })();
  }, []);

  // Fetch shared regions for loaded articles
  useEffect(() => {
    if (dbArticles.length === 0) {
      setArticleSharedRegions(new Map());
      return;
    }
    const ids = dbArticles.map((a) => a.id);
    (async () => {
      const { data } = await supabase
        .from("article_shared_regions" as any)
        .select("article_id, region_slug")
        .in("article_id", ids);
      const map = new Map<string, string[]>();
      ((data || []) as any[]).forEach((row: any) => {
        const list = map.get(row.article_id) || [];
        list.push(row.region_slug);
        map.set(row.article_id, list);
      });
      setArticleSharedRegions(map);
    })();
  }, [dbArticles]);

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
    image_crop: parseCrop(a.image_crop),
    image_focal: parseFocal(a.image_focal),
    region_slug: a.region_slug,
    featured: index === 0,
  }));

  let filteredNews = selectedTopic === allTopic
    ? articles
    : articles.filter((item) => item.category === selectedTopic);

  if (selectedTagId) {
    filteredNews = filteredNews.filter((item) => articleTagMap.get(item.id)?.includes(selectedTagId));
  }

  if (selectedRegionSlug !== "all") {
    filteredNews = filteredNews.filter((item) => {
      if (item.region_slug === selectedRegionSlug) return true;
      const shared = articleSharedRegions.get(item.id) || [];
      return shared.includes(selectedRegionSlug);
    });
  }

  // Featured flag is index-based on the original list — recompute after filter
  filteredNews = filteredNews.map((item, idx) => ({ ...item, featured: idx === 0 }));

  const selectedTagName = useMemo(
    () => topTags.find((t) => t.id === selectedTagId)?.name || null,
    [topTags, selectedTagId],
  );

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

  const getBackgroundStyle = (item: typeof articles[0]) =>
    item.image_url
      ? cropToBackgroundStyle(item.image_crop, item.image_focal)
      : { size: "cover", position: "center" };

  const featuredItem = filteredNews.find((item) => item.featured);
  const regularItems = filteredNews.filter((item) => !item.featured);

  // Inject native ads at their pinned position into the regular grid (positions 2,3,4…)
  // Position 1 is reserved for the featured article — ads pinned to 1 are bumped to 2.
  type FeedEntry =
    | { kind: "article"; item: typeof regularItems[0] }
    | { kind: "ad"; ad: NativeAd };
  const gridEntries: FeedEntry[] = regularItems.map((item) => ({ kind: "article" as const, item }));
  // Sort ads by position ascending and insert. Position N means index (N-2) in the grid (after featured).
  const sortedAds = [...nativeAds].sort((a, b) => a.pinned_position - b.pinned_position);
  sortedAds.forEach((ad) => {
    const targetIndex = Math.max(0, ad.pinned_position - 2);
    const insertAt = Math.min(targetIndex, gridEntries.length);
    gridEntries.splice(insertAt, 0, { kind: "ad" as const, ad });
  });

  if (loading) {
    return (
      <section className="py-[44px]">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      </section>
    );
  }

  if (articles.length === 0) {
    return (
      <section className="py-[44px]">
        <div className="max-w-5xl mx-auto px-6 text-center text-muted-foreground">
          {language === "no" ? "Ingen publiserte artikler ennå." : "No published articles yet."}
        </div>
      </section>
    );
  }

  return (
    <section className="py-[44px]">
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
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 mb-4">
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

        {/* Tag filter removed */}

        {selectedTagName && filteredNews.length === 0 && (
          <div className="mb-10 p-6 rounded-2xl border border-border bg-card text-center text-sm text-muted-foreground font-body">
            {language === "no"
              ? `Ingen artikler matcher emnet «${selectedTagName}» med valgt kategori.`
              : `No articles match the topic "${selectedTagName}" with the selected category.`}
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
                className="aspect-[16/10] md:aspect-auto md:self-stretch md:w-2/5 flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                style={(() => { const bg = getBackgroundStyle(featuredItem); return { backgroundImage: getBackground(featuredItem), backgroundRepeat: 'no-repeat', backgroundSize: bg.size, backgroundPosition: bg.position, willChange: 'background-position', backfaceVisibility: 'hidden' as const }; })()}
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
          {gridEntries.map((entry, index) => entry.kind === "ad" ? (
            <NativeAdCard key={`ad-${entry.ad.id}`} ad={entry.ad} index={index} language={language} />
          ) : (
            (() => { const item = entry.item; return (
            <button
              key={item.id}
              onClick={() => handleArticleClick(item)}
              className="group block w-full text-left bg-card rounded-2xl border border-border hover:border-accent/30 hover:shadow-elevated transition-all duration-300 animate-fade-up overflow-hidden"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className="aspect-[16/9] w-full flex items-center justify-center relative overflow-hidden"
                style={(() => { const bg = getBackgroundStyle(item); return { backgroundImage: getBackground(item), backgroundRepeat: 'no-repeat', backgroundSize: bg.size, backgroundPosition: bg.position, willChange: 'background-position', backfaceVisibility: 'hidden' as const }; })()}
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
            ); })()
          ))}
        </div>
      </div>
    </section>
  );
};

interface NativeAdCardProps {
  ad: {
    id: string;
    title: string;
    excerpt: string;
    image_url: string | null;
    sponsor_name: string;
    sponsor_logo_url: string | null;
    cta_label: string | null;
    cta_url: string | null;
  };
  index: number;
  language: "no" | "en";
}

const NativeAdCard = ({ ad, index, language }: NativeAdCardProps) => {
  const labelText = language === "no" ? "Annonsørinnhold" : "Sponsored content";
  const sponsoredBy = language === "no" ? "Fra" : "From";
  const cta = ad.cta_label || (language === "no" ? "Les mer" : "Read more");
  const Wrapper: any = ad.cta_url ? "a" : "div";
  const wrapperProps = ad.cta_url
    ? { href: ad.cta_url, target: "_blank", rel: "noopener sponsored nofollow" }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className="group block w-full text-left bg-card rounded-2xl border-2 border-amber-400/60 dark:border-amber-500/50 hover:shadow-elevated transition-all duration-300 animate-fade-up overflow-hidden relative"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 text-[10px] font-subhead font-bold uppercase tracking-wide shadow-sm">
        <Megaphone className="w-3 h-3" />
        {labelText}
      </div>
      <div
        className="h-36 w-full bg-muted relative overflow-hidden"
        style={ad.image_url ? { backgroundImage: `url(${ad.image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {!ad.image_url && (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Megaphone className="w-8 h-8 opacity-40" />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground font-body">
          {ad.sponsor_logo_url ? (
            <img src={ad.sponsor_logo_url} alt="" className="w-5 h-5 rounded object-contain" />
          ) : null}
          <span>
            {sponsoredBy} <span className="font-semibold text-foreground">{ad.sponsor_name}</span>
          </span>
        </div>
        <h3 className="font-headline text-base font-bold text-headline mb-2.5 leading-snug line-clamp-2">
          {ad.title}
        </h3>
        <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4 line-clamp-2">
          {ad.excerpt}
        </p>
        {ad.cta_url && (
          <div className="text-sm font-subhead font-semibold text-accent group-hover:underline">
            {cta} →
          </div>
        )}
      </div>
    </Wrapper>
  );
};
