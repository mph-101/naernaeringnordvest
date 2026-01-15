import { useState } from "react";
import { Clock, Play, Headphones, FileText, ArrowUpRight } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string;
  type: "article" | "video" | "podcast";
  featured?: boolean;
}

const topics = [
  "All",
  "Politics",
  "Economy",
  "Technology",
  "Environment",
  "Culture",
  "Opinion",
];

const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "Breaking: Major Policy Shift Announced",
    excerpt: "Government officials unveiled a comprehensive new approach that could reshape the regulatory landscape for years to come.",
    category: "Politics",
    readTime: "6 min read",
    publishedAt: "2 hours ago",
    type: "article",
    featured: true,
  },
  {
    id: "2",
    title: "Markets React to Economic Data",
    excerpt: "Investors weigh new employment figures against inflation concerns.",
    category: "Economy",
    readTime: "4 min read",
    publishedAt: "3 hours ago",
    type: "article",
  },
  {
    id: "3",
    title: "The Future of Renewable Energy",
    excerpt: "A documentary exploring innovations in sustainable power.",
    category: "Environment",
    readTime: "45 min watch",
    publishedAt: "5 hours ago",
    type: "video",
  },
  {
    id: "4",
    title: "Tech Giants Face New Scrutiny",
    excerpt: "Regulators across multiple jurisdictions coordinate their approach.",
    category: "Technology",
    readTime: "7 min read",
    publishedAt: "6 hours ago",
    type: "article",
  },
  {
    id: "5",
    title: "Daily Briefing: What You Need to Know",
    excerpt: "Our editors break down the top stories of the day.",
    category: "Politics",
    readTime: "18 min listen",
    publishedAt: "8 hours ago",
    type: "podcast",
  },
  {
    id: "6",
    title: "The Art World's Digital Revolution",
    excerpt: "How technology is transforming how we create and experience art.",
    category: "Culture",
    readTime: "10 min read",
    publishedAt: "12 hours ago",
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
        return <Play className="w-4 h-4" />;
      case "podcast":
        return <Headphones className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const featuredItem = filteredNews.find((item) => item.featured);
  const regularItems = filteredNews.filter((item) => !item.featured);

  return (
    <section className="py-12 bg-surface-subtle">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-editorial text-3xl font-medium text-headline">
            Latest News
          </h2>
        </div>

        {/* Topic Filters */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2 -mx-6 px-6">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-4 py-2 rounded-full text-sm font-body font-medium whitespace-nowrap transition-all duration-200 ${
                selectedTopic === topic
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border text-foreground hover:bg-secondary"
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
            className="group block mb-10 p-6 md:p-8 bg-background rounded-2xl border border-border hover:shadow-elevated transition-all duration-300 animate-fade-up"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-1 bg-accent/10 text-accent text-xs font-medium uppercase tracking-wider rounded-full font-body">
                Featured
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground font-body">
                {featuredItem.category}
              </span>
            </div>
            <h3 className="font-editorial text-2xl md:text-3xl font-medium text-headline group-hover:text-accent transition-colors mb-3">
              {featuredItem.title}
            </h3>
            <p className="text-muted-foreground font-body leading-relaxed mb-4 max-w-2xl">
              {featuredItem.excerpt}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {featuredItem.readTime}
              </span>
              <span>{featuredItem.publishedAt}</span>
            </div>
          </a>
        )}

        {/* News Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {regularItems.map((item, index) => (
            <a
              key={item.id}
              href="#"
              className="group block p-5 bg-background rounded-xl border border-border hover:shadow-soft transition-all duration-300 animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
                  {getTypeIcon(item.type)}
                  {item.category}
                </span>
              </div>
              
              <h3 className="font-editorial text-lg font-medium text-headline group-hover:text-accent transition-colors mb-2 leading-snug line-clamp-2">
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
        <div className="text-center mt-10">
          <button className="px-6 py-3 bg-background border border-border rounded-xl font-body font-medium text-foreground hover:bg-secondary transition-colors">
            Load More Stories
          </button>
        </div>
      </div>
    </section>
  );
}
