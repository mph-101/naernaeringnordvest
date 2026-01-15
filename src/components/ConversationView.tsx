import { useState } from "react";
import { Search, ArrowRight, ArrowLeft, User, Sparkles, ExternalLink } from "lucide-react";

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
      content: `Based on our latest reporting and analysis, here's what you need to know about "${initialQuery}":\n\nThe situation continues to evolve with significant developments this week. Our correspondents on the ground report that key stakeholders are actively engaged in negotiations, with several proposals being discussed.\n\nExperts we've consulted suggest that the outcomes could have far-reaching implications for policy and public discourse. The editorial team has been tracking this story closely, synthesizing information from multiple verified sources.\n\nWould you like me to dive deeper into any specific aspect of this topic?`,
      sources: [
        { title: "Climate Summit: Day Three Analysis", url: "#", publication: "The Dispatch" },
        { title: "Expert Opinion: What's at Stake", url: "#", publication: "The Dispatch" },
        { title: "Timeline: How We Got Here", url: "#", publication: "Reuters" },
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
        content: `That's an excellent follow-up question. Let me provide more context on "${input}".\n\nOur investigative team has uncovered additional details that shed light on this aspect. The key findings suggest a more nuanced picture than initial reports indicated.\n\nIs there anything else you'd like to explore?`,
        sources: [
          { title: "Investigative Report: Deep Dive", url: "#", publication: "The Dispatch" },
        ],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-editorial text-xl font-medium text-headline">The Dispatch</h1>
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent/20 text-accent"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-2 font-body">
                    {message.role === "user" ? "You" : "The Dispatch"}
                  </p>
                  <div className="prose prose-neutral max-w-none">
                    <p className="text-foreground font-body leading-relaxed whitespace-pre-line">
                      {message.content}
                    </p>
                  </div>
                  
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-body font-medium">
                        Sources
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.url}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-surface-subtle hover:bg-secondary rounded-lg text-sm font-body text-foreground/80 hover:text-foreground transition-colors group"
                          >
                            <span className="text-xs text-muted-foreground">{source.publication}</span>
                            <span className="text-border">·</span>
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
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse-subtle" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2 font-body">
                  The Dispatch
                </p>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6">
          <div className="relative bg-surface-elevated border border-border rounded-2xl shadow-soft">
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
                className="ml-3 p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
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
