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
      return `Her er vår analyse av «${initialQuery}»:\n\n**Norsk fotball i tall:**\nEliteserien-klubbene omsatte for totalt 2,1 milliarder kroner i 2023 — en vekst på over 20 % fra 2022. Bodø/Glimt alene sto for nesten 380 MNOK, godt hjulpet av Europa-deltakelse og rekordstore spillersalg.\n\n**Viktige trender:**\n• Spillersalg er nå den viktigste enkeltinntektskilden for de beste klubbene\n• TV-avtalens verdi diskuteres — ny runde med Viaplay starter 2025\n• Privat kapital begynner å vise interesse for norske klubber\n\n**Hva driver dette:**\nNorske talenter etterspørres i Europa. Kombinasjonen av lave lønninger, god akademimodell og UEFA-rankingpoeng gjør Eliteserien-klubber til attraktive selgere.`;
    }
    return `Here's our analysis of "${initialQuery}":\n\n**Norwegian Football in Numbers:**\nEliteserien clubs generated a combined NOK 2.1 billion in revenue in 2023 — growth of over 20% from 2022. Bodø/Glimt alone accounted for nearly 380 MNOK, boosted by European competition and record player sales.\n\n**Key Trends:**\n• Player sales are now the single most important revenue stream for top clubs\n• The value of the TV deal is under discussion — new negotiations with Viaplay start in 2025\n• Private capital is beginning to show interest in Norwegian clubs\n\n**What's Driving This:**\nNorwegian talent is in demand across Europe. The combination of low wages, strong academy models and UEFA ranking points make Eliteserien clubs attractive sellers.`;
  };

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "user", content: initialQuery },
    {
      id: "2",
      role: "assistant",
      content: getInitialResponse(),
      sources: [
        { title: language === "no" ? "Eliteserien Årsrapport 2023" : "Eliteserien Annual Report 2023", url: "#", publication: "NFF" },
        { title: language === "no" ? "Spillersalg og akademiinntekter" : "Player Sales and Academy Revenue", url: "#", publication: "Transfermarkt" },
        { title: language === "no" ? "Norsk Toppfotball Økonomianalyse" : "Norwegian Top Football Economic Analysis", url: "#", publication: "Deloitte Sports" },
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
        ? `Mer om «${input}»:\n\n**Analyse:**\nVårt datateam har sett nærmere på dette. Tallene fra norsk toppfotball viser at det er store strukturelle forskjeller mellom klubbene — særlig mellom de som har investert i akademiutvikling og de som er avhengige av kortsiktige løsninger.\n\n**Nøkkelpunkter:**\n• Klubber med sterke akademier omsetter talenter til 3–5× kostpris\n• Europa-inntekter kan doble en middels norsk klubbs totalomsetning\n• Egenkapitalgraden varierer fra under 10 % til over 60 % i Eliteserien`
        : `Additional context on "${input}":\n\n**Analysis:**\nOur data team has examined this closely. Figures from Norwegian top football reveal large structural differences between clubs — especially between those who have invested in academy development and those relying on short-term fixes.\n\n**Key Takeaways:**\n• Clubs with strong academies sell talent at 3–5× cost price\n• European revenue can double a mid-sized Norwegian club's total turnover\n• Equity ratios vary from below 10% to over 60% across Eliteserien`;

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        sources: [{ title: language === "no" ? "Eliteserien Økonomirapport" : "Eliteserien Financial Report", url: "#", publication: "NFF / Deloitte" }],
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
