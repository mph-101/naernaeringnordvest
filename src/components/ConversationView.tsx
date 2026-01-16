import { useState } from "react";
import { Search, ArrowRight, ArrowLeft, User, ExternalLink, BarChart3 } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";

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
  const { language } = useTheme();
  const t = translations[language];

  const getInitialResponse = () => {
    if (language === "no") {
      return `Her er vår analyse av "${initialQuery}":\n\n**Viktige markedsutviklinger:**\nSportsbransjens landskap gjennomgår betydelige endringer. Private equity-investeringer i profesjonell idrett har nådd rekordnivåer, med over 30 milliarder dollar investert i sektoren de siste 18 månedene.\n\n**Finansielle høydepunkter:**\n• Verdivurderinger av medierettigheter fortsetter å stige, drevet av strømmingskonkurranse\n• Franchiseverdier har økt 15-25% år-over-år på tvers av store ligaer\n• Sponsorinntekter er tilbake til pre-pandemi nivåer med nye kategorier som dukker opp\n\n**Hva driver dette:**\nInvestorer ser på sportsaktiva som resesjonsbestandige med sterkt inntektsvekstpotensial. Knapphet på franchisemuligheter og ekspanderende internasjonale markeder er nøkkelfaktorer.`;
    }
    return `Here's what our analysis shows about "${initialQuery}":\n\n**Key Market Developments:**\nThe sports business landscape is experiencing significant shifts. Private equity investment in professional sports has reached record levels, with over $30 billion deployed in the sector over the past 18 months.\n\n**Financial Highlights:**\n• Media rights valuations continue to climb, driven by streaming competition\n• Franchise valuations have increased 15-25% year-over-year across major leagues\n• Sponsorship revenue is rebounding to pre-pandemic levels with new categories emerging\n\n**What's Driving This:**\nInvestors view sports assets as recession-resistant with strong revenue growth potential. The scarcity of franchise opportunities and expanding international markets are key factors.`;
  };

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "user", content: initialQuery },
    {
      id: "2",
      role: "assistant",
      content: getInitialResponse(),
      sources: [
        { title: language === "no" ? "Q4 Sportsinvestering Rapport" : "Q4 Sports Investment Report", url: "#", publication: "Sport Business Journal" },
        { title: language === "no" ? "Private Equity i Sport: 2024 Analyse" : "Private Equity in Sports: 2024 Analysis", url: "#", publication: "Sport Business Journal" },
        { title: language === "no" ? "Global Medierettigheter Tracker" : "Global Media Rights Tracker", url: "#", publication: "Bloomberg" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: input }]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const response = language === "no"
        ? `Ytterligere kontekst om "${input}":\n\n**Analyse:**\nVårt datateam har samlet de siste tallene om dette emnet. Tallene viser en klar trend mot konsolidering og vertikal integrasjon på tvers av bransjen.\n\n**Hovedpunkter:**\n• Transaksjonsmultipler forblir høye til tross for markedsvolatilitet\n• Strategiske kjøpere overbyr finansielle sponsorer i konkurranseprosesser\n• Internasjonal ekspansjon forblir en prioritet for store franchiser`
        : `Additional context on "${input}":\n\n**Analysis:**\nOur data team has compiled the latest figures on this topic. The numbers show a clear trend toward consolidation and vertical integration across the industry.\n\n**Key Takeaways:**\n• Transaction multiples remain elevated despite market volatility\n• Strategic buyers are outbidding financial sponsors in competitive processes\n• International expansion remains a priority for major franchises`;

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        sources: [{ title: language === "no" ? "Deal Flow Analyse: Sports M&A" : "Deal Flow Analysis: Sports M&A", url: "#", publication: "Sport Business Journal" }],
      }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="font-headline text-lg font-bold text-headline">{t.brandName} {t.brandSub}</span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <div className="space-y-8">
          {messages.map((message, index) => (
            <div key={message.id} className="animate-fade-up" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === "user" ? "bg-secondary" : "bg-accent/10"}`}>
                  {message.role === "user" ? <User className="w-5 h-5 text-foreground/70" /> : <BarChart3 className="w-5 h-5 text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-subhead text-sm text-muted-foreground mb-2">
                    {message.role === "user" ? t.you : `${t.brandName} ${t.brandSub}`}
                  </p>
                  <div className="text-foreground font-body leading-relaxed whitespace-pre-line">{message.content}</div>
                  {message.sources && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="font-subhead text-sm text-muted-foreground mb-3">{t.sources}</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, idx) => (
                          <a key={idx} href={source.url} className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-sm font-body hover:border-accent/30 hover:shadow-soft transition-all">
                            <span className="text-accent font-medium">{source.publication}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-foreground/80">{source.title}</span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
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
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-accent" /></div>
              <div className="flex gap-1.5 pt-4">
                <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6">
          <div className="relative bg-card border border-border rounded-2xl shadow-soft focus-within:border-accent">
            <div className="flex items-center px-5 py-3">
              <Search className="w-5 h-5 text-muted-foreground mr-4" />
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.followUp} className="flex-1 bg-transparent outline-none font-body text-foreground placeholder:text-muted-foreground" disabled={isLoading} />
              <button type="submit" disabled={!input.trim() || isLoading} className="ml-3 p-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 transition-all">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
