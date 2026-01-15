import { Clock, ArrowUpRight, TrendingUp } from "lucide-react";

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
    title: "NBA Salary Cap Projections: What $180M Means for Free Agency",
    excerpt: "Breaking down how the new media deal impacts team spending power and player contracts.",
    category: "Analysis",
    readTime: "7 min read",
    type: "article",
  },
  {
    id: "2",
    title: "Interview: Arctos Partners on Sports Private Equity",
    excerpt: "Managing partner discusses minority stake strategy and league relationships.",
    category: "Deals",
    readTime: "24 min listen",
    type: "podcast",
  },
  {
    id: "3",
    title: "Inside LIV Golf's Sponsor Pitch Deck",
    excerpt: "Exclusive look at how the Saudi-backed tour is positioning itself to brands.",
    category: "Sponsorship",
    readTime: "8 min watch",
    type: "video",
  },
  {
    id: "4",
    title: "Opinion: Why MLS Expansion Fees Will Hit $500M",
    excerpt: "The math behind America's fastest-growing major league.",
    category: "Franchises",
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
    <section className="border-t-2 border-border py-10">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="font-headline text-xl font-bold text-headline">
              Related Coverage
            </h2>
          </div>
          <a
            href="#"
            className="font-subhead text-xs font-semibold text-accent hover:text-link-hover transition-colors flex items-center gap-1 group tracking-wider"
          >
            View All
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {mockArticles.map((article, index) => (
            <a
              key={article.id}
              href="#"
              className="group block p-5 bg-surface-subtle hover:bg-card rounded border border-transparent hover:border-accent/50 transition-all duration-300 hover:shadow-soft animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="font-subhead text-xs font-semibold tracking-wider text-accent">
                  {article.category}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-xs text-muted-foreground font-body">
                  {getTypeLabel(article.type)}
                </span>
              </div>
              
              <h3 className="font-headline text-base font-bold text-headline group-hover:text-accent transition-colors mb-2 leading-snug">
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
