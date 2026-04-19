import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Send, Bot, User, Loader2, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ArticleSource {
  n: number;
  id: string;
  title: string;
  excerpt: string;
  author: string;
  published_at: string | null;
  similarity: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ArticleSource[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/articles-chat`;

export function IdrettAIChat() {
  const [open, setOpen] = useState(false);
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

    const upsertAssistant = (chunk: string, sources?: ArticleSource[]) => {
      if (chunk) assistantSoFar += chunk;
      if (sources) pendingSources = sources;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: assistantSoFar, sources: pendingSources ?? m.sources }
              : m,
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar, sources: pendingSources ?? undefined }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })) }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Ukjent feil" }));
        upsertAssistant(err.error || "Noe gikk galt, prøv igjen.");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let currentEvent = "message";

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") {
            if (line.trim() === "") currentEvent = "message";
            continue;
          }
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            if (currentEvent === "sources" && Array.isArray(parsed.sources)) {
              upsertAssistant("", parsed.sources as ArticleSource[]);
            } else {
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch {
      upsertAssistant("Beklager, noe gikk galt. Prøv igjen.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Flytende knapp */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-warm shadow-elevated flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        aria-label="Åpne AI-assistent"
      >
        <MessageCircle className="w-6 h-6 text-accent-foreground" />
      </button>

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
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="basis-full pl-9">
                    <div className="mt-2 p-2.5 rounded-xl bg-muted/50 border border-border/50">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Kilder
                      </p>
                      <ol className="space-y-1">
                        {msg.sources.map((s) => (
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
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
