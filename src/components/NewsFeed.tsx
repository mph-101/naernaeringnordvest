import { useState } from "react";
import { Clock, Play, Headphones, FileText, Lock, BarChart3 } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  fullContent: string;
  category: string;
  readTime: string;
  publishedAt: string;
  author: string;
  type: "article" | "video" | "podcast";
  featured?: boolean;
  premium?: boolean;
}

const topics = [
  "All",
  "Transactions",
  "Media Rights",
  "Valuations",
  "Leagues",
  "Sponsorship",
  "Analysis",
];

const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "NFL Media Rights Renewal: Amazon and Apple Positioning for $3B Sunday Ticket Package",
    excerpt: "Technology giants are preparing competing bids as the league seeks a significant premium over the current agreement with Google.",
    fullContent: `The National Football League is approaching a pivotal moment in its media strategy as Amazon and Apple position themselves as leading contenders for the Sunday Ticket out-of-market package, currently valued at approximately $2.5 billion annually.

According to sources familiar with the negotiations, the league is seeking bids that would represent a 20-25% increase over the current deal structure with YouTube, which acquired the rights in 2023 for $2 billion per year.

Amazon, which already holds exclusive Thursday Night Football rights through 2033, views Sunday Ticket as a complementary asset that could significantly boost Prime Video's sports portfolio. The company has reportedly discussed packaging scenarios that would include enhanced interactive features and integration with its broader e-commerce ecosystem.

Apple, meanwhile, sees the package as a flagship offering for its TV+ service, which has struggled to compete with established streaming platforms despite significant investment in original content and Major League Soccer rights.

"Both companies understand that live sports represent the last remaining category of must-watch television," said Richard Broughton, media analyst at Ampere Analysis. "Sunday Ticket is particularly attractive because it captures the most dedicated NFL fans—a demographic that's highly valuable to advertisers."

The current YouTube deal, which runs through the 2030-31 season, includes performance clauses that could allow for early renegotiation under certain conditions. League executives have indicated they will begin formal discussions with potential bidders in the second quarter of 2026.

Notably, the NFL has also explored scenarios involving multiple technology partners, potentially splitting the package by geographic region or distribution platform. This approach, while complex, could maximize total rights value while reducing risk concentration.

Industry observers expect a decision by late 2026, with any new arrangement likely taking effect for the 2031 season.`,
    category: "Media Rights",
    readTime: "6 min read",
    publishedAt: "2 hours ago",
    author: "Michael Chen",
    type: "article",
    featured: true,
    premium: true,
  },
  {
    id: "2",
    title: "Chelsea FC Valuation Reaches £4.2B Following Stadium Development Approval",
    excerpt: "The Boehly-Clearlake ownership group has secured planning consent for Stamford Bridge expansion, significantly enhancing franchise value.",
    fullContent: `Chelsea Football Club's enterprise value has climbed to an estimated £4.2 billion following the approval of a comprehensive £2.5 billion redevelopment plan for Stamford Bridge, according to a new analysis by KPMG Sports Advisory.

The valuation represents a 68% increase from the £2.5 billion purchase price paid by the Todd Boehly-led consortium in May 2022, reflecting both the stadium development potential and the club's improved commercial position under new ownership.

The approved plans include expanding the stadium capacity from 42,000 to approximately 60,000 seats, adding a hotel and conference facilities, and creating a new public plaza along Fulham Road. Construction is expected to begin in 2027, with completion targeted for the 2030-31 season.

"Stadium development has become the primary value driver for elite European clubs," said Andrea Sartori, global head of sports at KPMG. "The gap between clubs with modern, multi-use facilities and those without is widening significantly."

The expansion will require Chelsea to play at a temporary home—likely Wembley Stadium or Tottenham Hotspur Stadium—for up to three seasons, a logistical challenge that ownership believes is outweighed by the long-term commercial benefits.

Under the new stadium configuration, Chelsea projects matchday revenue could triple to approximately £180 million annually, bringing the club closer to parity with rivals Manchester United and Liverpool.`,
    category: "Valuations",
    readTime: "5 min read",
    publishedAt: "4 hours ago",
    author: "Sarah Williams",
    type: "article",
    premium: true,
  },
  {
    id: "3",
    title: "Documentary: Inside the NBA's $1B Africa Expansion Strategy",
    excerpt: "An exclusive look at how the Basketball Africa League is building infrastructure and developing talent across the continent.",
    fullContent: `This 28-minute documentary provides unprecedented access to the NBA's Africa operations, examining the league's billion-dollar investment thesis for the world's youngest and fastest-growing continent.

The film follows Commissioner Adam Silver and Basketball Africa League President Amadou Gallo Fall as they visit new training facilities in Rwanda and Senegal, meet with potential franchise investors, and outline the league's 20-year growth roadmap.

Key themes include:
- The BAL's expansion from 12 to 16 teams by 2028
- Partnership discussions with sovereign wealth funds from Nigeria, Kenya, and Egypt  
- Youth development programs reaching over 3 million participants
- Media rights negotiations with African streaming platforms
- The economic case for building NBA-quality arenas in Lagos, Nairobi, and Johannesburg

"Africa represents the future of basketball," Silver states in the documentary. "The question isn't whether this market will be significant—it's whether we're investing enough, fast enough."`,
    category: "Leagues",
    readTime: "28 min watch",
    publishedAt: "6 hours ago",
    author: "Documentary Team",
    type: "video",
    premium: true,
  },
  {
    id: "4",
    title: "Private Equity in Sports: Q4 Transaction Volume Exceeds $8 Billion",
    excerpt: "Blackstone, Silver Lake, and Sixth Street lead a record quarter for minority stake investments across major professional leagues.",
    fullContent: `Private equity investment in professional sports reached unprecedented levels in the fourth quarter, with total transaction volume exceeding $8 billion across announced and completed deals, according to PitchBook data compiled for this report.

The surge was driven by a combination of league policy liberalization, declining interest rates, and continued belief among institutional investors that sports assets offer inflation-protected returns with significant upside potential.

Notable transactions included:

**NBA Investments**
- Arctos Partners acquired a 13% stake in the Memphis Grizzlies at a $2.8 billion valuation
- Sixth Street expanded its Phoenix Suns position to 25% ($1.2 billion incremental investment)
- Blue Owl Capital completed initial positions in three undisclosed franchises

**European Football**
- CVC Capital Partners finalized a €1.5 billion investment in the French Ligue 1 media rights structure
- Silver Lake increased its Manchester City Football Group stake to 20%
- RedBird Capital closed acquisition of remaining AC Milan shares

**Emerging Opportunities**
- Multiple PE firms are now exploring investments in women's sports leagues, with valuations rising 40-60% year-over-year
- Esports remains a challenging category despite persistent investor interest

"We're seeing a fundamental shift in how sports are valued," said David Blitzer, co-founder of Harris Blitzer Sports & Entertainment. "The convergence of media, technology, and live entertainment has created a new asset class that institutional investors can no longer ignore."

Looking ahead, industry analysts expect transaction activity to remain elevated, with particular focus on leagues that have recently opened or expanded private equity access, including the NFL and NHL.`,
    category: "Transactions",
    readTime: "8 min read",
    publishedAt: "8 hours ago",
    author: "James Morrison",
    type: "article",
    premium: true,
  },
  {
    id: "5",
    title: "The Deal Sheet: Weekly Transactions Briefing",
    excerpt: "A comprehensive review of this week's M&A activity, including terms, valuations, and emerging opportunities.",
    fullContent: `Your weekly audio briefing on the most significant sports business transactions, featuring analysis from our team of M&A specialists and guest commentary from leading dealmakers.

This Week's Coverage:
- Deep dive on the Sacramento Kings minority sale process
- Update on Serie A media rights auction
- Analysis of Endeavor's potential strategic alternatives
- Early indications for 2026 franchise transaction pipeline

Runtime: 22 minutes

Featured Guests:
- Marc Lasry, Co-owner, Milwaukee Bucks
- Sarah Kessler, Partner, Kirkland & Ellis Sports M&A Practice`,
    category: "Transactions",
    readTime: "22 min listen",
    publishedAt: "10 hours ago",
    author: "Deal Sheet Team",
    type: "podcast",
    premium: true,
  },
  {
    id: "6",
    title: "Saudi PIF Enters Advanced Talks for Formula One Constructorship Stake",
    excerpt: "The Kingdom's sovereign wealth fund is negotiating for a significant minority position in a leading F1 team.",
    fullContent: `Saudi Arabia's Public Investment Fund has entered advanced negotiations to acquire a minority stake in a top-tier Formula One constructor, according to three sources with direct knowledge of the discussions.

The investment, which could value the target team at approximately $4.5 billion, would represent PIF's first direct ownership position in motorsport following years of sponsorship activity with multiple constructors and the kingdom's hosting of the Saudi Arabian Grand Prix since 2021.

Sources declined to identify the specific team under negotiation, though they indicated discussions are focused on constructors currently competing in the top half of the championship standings.

"PIF has been methodical in building their sports portfolio," said a banking source advising on the transaction. "This would be a natural extension of their motorsport strategy and provides exposure to one of the fastest-growing global sports properties."

Formula One has experienced dramatic valuation expansion since Liberty Media's 2017 acquisition, with the most recent team transactions—the Sauber-Audi partnership and Andretti's unsuccessful expansion bid—suggesting enterprise values between $800 million and $1.5 billion for mid-tier constructors.

A top-four team investment would represent a significant premium to these benchmarks, reflecting both competitive position and commercial potential.

PIF declined to comment. Formula One Management did not respond to requests for comment.`,
    category: "Transactions",
    readTime: "5 min read",
    publishedAt: "12 hours ago",
    author: "Alexandra Reid",
    type: "article",
    premium: true,
  },
];

export function NewsFeed() {
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

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

  const handleArticleClick = (item: NewsItem) => {
    if (item.premium) {
      setSelectedArticle(item);
      setShowPaywall(true);
    }
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
                Latest Analysis
              </h2>
            </div>
          </div>

          {/* Topic Filters */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-6 px-6">
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
                      Premium
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
                  <span>By {featuredItem.author}</span>
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
              Load More Stories
            </button>
          </div>
        </div>
      </section>

      {/* Paywall Modal */}
      {showPaywall && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
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
