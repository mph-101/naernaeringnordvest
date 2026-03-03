import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Play, Headphones, FileText, Lock, BarChart3 } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { getArticles, getArticleImage, Article } from "@/lib/articles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NewsFeed() {
  const [selectedTopic, setSelectedTopic] = useState("Alle");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const { language } = useTheme();
  const t = translations[language];
  const navigate = useNavigate();

  const articles = getArticles(language).map((article, index) => ({
    ...article,
    featured: index === 0,
  }));

  const topics = t.topics;
  const allTopic = topics[0];
  const sports = t.sports;
  const allSport = sports[0];

  let filteredNews = selectedTopic === allTopic
    ? articles
    : articles.filter((item) => item.category === selectedTopic);

  if (selectedSport !== "all") {
    filteredNews = filteredNews.filter((item) => item.sport === selectedSport);
  }

  const getTypeIcon = (type: Article["type"]) => {
    switch (type) {
      case "video":
        return <Play className="w-3.5 h-3.5" />;
      case "podcast":
        return <Headphones className="w-3.5 h-3.5" />;
      default:
        return <FileText className="w-3.5 h-3.5" />;
    }
  };

  const handleArticleClick = (item: Article) => {
    navigate(`/article/${item.id}`);
  };

  const featuredItem = filteredNews.find((item) => item.featured);
  const regularItems = filteredNews.filter((item) => !item.featured);

  return (
    <>
      <section className="py-12 bg-surface-subtle">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <h2 className="font-headline text-xl font-bold text-headline">
                {t.latestAnalysis}
              </h2>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 mb-8">
            {/* Sport Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-subhead text-muted-foreground whitespace-nowrap">
                {t.sportFilterLabel}:
              </span>
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{allSport}</SelectItem>
                  {sports.slice(1).map((sport) => (
                    <SelectItem key={sport} value={sport}>
                      {sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topic Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
              {topics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-4 py-2.5 rounded-full text-sm font-subhead whitespace-nowrap transition-all duration-200 ${
                    selectedTopic === topic
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "bg-card border border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Article */}
          {featuredItem && (
            <button
              onClick={() => handleArticleClick(featuredItem)}
              className="group block w-full text-left mb-8 bg-card rounded-2xl shadow-soft hover:shadow-elevated transition-all duration-300 animate-fade-up overflow-hidden border border-border hover:border-accent/30"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  {featuredItem.premium && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent text-xs font-subhead font-semibold rounded-full">
                      <Lock className="w-3 h-3" />
                      {t.premium}
                    </span>
                  )}
                  <span className="font-subhead text-sm text-accent font-medium">
                    {featuredItem.category}
                  </span>
                  <span className="text-sm text-muted-foreground font-body">
                    {featuredItem.publishedAt}
                  </span>
                </div>
                <h3 className="font-headline text-xl md:text-2xl font-bold text-headline group-hover:text-accent transition-colors mb-3 leading-snug">
                  {featuredItem.title}
                </h3>
                <p className="text-muted-foreground font-body leading-relaxed mb-4 max-w-3xl">
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
            </button>
          )}

          {/* News Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {regularItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleArticleClick(item)}
                className="group block w-full text-left p-5 bg-card rounded-xl border border-border hover:border-accent/30 hover:shadow-soft transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1.5 text-sm text-accent font-subhead font-medium">
                    {getTypeIcon(item.type)}
                    {item.category}
                  </span>
                  {item.premium && (
                    <Lock className="w-3 h-3 text-muted-foreground ml-auto" />
                  )}
                </div>
                
                <h3 className="font-headline text-base font-bold text-headline group-hover:text-accent transition-colors mb-2 leading-snug line-clamp-2">
                  {item.title}
                </h3>
                
                <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4 line-clamp-2">
                  {item.excerpt}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground font-body">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {item.readTime}
                  </span>
                  <span>{item.publishedAt}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-10">
            <button className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-subhead text-sm font-semibold hover:bg-primary/90 transition-colors shadow-soft">
              {t.loadMore}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
