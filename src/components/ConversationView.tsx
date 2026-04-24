import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, ArrowLeft, User, Bot, FileText, Copy, Check, Share2, ExternalLink, Rss, Database, FileText as FileTextIcon, Globe } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { streamArticlesChat, type ArticleSource, type TrustedSource } from "@/lib/articles-chat";
import { toast } from "@/hooks/use-toast";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ArticleSource[];
  trustedSources?: TrustedSource[];
}

interface ConversationViewProps {
  initialQuery: string;
  onBack: () => void;
}

export function ConversationView({ initialQuery, onBack }: ConversationViewProps) {
  const { language } = useTheme();
  const t = translations[language];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const hasStarted = useRef(false);

  const linkifyCitations = (content: string, sources?: ArticleSource[], assistantId?: string) => {
    if (!content) return content;
    const validNumbers = new Set((sources ?? []).map((s) => s.n));
    return content.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (match, group: string) => {
      const nums = group.split(",").map((n) => n.trim());
      const parts = nums.map((n) => {
        const num = Number(n);
        if (!validNumbers.has(num)) return `[${n}]`;
        return `[\\[${n}\\]](#src-${assistantId}-${num})`;
      });
      return parts.join("");
    });
  };

  const handleCitationClick = (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
    if (!href || !href.startsWith("#src-")) return;
    e.preventDefault();
    const el = document.getElementById(href.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-accent", "rounded");
      setTimeout(() => el.classList.remove("ring-2", "ring-accent", "rounded"), 1500);
    }
  };

  const sendMessage = async (rawInput: string, history: Message[]) => {
    const trimmed = rawInput.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const nextMessages = [...history, userMessage];
    const assistantId = crypto.randomUUID();
    let assistantContent = "";
    let assistantSources: ArticleSource[] | undefined;

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    const upsertAssistant = (chunk: string, sources?: ArticleSource[]) => {
      if (chunk) assistantContent += chunk;
      if (sources) assistantSources = sources;

      setMessages((prev) => {
        const assistantMessage: Message = {
          id: assistantId,
          role: "assistant",
          content: assistantContent,
          sources: assistantSources,
        };
        const existingIndex = prev.findIndex((message) => message.id === assistantId);
        if (existingIndex >= 0) {
          return prev.map((message, index) => index === existingIndex ? assistantMessage : message);
        }
        return [...prev, assistantMessage];
      });
    };

    try {
      await streamArticlesChat({
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        onContent: (chunk) => upsertAssistant(chunk),
        onSources: (sources) => upsertAssistant("", sources),
      });
    } catch (error) {
      upsertAssistant(error instanceof Error ? error.message : "Noe gikk galt, prøv igjen.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    void sendMessage(initialQuery, []);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input, messages);
  };

  const buildPlainText = (message: Message) => {
    const stripped = message.content.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (_m, g) => `[${g}]`);
    if (!message.sources?.length) return stripped;
    const sourceLines = message.sources
      .map((s) => `[${s.n}] ${s.title}${s.author ? ` — ${s.author}` : ""}`)
      .join("\n");
    return `${stripped}\n\n${t.sources}:\n${sourceLines}`;
  };

  const handleCopyAnswer = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(buildPlainText(message));
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId((id) => (id === message.id ? null : id)), 1800);
    } catch {
      toast({ description: "Kunne ikke kopiere", variant: "destructive" });
    }
  };

  const handleShareConversation = async () => {
    const url = window.location.href;
    const title = `${t.brandName} ${t.brandSub}`.trim();
    const text = messages.find((m) => m.role === "user")?.content?.slice(0, 140) ?? "";
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user cancelled or share failed — fall back to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
      toast({ description: t.shareLinkCopied });
    } catch {
      toast({ description: "Kunne ikke dele", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="font-headline text-lg font-bold text-headline flex-1">{t.brandName} {t.brandSub}</span>
          <button
            onClick={handleShareConversation}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={t.shareConversation}
            aria-label={t.shareConversation}
          >
            {shareCopied ? <Check className="w-4 h-4 text-accent" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline font-subhead">{shareCopied ? t.shareLinkCopied : t.shareConversation}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <div className="space-y-8">
          {messages.map((message, index) => (
            <div key={message.id} className="animate-fade-up" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === "user" ? "bg-secondary" : "bg-accent/10"}`}>
                  {message.role === "user" ? <User className="w-5 h-5 text-foreground/70" /> : <Bot className="w-5 h-5 text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-subhead text-sm text-muted-foreground mb-2">
                    {message.role === "user" ? t.you : `${t.brandName} ${t.brandSub}`}
                  </p>
                  {message.role === "user" ? (
                    <div className="text-foreground font-body leading-relaxed whitespace-pre-line">{message.content}</div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none font-body [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 leading-[1.7] text-base">{children}</p>,
                          ul: ({ children }) => <ul className="mb-3 space-y-1 pl-5 list-disc marker:text-primary/60">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-3 space-y-1 pl-5 list-decimal marker:text-primary/60">{children}</ol>,
                          li: ({ children }) => <li className="leading-[1.6]">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-headline">{children}</strong>,
                          a: ({ href, children }) => {
                            const isCitation = href?.startsWith("#src-");
                            if (isCitation) {
                              const num = Number(href!.split("-").pop());
                              const source = message.sources?.find((s) => s.n === num);
                              const link = (
                                <a
                                  href={href}
                                  onClick={(e) => handleCitationClick(e, href)}
                                  className="text-accent font-mono text-xs align-super no-underline hover:underline"
                                >
                                  {children}
                                </a>
                              );
                              if (!source) return link;
                              return (
                                <HoverCard openDelay={150} closeDelay={80}>
                                  <HoverCardTrigger asChild>{link}</HoverCardTrigger>
                                  <HoverCardContent
                                    side="top"
                                    align="center"
                                    className="w-80 p-4 bg-card border border-border shadow-soft"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-baseline gap-2">
                                        <span className="font-mono text-xs text-muted-foreground shrink-0">[{source.n}]</span>
                                        <Link
                                          to={`/article/${source.id}`}
                                          className="font-headline text-sm font-semibold text-headline hover:text-primary transition-colors leading-snug"
                                        >
                                          {source.title}
                                        </Link>
                                      </div>
                                      {source.excerpt && (
                                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                          {source.excerpt}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                                        {source.author && <span>{source.author}</span>}
                                        {source.author && source.published_at && <span>·</span>}
                                        {source.published_at && (
                                          <span>{new Date(source.published_at).toLocaleDateString(language === "no" ? "nb-NO" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                        )}
                                      </div>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              );
                            }
                            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>;
                          },
                        }}
                      >
                        {linkifyCitations(message.content, message.sources, message.id)}
                      </ReactMarkdown>
                    </div>
                  )}
                  {message.sources && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="font-subhead text-sm text-muted-foreground mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{t.sources}</p>
                      <ol className="space-y-2">
                        {message.sources.map((source) => (
                          <li key={source.id} id={`src-${message.id}-${source.n}`} className="text-sm leading-relaxed scroll-mt-24">
                            <span className="text-muted-foreground font-mono mr-2">[{source.n}]</span>
                            <Link to={`/article/${source.id}`} className="text-primary hover:underline">
                              {source.title}
                            </Link>
                            {source.author && <span className="text-muted-foreground"> — {source.author}</span>}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {message.role === "assistant" && message.content && !(isLoading && index === messages.length - 1) && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleCopyAnswer(message)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-subhead"
                        aria-label={t.copyAnswer}
                      >
                        {copiedId === message.id ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === message.id ? t.copied : t.copyAnswer}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center"><Bot className="w-5 h-5 text-accent" /></div>
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
