import { Clock, ArrowUpRight } from "lucide-react";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  imageUrl?: string;
  type: "article" | "video" | "podcast";
}

const mockArticles: Article[] = [
  {
    id: "1",
    title: "The Changing Landscape of Global Climate Policy",
    excerpt: "A comprehensive look at how nations are adapting their environmental strategies in response to new scientific findings.",
    category: "Environment",
    readTime: "8 min read",
    type: "article",
  },
  {
    id: "2",
    title: "Interview: Leading Economist on Market Trends",
    excerpt: "An in-depth conversation about the forces shaping our economic future.",
    category: "Economy",
    readTime: "24 min listen",
    type: "podcast",
  },
  {
    id: "3",
    title: "Inside the Summit: Exclusive Coverage",
    excerpt: "Our correspondents provide unprecedented access to the negotiations.",
    category: "Politics",
    readTime: "12 min watch",
    type: "video",
  },
  {
    id: "4",
    title: "Opinion: Why This Moment Matters",
    excerpt: "Our editorial board weighs in on the significance of current events.",
    category: "Opinion",
    readTime: "5 min read",
    type: "article",
  },
];

export function RelatedArticles() {
  const getTypeLabel = (type: Article["type"]) => {
    switch (type) {
      case "video":
        return "Video";
      case "podcast":
        return "Podcast";
      default:
        return "Article";
    }
  };

  return (
    <section className="border-t border-border py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-editorial text-2xl font-medium text-headline">
            Related Coverage
          </h2>
          <a
            href="#"
            className="text-sm font-body text-link hover:text-link-hover transition-colors flex items-center gap-1 group"
          >
            View all
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {mockArticles.map((article, index) => (
            <a
              key={article.id}
              href="#"
              className="group block p-5 bg-surface-subtle hover:bg-card rounded-xl border border-transparent hover:border-border transition-all duration-300 hover:shadow-soft animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium uppercase tracking-wider text-accent font-body">
                  {article.category}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground font-body">
                  {getTypeLabel(article.type)}
                </span>
              </div>
              
              <h3 className="font-editorial text-lg font-medium text-headline group-hover:text-accent transition-colors mb-2 leading-snug">
                {article.title}
              </h3>
              
              <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4 line-clamp-2">
                {article.excerpt}
              </p>
              
              <div className="flex items-center text-xs text-muted-foreground font-body">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                {article.readTime}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
