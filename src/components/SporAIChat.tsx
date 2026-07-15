import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Send, Bot, User, Loader2, FileText, ExternalLink, Rss, Database, Globe } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { streamArticlesChat, type ArticleSource, type TrustedSource } from "@/lib/articles-chat";
import { FabSlot } from "@/components/FabSlot";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ArticleSource[];
  trustedSources?: TrustedSource[];
}

const LOCAL_KEY = "nn_spor_enabled";

function readEnabled(): boolean {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}
function writeEnabled(v: boolean) {
  try {
    localStorage.setItem(LOCAL_KEY, String(v));
  } catch {}
}

/**
 * Global floating "Spør" assistant — a quick-access popover form of the
 * article-archive chat (the full-page version lives in ConversationView).
 * Joins the shared FAB stack (order=2, above the compass guide and article
 * notes) and can be hidden per user via the toggle in profile settings,
 * synced across devices through profiles.spor_enabled.
 */
export function SporAIChat() {
  const { userId } = useAuth();
  const [enabled, setEnabled] = useState<boolean>(() => readEnabled());
  const [open, setOpen] = useState(false);

  // Sync the on/off preference from the user's profile (cross-device).
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("spor_enabled")
        .eq("user_id", userId)
        .maybeSingle();
      const pref = (data as any)?.spor_enabled;
      if (typeof pref === "boolean") {
        setEnabled(pref);
        writeEnabled(pref);
      }
    })();
  }, [userId]);

  // React to the settings toggle fired from ProfileEditor.
  useEffect(() => {
    const onToggle = (e: Event) => {
      const en = (e as CustomEvent).detail?.enabled;
      if (typeof en === "boolean") {
        setEnabled(en);
        writeEnabled(en);
        if (!en) setOpen(false);
      }
    };
    window.addEventListener("nn:spor-toggle", onToggle as any);
    return () => window.removeEventListener("nn:spor-toggle", onToggle as any);
  }, []);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hei! Jeg er **Spør** — din redaksjonsassistent.\n\nStill et spørsmål så finner jeg svar i artiklene våre og siterer kildene direkte i svaret.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    let pendingSources: ArticleSource[] | null = null;
    let pendingTrusted: TrustedSource[] | null = null;

    const upsertAssistant = (
      chunk: string,
      sources?: ArticleSource[],
      trustedSources?: TrustedSource[],
    ) => {
      if (chunk) assistantSoFar += chunk;
      if (sources) pendingSources = sources;
      if (trustedSources) pendingTrusted = trustedSources;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1
              ? {
                  ...m,
                  content: assistantSoFar,
                  sources: pendingSources ?? m.sources,
                  trustedSources: pendingTrusted ?? m.trustedSources,
                }
              : m,
          );
        }
        return [
          ...prev,
          {
            role: "assistant",
            content: assistantSoFar,
            sources: pendingSources ?? undefined,
            trustedSources: pendingTrusted ?? undefined,
          },
        ];
      });
    };

    try {
      await streamArticlesChat({
        messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        onContent: (content) => upsertAssistant(content),
        onSources: (sources, trustedSources) => upsertAssistant("", sources, trustedSources),
      });
    } catch (error) {
      upsertAssistant(error instanceof Error ? error.message : "Beklager, noe gikk galt. Prøv igjen.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Flytende knapp — del av den delte FAB-stabelen (order=2, over
          kompass-guiden og artikkelnotater). Skjules når brukeren har slått
          av Spør i innstillinger, eller mens chat-vinduet er åpent. */}
      {enabled && !open && (
        <FabSlot order={2}>
          <button
            onClick={() => setOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-warm shadow-elevated flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            aria-label="Åpne Spør-assistenten"
          >
            <MessageCircle className="w-6 h-6 text-accent-foreground" />
          </button>
        </FabSlot>
      )}

      {/* Chat-vindu */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[340px] sm:w-[380px] h-[520px] flex flex-col bg-card border border-border rounded-3xl shadow-elevated animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-warm flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-accent-foreground/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-subhead font-semibold text-accent-foreground text-sm">Spør Nær Næring</p>
              <p className="font-body text-xs text-accent-foreground/70">Svar fra artikkelarkivet</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-accent-foreground/20 transition-colors">
              <X className="w-4 h-4 text-accent-foreground" />
            </button>
          </div>

          {/* Meldinger */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-wrap gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-accent" : "bg-secondary"}`}>
                  {msg.role === "user"
                    ? <User className="w-3.5 h-3.5 text-accent-foreground" />
                    : <Bot className="w-3.5 h-3.5 text-foreground/70" />
                  }
                </div>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "max-w-[80%] bg-accent text-accent-foreground rounded-tr-sm font-body whitespace-pre-wrap"
                    : "max-w-[95%] bg-secondary text-foreground rounded-tl-sm"
                }`}>
                  {msg.role === "user" ? msg.content : (
                    <div className="prose prose-sm dark:prose-invert max-w-none font-body [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 leading-[1.7] text-sm">{children}</p>,
                          ul: ({ children }) => <ul className="mb-3 space-y-1 pl-4 list-disc marker:text-primary/60 text-sm">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-3 space-y-1 pl-4 list-decimal marker:text-primary/60 text-sm">{children}</ol>,
                          li: ({ children }) => <li className="leading-[1.6] text-sm">{children}</li>,
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-3 -mx-1 rounded-lg border border-border bg-card">
                              <table className="w-full text-[11px] border-collapse min-w-[400px]">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
                          th: ({ children }) => <th className="text-left py-2 px-2.5 font-subhead font-semibold text-headline border-b border-border text-[11px] whitespace-nowrap">{children}</th>,
                          td: ({ children }) => <td className="py-1.5 px-2.5 border-b border-border/40 text-[11px] whitespace-nowrap">{children}</td>,
                          tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
                          strong: ({ children }) => <strong className="font-semibold text-headline">{children}</strong>,
                          h3: ({ children }) => <h3 className="font-semibold text-sm mt-4 mb-2 text-headline">{children}</h3>,
                          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {msg.role === "assistant" && ((msg.sources && msg.sources.length > 0) || (msg.trustedSources && msg.trustedSources.length > 0)) && (
                  <div className="basis-full pl-9">
                    <div className="mt-2 p-2.5 rounded-xl bg-muted/50 border border-border/50">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Kilder
                      </p>
                      <ol className="space-y-1">
                        {(msg.sources ?? []).map((s) => (
                          <li key={s.id} className="text-[11px] leading-snug">
                            <span className="text-muted-foreground font-mono mr-1">[{s.n}]</span>
                            <Link
                              to={`/article/${s.id}`}
                              className="text-primary hover:underline"
                              onClick={() => setOpen(false)}
                            >
                              {s.title}
                            </Link>
                            {s.author && <span className="text-muted-foreground"> — {s.author}</span>}
                          </li>
                        ))}
                        {(msg.trustedSources ?? []).map((t) => {
                          const TypeIcon = t.source_type === "rss" ? Rss
                            : t.source_type === "api" ? Database
                            : t.source_type === "document" ? FileText
                            : Globe;
                          const label = t.title || t.source_name;
                          return (
                            <li key={`t-${t.n}`} className="text-[11px] leading-snug flex items-baseline gap-1">
                              <span className="text-muted-foreground font-mono">[{t.n}]</span>
                              <TypeIcon className="w-2.5 h-2.5 text-muted-foreground translate-y-0.5 shrink-0" />
                              {t.source_url ? (
                                <a
                                  href={t.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-baseline gap-0.5"
                                  title={t.source_url}
                                >
                                  {label}
                                  <ExternalLink className="w-2.5 h-2.5 self-center" />
                                </a>
                              ) : (
                                <span className="text-foreground">{label}</span>
                              )}
                              <span className="text-muted-foreground"> — {t.source_name}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-foreground/70" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 flex-shrink-0">
            <div className="flex gap-2 bg-secondary rounded-2xl px-3 py-2 border border-border focus-within:border-accent transition-colors">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="Still et spørsmål..."
                className="flex-1 bg-transparent outline-none font-body text-sm text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
              <button
                onClick={send}
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 rounded-xl bg-accent text-accent-foreground flex items-center justify-center hover:bg-accent/90 disabled:opacity-40 transition-all flex-shrink-0"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
