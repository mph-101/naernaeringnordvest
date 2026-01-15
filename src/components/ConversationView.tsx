import { useState } from "react";
import { Search, ArrowRight, ArrowLeft, User, Sparkles, ExternalLink, TrendingUp } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; url: string; publication: string }[];
}

interface ConversationViewProps {
  initialQuery: string;
  onBack: () => void;
}

export function ConversationView({ initialQuery, onBack }: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "user",
      content: initialQuery,
    },
    {
      id: "2",
      role: "assistant",
      content: `Here's what our analysis shows about "${initialQuery}":\n\n**Key Market Developments:**\nThe sports business landscape is experiencing significant shifts. Private equity investment in professional sports has reached record levels, with over $30 billion deployed in the sector over the past 18 months.\n\n**Financial Highlights:**\n• Media rights valuations continue to climb, driven by streaming competition\n• Franchise valuations have increased 15-25% year-over-year across major leagues\n• Sponsorship revenue is rebounding to pre-pandemic levels with new categories emerging\n\n**What's Driving This:**\nInvestors view sports assets as recession-resistant with strong revenue growth potential. The scarcity of franchise opportunities and expanding international markets are key factors.\n\nWould you like me to dive deeper into valuations, specific leagues, or deal structures?`,
      sources: [
        { title: "Q4 Sports Investment Report", url: "#", publication: "Sport Business Wire" },
        { title: "Private Equity in Sports: 2024 Analysis", url: "#", publication: "Sport Business Wire" },
        { title: "Global Media Rights Tracker", url: "#", publication: "Bloomberg Sports" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Great follow-up on "${input}".\n\n**Additional Context:**\nOur data team has compiled the latest figures on this topic. The numbers show a clear trend toward consolidation and vertical integration across the industry.\n\n**Key Takeaways:**\n• Transaction multiples remain elevated despite market volatility\n• Strategic buyers are outbidding financial sponsors in competitive processes\n• International expansion remains a priority for major franchises\n\nNeed more specific data points or regional breakdowns?`,
        sources: [
          { title: "Deal Flow Analysis: Sports M&A", url: "#", publication: "Sport Business Wire" },
        ],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-primary border-b-4 border-accent">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-primary-foreground/10 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-accent px-1.5 py-0.5">
              <span className="font-headline text-xs font-bold text-accent-foreground">SPORT</span>
            </div>
            <h1 className="font-headline text-lg font-bold text-primary-foreground">Business Wire</h1>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <div className="space-y-8">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex gap-4">
                <div
                  className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-subhead text-xs font-semibold text-muted-foreground mb-2 tracking-wider">
                    {message.role === "user" ? "You" : "Sport Business Wire"}
                  </p>
                  <div className="prose prose-neutral max-w-none">
                    <div className="text-foreground font-body leading-relaxed whitespace-pre-line text-[15px]">
                      {message.content}
                    </div>
                  </div>
                  
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <p className="font-subhead text-xs tracking-wider text-muted-foreground mb-3 font-semibold">
                        Sources
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.url}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-surface-subtle hover:bg-secondary border border-border rounded text-sm font-body text-foreground/80 hover:text-foreground transition-colors group hover:border-accent/50"
                          >
                            <span className="text-xs text-accent font-semibold">{source.publication}</span>
                            <span className="text-border">|</span>
                            <span>{source.title}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 animate-fade-in">
              <div className="w-9 h-9 rounded bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 animate-pulse-subtle" />
              </div>
              <div className="flex-1">
                <p className="font-subhead text-xs font-semibold text-muted-foreground mb-2 tracking-wider">
                  Sport Business Wire
                </p>
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6">
          <div className="relative bg-surface-elevated border-2 border-border rounded-lg shadow-soft focus-within:border-accent">
            <div className="flex items-center px-5 py-3">
              <Search className="w-5 h-5 text-muted-foreground mr-3 flex-shrink-0" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="flex-1 bg-transparent outline-none text-base font-body text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="ml-3 px-4 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-subhead text-xs font-bold tracking-wider"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
