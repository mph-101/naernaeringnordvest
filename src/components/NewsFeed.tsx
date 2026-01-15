import { useState } from "react";
import { Clock, Play, Headphones, FileText, TrendingUp, DollarSign } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string;
  type: "article" | "video" | "podcast";
  featured?: boolean;
  breaking?: boolean;
}

const topics = [
  "All",
  "Deals",
  "Media Rights",
  "Franchises",
  "Leagues",
  "Sponsorship",
  "Analysis",
];

const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "NFL Media Rights: Amazon, Apple Circle $3B Sunday Ticket Renewal",
    excerpt: "Tech giants prepare competing bids as league seeks significant premium over current deal. Sources indicate negotiations could conclude within weeks.",
    category: "Media Rights",
    readTime: "4 min read",
    publishedAt: "35 min ago",
    type: "article",
    featured: true,
    breaking: true,
  },
  {
    id: "2",
    title: "Chelsea FC Valuation Hits £4.2B After Stadium Expansion Plans",
    excerpt: "Boehly-led ownership group finalizes Stamford Bridge redevelopment, boosting franchise value.",
    category: "Franchises",
    readTime: "3 min read",
    publishedAt: "2 hours ago",
    type: "article",
  },
  {
    id: "3",
    title: "Inside the NBA's Africa Expansion Strategy",
    excerpt: "Documentary explores the league's $1B investment in African basketball infrastructure.",
    category: "Leagues",
    readTime: "28 min watch",
    publishedAt: "4 hours ago",
    type: "video",
  },
  {
    id: "4",
    title: "Private Equity Scorecard: Q4 Sports Investments Top $8B",
    excerpt: "Blackstone, Silver Lake lead surge in minority stake acquisitions across major leagues.",
    category: "Deals",
    readTime: "6 min read",
    publishedAt: "5 hours ago",
    type: "article",
  },
  {
    id: "5",
    title: "The Deal Sheet: Weekly M&A Briefing",
    excerpt: "This week's biggest transactions, valuations, and what's coming to market.",
    category: "Deals",
    readTime: "22 min listen",
    publishedAt: "6 hours ago",
    type: "podcast",
  },
  {
    id: "6",
    title: "Saudi PIF Eyes F1 Team Acquisition, Sources Say",
    excerpt: "Kingdom's sovereign wealth fund in advanced talks for minority stake in top constructor.",
    category: "Franchises",
    readTime: "5 min read",
    publishedAt: "8 hours ago",
    type: "article",
  },
];

export function NewsFeed() {
  const [selectedTopic, setSelectedTopic] = useState("All");

  const filteredNews = selectedTopic === "All"
    ? mockNews
    : mockNews.filter((item) => item.category === selectedTopic);

  const getTypeIcon = (type: NewsItem["type"]) => {
    switch (type) {
      case "video":
        return <Play className="w-3.5 h-3.5" />;
      case "podcast":
        return <Headphones className="w-3.5 h-3.5" />;
      default:
        return <FileText className="w-3.5 h-3.5" />;
    }
  };

  const featuredItem = filteredNews.find((item) => item.featured);
  const regularItems = filteredNews.filter((item) => !item.featured);

  return (
    <section className="py-10 bg-surface-subtle">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-accent" />
            <h2 className="font-headline text-2xl font-bold text-headline">
              Market Wire
            </h2>
          </div>
        </div>

        {/* Topic Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-6 px-6">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-4 py-2 rounded text-xs font-subhead font-bold tracking-wider whitespace-nowrap transition-all duration-200 ${
                selectedTopic === topic
                  ? "bg-accent text-accent-foreground"
                  : "bg-background border border-border text-foreground hover:bg-secondary hover:border-accent/50"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Featured Article */}
        {featuredItem && (
          <a
            href="#"
            className="group block mb-8 bg-background rounded border-l-4 border-accent shadow-soft hover:shadow-elevated transition-all duration-300 animate-fade-up overflow-hidden"
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                {featuredItem.breaking && (
                  <span className="px-2 py-1 bg-accent text-accent-foreground text-xs font-subhead font-bold tracking-wider rounded animate-pulse">
                    Breaking
                  </span>
                )}
                <span className="font-subhead text-xs text-accent font-semibold tracking-wider">
                  {featuredItem.category}
                </span>
                <span className="text-xs text-muted-foreground font-body">
                  {featuredItem.publishedAt}
                </span>
              </div>
              <h3 className="font-headline text-xl md:text-2xl lg:text-3xl font-bold text-headline group-hover:text-accent transition-colors mb-3 leading-tight">
                {featuredItem.title}
              </h3>
              <p className="text-muted-foreground font-body leading-relaxed mb-4 max-w-3xl">
                {featuredItem.excerpt}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {featuredItem.readTime}
                </span>
              </div>
            </div>
          </a>
        )}

        {/* News Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {regularItems.map((item, index) => (
            <a
              key={item.id}
              href="#"
              className="group block p-5 bg-background rounded border border-border hover:border-accent/50 hover:shadow-soft transition-all duration-300 animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 text-xs text-accent font-subhead font-semibold tracking-wider">
                  {getTypeIcon(item.type)}
                  {item.category}
                </span>
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
            </a>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded font-subhead text-xs font-bold tracking-wider hover:bg-primary/90 transition-colors">
            Load More Stories
          </button>
        </div>
      </div>
    </section>
  );
}
