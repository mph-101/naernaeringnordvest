import { useState } from "react";
import { Clock, ArrowUpRight, Lock, FileText } from "lucide-react";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  fullContent: string;
  category: string;
  readTime: string;
  author: string;
  type: "article" | "video" | "podcast";
  premium: boolean;
}

const mockArticles: Article[] = [
  {
    id: "1",
    title: "NBA Salary Cap Projections: How the $180M Threshold Reshapes Free Agency",
    excerpt: "Breaking down how the new media deal impacts team spending power and player contract structures through 2030.",
    fullContent: `The NBA's new media rights agreement, expected to generate approximately $76 billion over 11 years, will have profound implications for player compensation and team financial management through the end of the decade.

According to projections shared with team executives, the salary cap is expected to reach $180 million by the 2028-29 season, representing a 45% increase from current levels. This expansion will fundamentally alter free agency dynamics, contract structures, and competitive balance across the league.

Key Implications:

**Max Contract Evolution**
Under current projections, a player signing a maximum contract in 2028 could earn approximately $68 million in the first year, with five-year deals potentially exceeding $350 million. This creates both opportunities and challenges for player agents negotiating extensions versus free agency.

**Luxury Tax Thresholds**
The luxury tax threshold is projected to reach $220 million by 2028, meaning teams like the Golden State Warriors and Boston Celtics—currently paying substantial penalties—may find themselves with unexpected financial flexibility.

**Mid-Level Exception Growth**
The non-taxpayer mid-level exception, currently valued at approximately $13 million, could exceed $18 million by 2028, enhancing teams' ability to add quality role players without cap implications.

**Second Apron Considerations**
The league's new competitive balance measures, including restrictions on teams exceeding the second apron, will become increasingly relevant as more franchises approach the threshold.

Industry analysts note that player agents are already incorporating these projections into extension negotiations, creating tension between teams preferring to delay decisions and players seeking to capitalize on future cap growth.

"Smart teams are thinking three to four years ahead on every contract decision," said one Western Conference executive. "The math looks completely different when you model the projected cap trajectory."`,
    category: "Analysis",
    readTime: "7 min read",
    author: "David Park",
    type: "article",
    premium: true,
  },
  {
    id: "2",
    title: "Interview: Arctos Partners Managing Partner on the Future of Sports Private Equity",
    excerpt: "Exclusive conversation on minority stake acquisition strategy, league relationships, and the evolution of institutional sports investment.",
    fullContent: `In this 24-minute podcast episode, we speak with Ian Charles, co-founder and managing partner of Arctos Sports Partners, about the firm's approach to building the largest dedicated sports investment platform.

Arctos has deployed over $3 billion across minority positions in NBA, NHL, MLB, and MLS franchises, as well as investments in sports technology and media companies. Charles discusses:

- The firm's differentiated approach to league partnerships
- How minority investors add value beyond capital
- Valuation frameworks for sports assets
- The potential for secondary market liquidity
- Future opportunities in women's sports and international leagues

"We've built relationships over a decade that allow us to be a preferred partner for ownership groups," Charles explains. "That's not replicable overnight."

The conversation also covers Arctos' views on current market conditions, the impact of interest rates on sports valuations, and the firm's outlook for transaction activity in 2026.

Available on all podcast platforms.`,
    category: "Transactions",
    readTime: "24 min listen",
    author: "Podcast Team",
    type: "podcast",
    premium: true,
  },
  {
    id: "3",
    title: "Analysis: Why MLS Expansion Fees Will Likely Exceed $500 Million",
    excerpt: "The economic case for continued appreciation of Major League Soccer franchise values and expansion premiums.",
    fullContent: `Major League Soccer's expansion fee trajectory suggests the league's next batch of franchise awards could command premiums exceeding $500 million, according to analysis of comparable transactions and league financial metrics.

The most recent expansion fees—$325 million for St. Louis (2023) and $325 million for Charlotte (2022)—already represent substantial appreciation from the $200 million paid by Nashville and Inter Miami in 2020. Multiple factors suggest further escalation:

**Apple TV Partnership**
The league's 10-year, $2.5 billion media rights agreement with Apple represents a transformational revenue stream that was not fully priced into earlier expansion transactions. With guaranteed annual distribution exceeding $100 million per club by 2028, new franchises will enter with significantly improved economics.

**Stadium Economics**
Recent expansion markets have demonstrated the viability of purpose-built soccer stadiums in the 20,000-25,000 seat range, with development costs often subsidized by public-private partnerships. These venues generate substantial non-matchday revenue that enhances franchise cash flows.

**Comparable Transactions**
Secondary market sales provide additional valuation support. The Real Salt Lake transaction ($400 million, 2020) and Philadelphia Union minority sale ($75 million for 10%, 2022) suggest existing franchises are trading at premiums to recent expansion fees.

**Expansion Pipeline**
The league has indicated interest from multiple markets, including Las Vegas, San Diego, Phoenix, and Detroit. This competition for limited slots creates upward pressure on pricing.

League Commissioner Don Garber has suggested expansion could eventually reach 32 or 34 teams, creating a multi-year pipeline of high-value transactions that will continue to establish new valuation benchmarks.`,
    category: "Valuations",
    readTime: "6 min read",
    author: "Emma Rodriguez",
    type: "article",
    premium: true,
  },
  {
    id: "4",
    title: "Inside LIV Golf's Corporate Sponsorship Strategy",
    excerpt: "How the Saudi-backed tour is repositioning its commercial proposition to attract mainstream brand partners.",
    fullContent: `LIV Golf has significantly evolved its sponsorship approach since launching in 2022, shifting from a Saudi sovereign-fund-backed startup to a commercially-focused entity seeking mainstream brand partnerships, according to pitch materials reviewed by our editorial team.

The league's 2026 sponsorship prospectus, presented to potential partners at the recent Global Sports Summit, emphasizes several themes:

**Audience Demographics**
LIV presents data suggesting its fan base skews younger and more affluent than traditional golf audiences, with 52% of engaged viewers under 45 and median household income exceeding $150,000.

**Digital-First Distribution**
The league's streaming-focused distribution strategy, with primary rights held by YouTube and secondary platforms including CW Network, allows for targeted advertising and comprehensive viewer analytics not available through traditional golf broadcasts.

**Team Format Engagement**
LIV's team competition format has generated sponsorship opportunities at both league and franchise levels, with team sponsors able to build multi-year relationships with consistent rosters and dedicated fan bases.

**Event Experience**
The league positions its events as "sportainment" experiences with festival-like atmospheres, offering sponsors activation opportunities that extend beyond traditional tournament hospitality.

Current reported sponsors include Saudi tourism entities, Liv Ventures portfolio companies, and several luxury brands. The prospectus suggests the league is now pursuing categories including automotive, financial services, and consumer technology.

Industry observers note that the PGA Tour-LIV negotiations remain the key variable affecting commercial prospects, with a unified tour potentially commanding premium sponsorship rates while continued competition may fragment the market.`,
    category: "Sponsorship",
    readTime: "8 min read",
    author: "Thomas Wright",
    type: "article",
    premium: true,
  },
];

export function RelatedArticles() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const handleArticleClick = (article: Article) => {
    if (article.premium) {
      setSelectedArticle(article);
      setShowPaywall(true);
    }
  };

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
    <>
      <section className="border-t border-border py-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <h2 className="font-headline text-lg font-bold text-headline">
                Related Coverage
              </h2>
            </div>
            <a
              href="#"
              className="font-subhead text-sm text-accent hover:text-link-hover transition-colors flex items-center gap-1 group"
            >
              View All
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {mockArticles.map((article, index) => (
              <button
                key={article.id}
                onClick={() => handleArticleClick(article)}
                className="group block w-full text-left p-5 bg-card hover:bg-secondary/50 rounded-xl border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-soft animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-subhead text-sm text-accent font-medium">
                    {article.category}
                  </span>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-sm text-muted-foreground font-body">
                    {getTypeLabel(article.type)}
                  </span>
                  {article.premium && (
                    <Lock className="w-3 h-3 text-muted-foreground ml-auto" />
                  )}
                </div>
                
                <h3 className="font-headline text-base font-bold text-headline group-hover:text-accent transition-colors mb-2 leading-snug line-clamp-2">
                  {article.title}
                </h3>
                
                <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4 line-clamp-2">
                  {article.excerpt}
                </p>
                
                <div className="flex items-center text-xs text-muted-foreground font-body">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  {article.readTime}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Paywall Modal */}
      {showPaywall && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-subhead text-sm text-accent font-medium">
                  {selectedArticle.category}
                </span>
              </div>
              <h3 className="font-headline text-lg font-bold text-headline leading-snug mb-2">
                {selectedArticle.title}
              </h3>
              <p className="text-sm text-muted-foreground font-body">
                By {selectedArticle.author} · {selectedArticle.readTime}
              </p>
            </div>
            
            <div className="p-6">
              <p className="text-muted-foreground font-body leading-relaxed mb-6">
                {selectedArticle.excerpt}
              </p>
              
              <div className="relative">
                <p className="text-foreground font-body leading-relaxed line-clamp-4">
                  {selectedArticle.fullContent.split('\n')[0]}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent" />
              </div>
            </div>

            <div className="p-6 bg-surface-subtle rounded-b-2xl border-t border-border">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-accent" />
                </div>
                <h4 className="font-headline text-lg font-bold text-headline mb-2">
                  Subscribe to Continue Reading
                </h4>
                <p className="text-sm text-muted-foreground font-body">
                  Get unlimited access to all premium analysis, data, and insights.
                </p>
              </div>
              
              <div className="space-y-3">
                <button className="w-full py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
                  Subscribe — $29/month
                </button>
                <button className="w-full py-3 bg-card border border-border text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary transition-colors">
                  Already a member? Sign in
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowPaywall(false)}
              className="absolute top-4 right-4 p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
