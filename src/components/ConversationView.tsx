import { Children, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, ArrowLeft, User, Bot, Copy, Check, Share2, ExternalLink, Rss, Database, FileText as FileTextIcon, Globe, MessageSquare, BarChart3, Building2, Users as UsersIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { streamArticlesChat, type ArticleSource, type TrustedSource, type BrregResult, type BrregDisambiguation } from "@/lib/articles-chat";
import { toast } from "@/hooks/use-toast";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { SourceVerificationLog } from "@/components/SourceVerificationLog";
import { ConversationSourceTimeline } from "@/components/ConversationSourceTimeline";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ArticleSource[];
  trustedSources?: TrustedSource[];
  brregResults?: BrregResult[];
  disambiguation?: BrregDisambiguation;
}

interface ConversationViewProps {
  initialQuery: string;
  onBack: () => void;
  /**
   * Called whenever the aggregated set of article sources used across the
   * conversation changes. Lets the parent mirror the same articles in a
   * "Related coverage" strip below the chat.
   */
  onSourcesChange?: (sources: ArticleSource[]) => void;
}

export function ConversationView({ initialQuery, onBack, onSourcesChange }: ConversationViewProps) {
  const { language } = useTheme();
  const t = translations[language];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "timeline">("chat");
  const hasStarted = useRef(false);
  // Aggregate ALL article sources across the conversation, de-duplicated by id,
  // newest-turn first. Bubbled up to the parent so the related-coverage strip
  // shows the very same articles the AI cited.
  useEffect(() => {
    if (!onSourcesChange) return;
    const seen = new Set<string>();
    const aggregated: ArticleSource[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant" || !m.sources) continue;
      for (const s of m.sources) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        aggregated.push(s);
      }
    }
    onSourcesChange(aggregated);
  }, [messages, onSourcesChange]);
  // Build aggregated source timeline data: pair every assistant turn with the
  // user question that triggered it.
  const assistantTurns = (() => {
    const out: {
      id: string;
      question: string;
      content: string;
      sources?: ArticleSource[];
      trustedSources?: TrustedSource[];
    }[] = [];
    let lastUser = "";
    for (const m of messages) {
      if (m.role === "user") {
        lastUser = m.content;
      } else if (m.content) {
        out.push({
          id: m.id,
          question: lastUser,
          content: m.content,
          sources: m.sources,
          trustedSources: m.trustedSources,
        });
      }
    }
    return out;
  })();

  const linkifyCitations = (
    content: string,
    sources?: ArticleSource[],
    trustedSources?: TrustedSource[],
    assistantId?: string,
    brregResults?: BrregResult[],
  ) => {
    if (!content) return content;
    const validNumbers = new Set<number>([
      ...(sources ?? []).map((s) => s.n),
      ...(trustedSources ?? []).map((s) => s.n),
    ]);
    const hasBrreg = (brregResults?.length ?? 0) > 0;
    let out = content;
    if (hasBrreg) {
      out = out.replace(/\[B\]/g, () => `[\\[B\\]](#brreg-${assistantId})`);
    }
    return out.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (match, group: string) => {
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

  /**
   * Walks paragraph children and wraps every sentence that contains a
   * citation link (`<a href="#src-...">`) in a highlighted span. This makes
   * it visually obvious which statements are backed by a source.
   */
  const highlightCitedSentences = (children: ReactNode): ReactNode => {
    // Sentence boundary: . ! ? optionally followed by closing quote/paren, then space.
    const SENTENCE_RE = /[^.!?]+[.!?]+["')\]]?\s*|[^.!?]+$/g;
    type Token = { kind: "text"; text: string } | { kind: "node"; node: ReactNode };
    const tokens: Token[] = [];

    Children.forEach(children, (child) => {
      if (typeof child === "string") {
        const matches = child.match(SENTENCE_RE);
        if (matches) {
          for (const m of matches) tokens.push({ kind: "text", text: m });
        } else if (child.length) {
          tokens.push({ kind: "text", text: child });
        }
      } else if (typeof child === "number" || typeof child === "boolean") {
        tokens.push({ kind: "text", text: String(child) });
      } else {
        tokens.push({ kind: "node", node: child });
      }
    });

    // Group tokens into sentences. A new sentence starts after any text token
    // whose text ends with sentence-terminating punctuation.
    const sentences: Token[][] = [[]];
    for (const tok of tokens) {
      sentences[sentences.length - 1].push(tok);
      if (tok.kind === "text" && /[.!?]["')\]]?\s*$/.test(tok.text)) {
        sentences.push([]);
      }
    }
    if (sentences[sentences.length - 1].length === 0) sentences.pop();

    const isCitationNode = (n: ReactNode): boolean => {
      if (!isValidElement(n)) return false;
      const el = n as ReactElement<{ href?: string }>;
      return typeof el.props?.href === "string" && el.props.href.startsWith("#src-");
    };

    return sentences.map((group, i) => {
      const hasCitation = group.some((t) => t.kind === "node" && isCitationNode(t.node));
      const rendered = group.map((t, j) =>
        t.kind === "text" ? (
          <span key={j}>{t.text}</span>
        ) : (
          <span key={j}>{t.node}</span>
        ),
      );
      if (!hasCitation) return <span key={i}>{rendered}</span>;
      return (
        <mark
          key={i}
          className="bg-accent/10 text-foreground rounded-sm px-0.5 -mx-0.5 decoration-accent/40 underline decoration-dotted underline-offset-4"
          title="Setning støttet av kilde"
        >
          {rendered}
        </mark>
      );
    });
  };

  const sendMessage = async (rawInput: string, history: Message[]) => {
    const trimmed = rawInput.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const nextMessages = [...history, userMessage];
    const assistantId = crypto.randomUUID();
    let assistantContent = "";
    let assistantSources: ArticleSource[] | undefined;
    let assistantTrustedSources: TrustedSource[] | undefined;
    let assistantBrreg: BrregResult[] | undefined;
    let assistantDisambig: BrregDisambiguation | undefined;

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    const upsertAssistant = (
      chunk: string,
      sources?: ArticleSource[],
      trustedSources?: TrustedSource[],
      brregResults?: BrregResult[],
      disambiguation?: BrregDisambiguation,
    ) => {
      if (chunk) assistantContent += chunk;
      if (sources) assistantSources = sources;
      if (trustedSources) assistantTrustedSources = trustedSources;
      if (brregResults) assistantBrreg = brregResults;
      if (disambiguation) assistantDisambig = disambiguation;

      setMessages((prev) => {
        const assistantMessage: Message = {
          id: assistantId,
          role: "assistant",
          content: assistantContent,
          sources: assistantSources,
          trustedSources: assistantTrustedSources,
          brregResults: assistantBrreg,
          disambiguation: assistantDisambig,
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
        onSources: (sources, trustedSources, brregResults) =>
          upsertAssistant("", sources, trustedSources, brregResults),
        onDisambiguation: (data) => {
          // Render a friendly prompt instead of leaving the bubble empty.
          upsertAssistant(
            language === "no"
              ? `Jeg fant flere selskaper med dette navnet. Hvilket mener du?`
              : `I found several companies with this name. Which one do you mean?`,
            undefined,
            undefined,
            undefined,
            data,
          );
        },
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
    const articleLines = (message.sources ?? []).map(
      (s) => `[${s.n}] ${s.title}${s.author ? ` — ${s.author}` : ""}`,
    );
    const trustedLines = (message.trustedSources ?? []).map(
      (s) => `[${s.n}] ${s.title || s.source_name} — ${s.source_name}${s.source_url ? ` (${s.source_url})` : ""}`,
    );
    const sourceLines = [...articleLines, ...trustedLines].join("\n");
    if (!sourceLines) return stripped;
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
        <div className="max-w-3xl mx-auto px-6 pt-4 pb-3 flex items-center gap-4">
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
        <div className="max-w-3xl mx-auto px-6 pb-2 flex items-center gap-1">
          <TabButton
            active={activeTab === "chat"}
            onClick={() => setActiveTab("chat")}
            icon={<MessageSquare className="w-3.5 h-3.5" />}
            label="Samtale"
          />
          <TabButton
            active={activeTab === "timeline"}
            onClick={() => setActiveTab("timeline")}
            icon={<BarChart3 className="w-3.5 h-3.5" />}
            label="Kildebruk"
            badge={assistantTurns.length > 0 ? assistantTurns.length : undefined}
          />
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {activeTab === "timeline" ? (
          <ConversationSourceTimeline turns={assistantTurns} />
        ) : (
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
                          p: ({ children }) => (
                            <p className="mb-3 leading-[1.7] text-base">
                              {highlightCitedSentences(children)}
                            </p>
                          ),
                          li: ({ children }) => (
                            <li className="leading-[1.6]">
                              {highlightCitedSentences(children)}
                            </li>
                          ),
                          ul: ({ children }) => <ul className="mb-3 space-y-1 pl-5 list-disc marker:text-primary/60">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-3 space-y-1 pl-5 list-decimal marker:text-primary/60">{children}</ol>,
                          strong: ({ children }) => <strong className="font-semibold text-headline">{children}</strong>,
                          a: ({ href, children }) => {
                            const isCitation = href?.startsWith("#src-");
                            if (isCitation) {
                              const num = Number(href!.split("-").pop());
                              const source = message.sources?.find((s) => s.n === num);
                              const trusted = !source ? message.trustedSources?.find((s) => s.n === num) : undefined;
                              const link = (
                                <a
                                  href={href}
                                  onClick={(e) => handleCitationClick(e, href)}
                                  className="text-accent font-mono text-xs align-super no-underline hover:underline"
                                >
                                  {children}
                                </a>
                              );
                              if (source) {
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
                              if (trusted) {
                                const TypeIcon = trusted.source_type === "rss" ? Rss
                                  : trusted.source_type === "api" ? Database
                                  : trusted.source_type === "document" ? FileTextIcon
                                  : Globe;
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
                                          <span className="font-mono text-xs text-muted-foreground shrink-0">[{trusted.n}]</span>
                                          {trusted.source_url ? (
                                            <a
                                              href={trusted.source_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="font-headline text-sm font-semibold text-headline hover:text-primary transition-colors leading-snug inline-flex items-baseline gap-1"
                                            >
                                              {trusted.title || trusted.source_name}
                                              <ExternalLink className="w-3 h-3 self-center" />
                                            </a>
                                          ) : (
                                            <span className="font-headline text-sm font-semibold text-headline leading-snug">
                                              {trusted.title || trusted.source_name}
                                            </span>
                                          )}
                                        </div>
                                        {trusted.content && (
                                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                            {trusted.content}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                                          <TypeIcon className="w-3 h-3" />
                                          <span>{trusted.source_name}</span>
                                          {trusted.published_at && (
                                            <>
                                              <span>·</span>
                                              <span>{new Date(trusted.published_at).toLocaleDateString(language === "no" ? "nb-NO" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                );
                              }
                              return link;
                            }
                            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>;
                          },
                        }}
                      >
                        {linkifyCitations(message.content, message.sources, message.trustedSources, message.id, message.brregResults)}
                      </ReactMarkdown>
                    </div>
                  )}
                  {message.role === "assistant" && (message.brregResults?.length ?? 0) > 0 && (
                    <div id={`brreg-${message.id}`} className="mt-5 rounded-2xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border-b border-border">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span className="font-subhead font-semibold text-sm text-headline">
                          {language === "no" ? "Brønnøysundregistrene" : "Brønnøysund Register"}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-subhead ml-auto">
                          {language === "no" ? "Sanntidsdata" : "Live data"}
                        </span>
                      </div>
                      <div className="divide-y divide-border">
                        {message.brregResults!.map((r, ri) => (
                          <div key={ri} className="p-4">
                            <div className="flex items-baseline justify-between gap-3 mb-3">
                              <p className="font-subhead text-sm font-semibold text-headline">{r.label}</p>
                              <span className="text-xs font-body text-muted-foreground whitespace-nowrap">
                                {r.total.toLocaleString(language === "no" ? "nb-NO" : "en-US")}{" "}
                                {language === "no" ? "treff totalt" : "total hits"}
                              </span>
                            </div>
                            {r.companies.length === 0 ? (
                              <p className="text-xs text-muted-foreground font-body italic">
                                {language === "no" ? "Ingen treff" : "No matches"}
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {r.companies.map((c) => (
                                  <li key={c.orgnr} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-subhead font-semibold text-sm text-headline truncate">
                                        {c.navn}
                                        {c.konkurs && (
                                          <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-destructive/15 text-destructive text-[10px] font-semibold align-middle">
                                            {language === "no" ? "Konkurs" : "Bankrupt"}
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-xs text-muted-foreground font-body mt-0.5 truncate">
                                        {[c.kommune, c.bransje].filter(Boolean).join(" · ")}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground/80 font-body mt-1">
                                        <a
                                          href={`https://virksomhet.brreg.no/nb/oppslag/enheter/${c.orgnr}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:text-primary hover:underline"
                                        >
                                          org.nr {c.orgnr}
                                        </a>
                                        {c.stiftet && <> · {language === "no" ? "stiftet" : "founded"} {c.stiftet.slice(0, 4)}</>}
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end flex-shrink-0">
                                      <div className="flex items-center gap-1 font-headline text-xl font-bold text-primary leading-none">
                                        <UsersIcon className="w-3.5 h-3.5 opacity-60" />
                                        {c.ansatte.toLocaleString(language === "no" ? "nb-NO" : "en-US")}
                                      </div>
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-subhead mt-1">
                                        {language === "no" ? "ansatte" : "employees"}
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-2 text-[11px] text-muted-foreground font-body bg-muted/30 border-t border-border">
                        {language === "no"
                          ? "Kilde: data.brreg.no — Brønnøysundregistrene (enhetsregisteret)"
                          : "Source: data.brreg.no — Brønnøysund Register Centre"}
                      </div>
                    </div>
                  )}
                  <SourceVerificationLog
                    content={message.content}
                    sources={message.sources}
                    trustedSources={message.trustedSources}
                    title={t.sources}
                  />
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
                  {message.role === "assistant" &&
                    message.content &&
                    !isLoading &&
                    index === messages.length - 1 &&
                    message.sources && message.sources.length > 0 && (
                      <div className="mt-5">
                        <p className="font-subhead text-[11px] text-muted-foreground mb-2 uppercase tracking-widest">
                          {language === "no" ? "Foreslåtte oppfølginger" : "Suggested follow-ups"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.sources.slice(0, 3).map((s) => {
                            const prompt = language === "no"
                              ? `Fortell mer om: ${s.title}`
                              : `Tell me more about: ${s.title}`;
                            return (
                              <button
                                key={s.id}
                                onClick={() => void sendMessage(prompt, messages)}
                                className="px-3 py-1.5 bg-card hover:bg-secondary border border-border hover:border-accent/30 rounded-full text-xs font-body text-foreground/80 hover:text-foreground transition-all line-clamp-1 max-w-full text-left"
                                title={prompt}
                              >
                                {prompt}
                              </button>
                            );
                          })}
                        </div>
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
        )}
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

const TabButton = ({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-subhead font-medium transition-colors ${
      active
        ? "bg-accent/10 text-accent"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
    }`}
  >
    {icon}
    <span>{label}</span>
    {typeof badge === "number" && badge > 0 && (
      <span
        className={`tabular-nums px-1.5 rounded-full text-[10px] ${
          active ? "bg-accent/20" : "bg-muted"
        }`}
      >
        {badge}
      </span>
    )}
  </button>
);
