import { Children, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, ArrowLeft, User, Bot, Copy, Check, Share2, ExternalLink, Rss, Database, FileText as FileTextIcon, Globe, MessageSquare, BarChart3, Building2, Users as UsersIcon, MapPin, CalendarRange, Activity } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { streamArticlesChat, type ArticleSource, type TrustedSource, type BrregResult, type BrregDisambiguation, type TallResults } from "@/lib/articles-chat";
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
  tallResults?: TallResults | null;
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
    tallResults?: TallResults | null,
  ) => {
    if (!content) return content;
    const validNumbers = new Set<number>([
      ...(sources ?? []).map((s) => s.n),
      ...(trustedSources ?? []).map((s) => s.n),
    ]);
    const hasBrreg = (brregResults?.length ?? 0) > 0;
    const hasTall = !!tallResults && (
      !!tallResults.establishments?.companies?.length ||
      !!tallResults.bankruptcies?.companies?.length ||
      !!tallResults.labor ||
      !!tallResults.housing
    );
    let out = content;
    if (hasBrreg) {
      out = out.replace(/\[B\]/g, () => `[\\[B\\]](#brreg-${assistantId})`);
    }
    if (hasTall) {
      out = out.replace(/\[T\]/g, () => `[\\[T\\]](#tall-${assistantId})`);
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
    if (!href) return;
    const isInternalAnchor =
      href.startsWith("#src-") || href.startsWith("#tall-") || href.startsWith("#brreg-");
    if (!isInternalAnchor) return;
    e.preventDefault();
    const el = document.getElementById(href.slice(1));
    if (!el) return;

    // Auto-open <details> panels (Tall / Brreg) so the user lands on visible
    // content rather than a collapsed summary.
    if (el instanceof HTMLDetailsElement) {
      el.open = true;
    }

    // Slight delay so the just-opened panel has measured layout before scroll.
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    // Pulse highlight — stronger for the dedicated data panels so the user
    // can immediately see which block the [T]/[B] reference came from.
    const isPanel = href.startsWith("#tall-") || href.startsWith("#brreg-");
    const cls = isPanel
      ? ["ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "nn-pulse-ring"]
      : ["ring-2", "ring-accent", "rounded"];
    el.classList.add(...cls);
    window.setTimeout(() => el.classList.remove(...cls), isPanel ? 2200 : 1500);
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
    let assistantTall: TallResults | null | undefined;
    let assistantDisambig: BrregDisambiguation | undefined;

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    const upsertAssistant = (
      chunk: string,
      sources?: ArticleSource[],
      trustedSources?: TrustedSource[],
      brregResults?: BrregResult[],
      tallResults?: TallResults | null,
      disambiguation?: BrregDisambiguation,
    ) => {
      if (chunk) assistantContent += chunk;
      if (sources) assistantSources = sources;
      if (trustedSources) assistantTrustedSources = trustedSources;
      if (brregResults) assistantBrreg = brregResults;
      if (tallResults !== undefined) assistantTall = tallResults;
      if (disambiguation) assistantDisambig = disambiguation;

      setMessages((prev) => {
        const assistantMessage: Message = {
          id: assistantId,
          role: "assistant",
          content: assistantContent,
          sources: assistantSources,
          trustedSources: assistantTrustedSources,
          brregResults: assistantBrreg,
          tallResults: assistantTall,
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
        onSources: (sources, trustedSources, brregResults, tallResults) =>
          upsertAssistant("", sources, trustedSources, brregResults, tallResults),
        onDisambiguation: (data) => {
          // Render a friendly prompt instead of leaving the bubble empty.
          upsertAssistant(
            language === "no"
              ? `Jeg fant flere selskaper med dette navnet. Hvilket mener du?`
              : `I found several companies with this name. Which one do you mean?`,
            undefined,
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
            {shareCopied ? <Check className="w-4 h-4 text-accent-ink" /> : <Share2 className="w-4 h-4" />}
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
                  {message.role === "user" ? <User className="w-5 h-5 text-foreground/70" /> : <Bot className="w-5 h-5 text-accent-ink" />}
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
                          ul: ({ children }) => <ul className="mb-3 space-y-1 pl-5 list-disc marker:text-primary-ink/60">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-3 space-y-1 pl-5 list-decimal marker:text-primary-ink/60">{children}</ol>,
                          strong: ({ children }) => <strong className="font-semibold text-headline">{children}</strong>,
                          a: ({ href, children }) => {
                            const isTallRef = href?.startsWith("#tall-");
                            const isBrregRef = href?.startsWith("#brreg-");
                            if (isTallRef || isBrregRef) {
                              const label = isTallRef
                                ? (language === "no" ? "Se Tall-databasen" : "See Tall data")
                                : (language === "no" ? "Se Brreg-data" : "See Brreg data");
                              return (
                                <a
                                  href={href}
                                  onClick={(e) => handleCitationClick(e, href)}
                                  title={label}
                                  className={`inline-flex items-center gap-0.5 align-super mx-0.5 px-1.5 py-px rounded-full text-[10px] font-subhead font-semibold no-underline transition-colors ${
                                    isTallRef
                                      ? "bg-primary/10 text-primary-ink hover:bg-primary/20"
                                      : "bg-accent/10 text-accent-ink hover:bg-accent/20"
                                  }`}
                                >
                                  <BarChart3 className="w-2.5 h-2.5" />
                                  {children}
                                </a>
                              );
                            }
                            const isCitation = href?.startsWith("#src-");
                            if (isCitation) {
                              const num = Number(href!.split("-").pop());
                              const source = message.sources?.find((s) => s.n === num);
                              const trusted = !source ? message.trustedSources?.find((s) => s.n === num) : undefined;
                              const link = (
                                <a
                                  href={href}
                                  onClick={(e) => handleCitationClick(e, href)}
                                  className="text-accent-ink font-mono text-xs align-super no-underline hover:underline"
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
                                          className="font-headline text-sm font-semibold text-headline hover:text-primary-ink transition-colors leading-snug"
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
                                              className="font-headline text-sm font-semibold text-headline hover:text-primary-ink transition-colors leading-snug inline-flex items-baseline gap-1"
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
                            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-ink hover:underline">{children}</a>;
                          },
                        }}
                      >
                        {linkifyCitations(message.content, message.sources, message.trustedSources, message.id, message.brregResults, message.tallResults)}
                      </ReactMarkdown>
                    </div>
                  )}
                  {message.role === "assistant" && (message.brregResults?.length ?? 0) > 0 && (
                    <div id={`brreg-${message.id}`} className="mt-5 rounded-2xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border-b border-border">
                        <Building2 className="w-4 h-4 text-primary-ink" />
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
                                          <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-destructive/15 text-destructive-ink text-[10px] font-semibold align-middle">
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
                                          className="hover:text-primary-ink hover:underline"
                                        >
                                          org.nr {c.orgnr}
                                        </a>
                                        {c.stiftet && <> · {language === "no" ? "stiftet" : "founded"} {c.stiftet.slice(0, 4)}</>}
                                      </p>
                                      {c.regnskap && (c.regnskap.driftsinntekter != null || c.regnskap.aarsresultat != null) && (() => {
                                        const locale = language === "no" ? "nb-NO" : "en-US";
                                        const unit = c.regnskap.valuta === "NOK" ? "kr" : c.regnskap.valuta;
                                        return (
                                          <p className="text-[11px] text-muted-foreground/90 font-body mt-1">
                                            {language === "no" ? "Regnskap" : "Accounts"} {c.regnskap.aar}
                                            {c.regnskap.driftsinntekter != null && (
                                              <> · {language === "no" ? "omsetning" : "revenue"}{" "}
                                                <span className="font-semibold text-foreground">
                                                  {Math.round(c.regnskap.driftsinntekter).toLocaleString(locale)} {unit}
                                                </span>
                                              </>
                                            )}
                                            {c.regnskap.aarsresultat != null && (
                                              <> · {language === "no" ? "resultat" : "result"}{" "}
                                                <span className={`font-semibold ${c.regnskap.aarsresultat < 0 ? "text-destructive-ink" : "text-foreground"}`}>
                                                  {Math.round(c.regnskap.aarsresultat).toLocaleString(locale)} {unit}
                                                </span>
                                              </>
                                            )}
                                          </p>
                                        );
                                      })()}
                                    </div>
                                    <div className="flex flex-col items-end flex-shrink-0">
                                      <div className="flex items-center gap-1 font-headline text-xl font-bold text-primary-ink leading-none">
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
                        {message.brregResults!.some((r) => r.companies.some((c) => c.regnskap))
                          ? (language === "no"
                              ? "Kilde: data.brreg.no — Brønnøysundregistrene (enhets- og regnskapsregisteret)"
                              : "Source: data.brreg.no — Brønnøysund Register Centre (entity & accounts)")
                          : (language === "no"
                              ? "Kilde: data.brreg.no — Brønnøysundregistrene (enhetsregisteret)"
                              : "Source: data.brreg.no — Brønnøysund Register Centre")}
                      </div>
                    </div>
                  )}
                  {message.role === "assistant" && message.tallResults && (
                    (message.tallResults.establishments?.companies?.length ||
                      message.tallResults.bankruptcies?.companies?.length ||
                      message.tallResults.labor ||
                      message.tallResults.housing) ? (
                      <details
                        id={`tall-${message.id}`}
                        className="mt-5 rounded-2xl border border-border bg-card overflow-hidden group"
                      >
                        <summary className="flex items-center gap-2 px-4 py-3 bg-primary/5 border-b border-border cursor-pointer list-none">
                          <BarChart3 className="w-4 h-4 text-primary-ink" />
                          <span className="font-subhead font-semibold text-sm text-headline">
                            {language === "no" ? "Tall-databasen" : "Tall database"}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-subhead ml-auto group-open:hidden">
                            {language === "no" ? "Vis tall" : "Show data"}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-subhead ml-auto hidden group-open:inline">
                            {language === "no" ? "Skjul" : "Hide"}
                          </span>
                        </summary>
                        <div className="divide-y divide-border">
                          {message.tallResults.establishments?.companies?.length ? (
                            <div className="p-4">
                              <p className="font-subhead text-sm font-semibold text-headline mb-2">
                                {language === "no" ? "Nyetableringer" : "New establishments"}
                                {message.tallResults.days && (
                                  <span className="ml-2 text-xs font-body text-muted-foreground">
                                    {language === "no" ? `siste ${message.tallResults.days} dager` : `last ${message.tallResults.days} days`}
                                    {" · "}
                                    {message.tallResults.establishments.total?.toLocaleString(language === "no" ? "nb-NO" : "en-US")}{" "}
                                    {language === "no" ? "totalt" : "total"}
                                  </span>
                                )}
                              </p>
                              <TallParamRow
                                language={language}
                                period={message.tallResults.days ? (language === "no" ? `Siste ${message.tallResults.days} dager` : `Last ${message.tallResults.days} days`) : null}
                                area={message.tallResults.kommunenummer ? `Kommune ${message.tallResults.kommunenummer}` : (language === "no" ? "Hele Norge" : "All of Norway")}
                                indicator={language === "no" ? "Stiftelsesdato — alle bransjer" : "Founding date — all sectors"}
                                sourceLabel="Brønnøysundregistrene (enhetsregisteret)"
                                sourceUrl="https://data.brreg.no/enhetsregisteret/api/enheter"
                                internalUrl="/tall?view=etablering"
                              />
                              <ul className="space-y-1.5">
                                {message.tallResults.establishments.companies.slice(0, 8).map((c: any) => (
                                  <li key={c.orgnr} className="text-xs font-body p-2 rounded-lg bg-muted/40 flex justify-between gap-3">
                                    <span className="truncate">
                                      <a
                                        href={`https://virksomhet.brreg.no/nb/oppslag/enheter/${c.orgnr}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-subhead font-semibold text-headline hover:text-primary-ink hover:underline"
                                      >
                                        {c.navn}
                                      </a>
                                      {c.kommune && <span className="text-muted-foreground"> · {c.kommune}</span>}
                                    </span>
                                    <span className="text-muted-foreground whitespace-nowrap">{c.stiftelsesdato}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {message.tallResults.bankruptcies?.companies?.length ? (
                            <div className="p-4">
                              <p className="font-subhead text-sm font-semibold text-headline mb-2">
                                {language === "no" ? "Konkurser" : "Bankruptcies"}
                                <span className="ml-2 text-xs font-body text-muted-foreground">
                                  {message.tallResults.bankruptcies.total?.toLocaleString(language === "no" ? "nb-NO" : "en-US")}{" "}
                                  {language === "no" ? "totalt" : "total"}
                                </span>
                              </p>
                              <TallParamRow
                                language={language}
                                period={message.tallResults.days ? (language === "no" ? `Siste ${message.tallResults.days} dager` : `Last ${message.tallResults.days} days`) : null}
                                area={message.tallResults.kommunenummer ? `Kommune ${message.tallResults.kommunenummer}` : (language === "no" ? "Hele Norge" : "All of Norway")}
                                indicator={language === "no" ? "Konkursåpning" : "Bankruptcy opening"}
                                sourceLabel="Brønnøysundregistrene (konkursregisteret)"
                                sourceUrl="https://data.brreg.no/enhetsregisteret/api/enheter"
                                internalUrl="/tall?view=konkurs"
                              />
                              <ul className="space-y-1.5">
                                {message.tallResults.bankruptcies.companies.slice(0, 8).map((c: any) => (
                                  <li key={c.orgnr} className="text-xs font-body p-2 rounded-lg bg-muted/40 flex justify-between gap-3">
                                    <span className="truncate">
                                      <a
                                        href={`https://virksomhet.brreg.no/nb/oppslag/enheter/${c.orgnr}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-subhead font-semibold text-headline hover:text-primary-ink hover:underline"
                                      >
                                        {c.navn}
                                      </a>
                                      {c.kommune && <span className="text-muted-foreground"> · {c.kommune}</span>}
                                      {c.antallAnsatte ? (
                                        <span className="text-muted-foreground"> · {c.antallAnsatte} {language === "no" ? "ansatte" : "employees"}</span>
                                      ) : null}
                                    </span>
                                    <span className="text-muted-foreground whitespace-nowrap">{c.registreringsdato}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {message.tallResults.labor ? (
                            <div className="p-4">
                              <p className="font-subhead text-sm font-semibold text-headline mb-2">
                                {language === "no" ? "Arbeidsmarked" : "Labor market"}
                                <span className="ml-2 text-xs font-body text-muted-foreground">SSB</span>
                              </p>
                              <TallParamRow
                                language={language}
                                period={(() => {
                                  const periods = Object.values(message.tallResults.labor || {})
                                    .map((p: any) => p?.period)
                                    .filter(Boolean) as string[];
                                  return periods.length ? `${periods[0]}` : null;
                                })()}
                                area={language === "no" ? "Hele Norge" : "All of Norway"}
                                indicator={language === "no" ? "AKU, sykefravær, lønn" : "LFS, sick leave, wages"}
                                sourceLabel="SSB · tabell 13760, 12442, 11418"
                                sourceUrl="https://www.ssb.no/statbank/table/13760"
                                extraSources={[
                                  { label: "SSB · 12442 (sykefravær)", url: "https://www.ssb.no/statbank/table/12442" },
                                  { label: "SSB · 11418 (lønn)", url: "https://www.ssb.no/statbank/table/11418" },
                                ]}
                                internalUrl="/tall?view=arbeidsmarked"
                              />
                              <dl className="grid grid-cols-2 gap-2 text-xs font-body">
                                {[
                                  { k: "unemployment", lbl: language === "no" ? "Arbeidsledighet" : "Unemployment", suffix: "%" },
                                  { k: "employed", lbl: language === "no" ? "Sysselsatte" : "Employed", suffix: "" },
                                  { k: "laborForce", lbl: language === "no" ? "Arbeidsstyrken" : "Labor force", suffix: "" },
                                  { k: "sickLeave", lbl: language === "no" ? "Sykefravær" : "Sick leave", suffix: "%" },
                                  { k: "wage", lbl: language === "no" ? "Snittlønn/mnd" : "Avg. monthly wage", suffix: " kr" },
                                ].map(({ k, lbl, suffix }) => {
                                  const p = (message.tallResults!.labor as any)?.[k];
                                  if (!p) return null;
                                  const v = typeof p.value === "number" ? p.value.toLocaleString(language === "no" ? "nb-NO" : "en-US") : p.value;
                                  return (
                                    <div key={k} className="p-2 rounded-lg bg-muted/40">
                                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{lbl}</dt>
                                      <dd className="font-subhead font-semibold text-headline mt-0.5">{v}{suffix}</dd>
                                      <dd className="text-[10px] text-muted-foreground">{p.period}</dd>
                                    </div>
                                  );
                                })}
                              </dl>
                            </div>
                          ) : null}
                          {message.tallResults.housing ? (
                            <div className="p-4">
                              <p className="font-subhead text-sm font-semibold text-headline mb-2">
                                {language === "no" ? "Boligmarked" : "Housing market"}
                                <span className="ml-2 text-xs font-body text-muted-foreground">SSB</span>
                              </p>
                              <TallParamRow
                                language={language}
                                period={(() => {
                                  const periods = Object.values(message.tallResults.housing || {})
                                    .map((p: any) => p?.period)
                                    .filter(Boolean) as string[];
                                  return periods.length ? `${periods[0]}` : null;
                                })()}
                                area={language === "no" ? "Hele Norge" : "All of Norway"}
                                indicator={language === "no" ? "Boligprisindeks, igangsetting, kreditt" : "Price index, dwellings, credit"}
                                sourceLabel="SSB · tabell 07221, 05940, 11597"
                                sourceUrl="https://www.ssb.no/statbank/table/07221"
                                extraSources={[
                                  { label: "SSB · 05940 (igangsatte)", url: "https://www.ssb.no/statbank/table/05940" },
                                  { label: "SSB · 11597 (kreditt)", url: "https://www.ssb.no/statbank/table/11597" },
                                ]}
                                internalUrl="/tall?view=bolig"
                              />
                              <dl className="grid grid-cols-2 gap-2 text-xs font-body">
                                {[
                                  { k: "priceIndex", lbl: language === "no" ? "Boligprisindeks" : "Price index", suffix: "" },
                                  { k: "priceChange", lbl: language === "no" ? "Prisendring" : "Price change", suffix: "%" },
                                  { k: "startedDwellings", lbl: language === "no" ? "Igangsatte boliger" : "Started dwellings", suffix: "" },
                                  { k: "householdDebt", lbl: language === "no" ? "Lånegjeld (12 mnd)" : "Household debt (12m)", suffix: "%" },
                                ].map(({ k, lbl, suffix }) => {
                                  const p = (message.tallResults!.housing as any)?.[k];
                                  if (!p) return null;
                                  const v = typeof p.value === "number" ? p.value.toLocaleString(language === "no" ? "nb-NO" : "en-US") : p.value;
                                  return (
                                    <div key={k} className="p-2 rounded-lg bg-muted/40">
                                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{lbl}</dt>
                                      <dd className="font-subhead font-semibold text-headline mt-0.5">{v}{suffix}</dd>
                                      <dd className="text-[10px] text-muted-foreground">{p.period}</dd>
                                    </div>
                                  );
                                })}
                              </dl>
                            </div>
                          ) : null}
                        </div>
                        <div className="px-4 py-2 text-[11px] text-muted-foreground font-body bg-muted/30 border-t border-border">
                          {language === "no"
                            ? "Kilder: data.brreg.no og data.ssb.no"
                            : "Sources: data.brreg.no and data.ssb.no"}
                        </div>
                      </details>
                    ) : null
                  )}
                  {message.role === "assistant" && message.disambiguation && (
                    <div className="mt-5 rounded-2xl border-2 border-primary/40 bg-primary/5 overflow-hidden">
                      <div className="px-4 py-3 border-b border-primary/20">
                        <p className="font-subhead font-semibold text-sm text-headline">
                          {language === "no"
                            ? `Flere selskaper heter «${message.disambiguation.label}»`
                            : `Several companies are called "${message.disambiguation.label}"`}
                        </p>
                        <p className="text-xs text-muted-foreground font-body mt-0.5">
                          {language === "no"
                            ? `Velg hvilket du mener — så svarer jeg på «${message.disambiguation.question}» basert på det.`
                            : `Pick the one you mean — I'll answer "${message.disambiguation.question}" using that company.`}
                        </p>
                      </div>
                      <ul className="divide-y divide-primary/15">
                        {message.disambiguation.candidates.map((c) => {
                          const disabled = isLoading;
                          return (
                            <li key={c.orgnr}>
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  const followUp =
                                    language === "no"
                                      ? `Jeg mener ${c.navn} (org.nr ${c.orgnr}). ${message.disambiguation!.question}`
                                      : `I mean ${c.navn} (org.nr ${c.orgnr}). ${message.disambiguation!.question}`;
                                  void sendMessage(followUp, messages);
                                }}
                                className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-subhead font-semibold text-sm text-headline truncate">
                                    {c.navn}
                                    {c.konkurs && (
                                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-destructive/15 text-destructive-ink text-[10px] font-semibold align-middle">
                                        {language === "no" ? "Konkurs" : "Bankrupt"}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-body mt-0.5 truncate">
                                    {[c.kommune, c.bransje].filter(Boolean).join(" · ")}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground/80 font-body mt-1">
                                    org.nr {c.orgnr}
                                    {c.stiftet && <> · {language === "no" ? "stiftet" : "founded"} {c.stiftet.slice(0, 4)}</>}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end flex-shrink-0">
                                  <div className="flex items-center gap-1 font-headline text-lg font-bold text-primary-ink leading-none">
                                    <UsersIcon className="w-3.5 h-3.5 opacity-60" />
                                    {c.ansatte.toLocaleString(language === "no" ? "nb-NO" : "en-US")}
                                  </div>
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-subhead mt-1">
                                    {language === "no" ? "ansatte" : "employees"}
                                  </span>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      {message.disambiguation.total > message.disambiguation.candidates.length && (
                        <div className="px-4 py-2 text-[11px] text-muted-foreground font-body bg-muted/30 border-t border-primary/15">
                          {language === "no"
                            ? `Viser ${message.disambiguation.candidates.length} av ${message.disambiguation.total} treff. Skriv organisasjonsnummer for å velge et annet selskap.`
                            : `Showing ${message.disambiguation.candidates.length} of ${message.disambiguation.total} hits. Type an org. number to pick a different company.`}
                        </div>
                      )}
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
                        {copiedId === message.id ? <Check className="w-3.5 h-3.5 text-accent-ink" /> : <Copy className="w-3.5 h-3.5" />}
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
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center"><Bot className="w-5 h-5 text-accent-ink" /></div>
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
        ? "bg-accent/10 text-accent-ink"
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

const TallParamRow = ({
  language,
  period,
  area,
  indicator,
  sourceLabel,
  sourceUrl,
  extraSources,
  internalUrl,
}: {
  language: "no" | "en";
  period: string | null;
  area: string | null;
  indicator: string | null;
  sourceLabel: string;
  sourceUrl: string;
  extraSources?: { label: string; url: string }[];
  internalUrl?: string;
}) => {
  const isNo = language === "no";
  return (
    <div className="mb-3 rounded-lg border border-border/60 bg-background/60 p-2.5">
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-body text-muted-foreground">
        {period && (
          <span className="inline-flex items-center gap-1">
            <CalendarRange className="w-3 h-3 opacity-70" />
            <span className="text-[10px] uppercase tracking-wider">{isNo ? "Periode" : "Period"}:</span>
            <span className="text-foreground font-medium">{period}</span>
          </span>
        )}
        {area && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3 opacity-70" />
            <span className="text-[10px] uppercase tracking-wider">{isNo ? "Område" : "Area"}:</span>
            <span className="text-foreground font-medium">{area}</span>
          </span>
        )}
        {indicator && (
          <span className="inline-flex items-center gap-1">
            <Activity className="w-3 h-3 opacity-70" />
            <span className="text-[10px] uppercase tracking-wider">{isNo ? "Indikator" : "Indicator"}:</span>
            <span className="text-foreground font-medium">{indicator}</span>
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-body">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary-ink hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          {sourceLabel}
        </a>
        {extraSources?.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-ink/80 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            {s.label}
          </a>
        ))}
        {internalUrl && (
          <Link
            to={internalUrl}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground ml-auto"
          >
            <BarChart3 className="w-3 h-3" />
            {isNo ? "Åpne i Tall" : "Open in Tall"}
          </Link>
        )}
      </div>
    </div>
  );
};
