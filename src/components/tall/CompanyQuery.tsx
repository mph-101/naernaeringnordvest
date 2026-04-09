import { useState } from "react";
import { MessageSquare, Send, Loader2, Sparkles, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface QueryResult {
  answer: string;
  results?: any[];
}

const EXAMPLE_QUESTIONS_NO = [
  "Hvem er de fem største private arbeidsgiverne i Molde?",
  "Hvor mange AS-selskaper finnes i Ålesund?",
  "Vis de nyeste selskapene i Trondheim",
  "Hvem er de største arbeidsgiverne i Nordland?",
];

const EXAMPLE_QUESTIONS_EN = [
  "Who are the five largest private employers in Molde?",
  "How many AS companies are there in Ålesund?",
  "Show the newest companies in Trondheim",
  "Who are the largest employers in Nordland?",
];

export function CompanyQuery() {
  const { language } = useTheme();
  const isNo = language === "no";
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);

  const examples = isNo ? EXAMPLE_QUESTIONS_NO : EXAMPLE_QUESTIONS_EN;

  const handleAsk = async (q?: string) => {
    const query = q || question.trim();
    if (!query) return;

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("brreg-query", {
        body: { question: query },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const newResult: QueryResult = { answer: data.answer, results: data.results };
      setResult(newResult);
      setHistory((prev) => [{ q: query, a: data.answer }, ...prev].slice(0, 10));
      setQuestion("");
    } catch (e: any) {
      toast.error(e.message || (isNo ? "Noe gikk galt" : "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Query input */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-headline text-lg font-semibold text-headline">
              {isNo ? "Spør databasen" : "Ask the database"}
            </h3>
            <p className="text-sm text-muted-foreground font-body">
              {isNo
                ? "Still spørsmål om norske selskaper på vanlig norsk"
                : "Ask questions about Norwegian companies in plain language"}
            </p>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
            placeholder={isNo ? "F.eks. Hvem er de fem største arbeidsgiverne i Molde?" : "E.g. Who are the five largest employers in Molde?"}
            rows={2}
            disabled={loading}
            className="w-full px-4 py-3 pr-14 bg-background border border-border rounded-xl text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none disabled:opacity-50"
          />
          <button
            onClick={() => handleAsk()}
            disabled={!question.trim() || loading}
            className="absolute right-3 bottom-3 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {/* Example questions */}
        {!result && !loading && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground font-subhead mb-2">
              {isNo ? "Prøv for eksempel:" : "Try for example:"}
            </p>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuestion(ex);
                    handleAsk(ex);
                  }}
                  className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-subhead hover:bg-secondary/80 transition-colors text-left"
                >
                  <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-body">
            {isNo ? "Søker i Brønnøysundregistrene..." : "Searching Brønnøysundregistrene..."}
          </p>
        </div>
      )}

      {/* Answer */}
      {result && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="font-headline text-base font-semibold text-headline">
              {isNo ? "Svar" : "Answer"}
            </h3>
          </div>
          <div className="prose prose-base dark:prose-invert max-w-none font-body text-foreground leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-5 leading-[1.8] text-[0.95rem]">{children}</p>
                ),
                h1: ({ children }) => (
                  <h1 className="font-headline text-2xl font-bold text-headline mt-8 mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-headline text-xl font-semibold text-headline mt-7 mb-3">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-headline text-lg font-semibold text-headline mt-6 mb-3">{children}</h3>
                ),
                ul: ({ children }) => (
                  <ul className="mb-5 space-y-2 pl-5 list-disc marker:text-primary/60">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-5 space-y-2 pl-5 list-decimal marker:text-primary/60">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="leading-[1.7] text-[0.95rem]">{children}</li>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-6 rounded-xl border border-border bg-card">
                    <table className="w-full text-sm border-collapse min-w-[500px]">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/60">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="text-left py-3 px-4 font-subhead font-semibold text-headline border-b border-border text-sm whitespace-nowrap">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="py-2.5 px-4 border-b border-border/40 font-body leading-relaxed">
                    {children}
                  </td>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-headline">{children}</strong>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {children}
                  </a>
                ),
                hr: () => (
                  <hr className="my-6 border-border/60" />
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/30 pl-5 my-5 italic text-muted-foreground">{children}</blockquote>
                ),
              }}
            >
              {result.answer}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-headline text-base font-semibold text-headline mb-4">
            {isNo ? "Tidligere spørsmål" : "Previous questions"}
          </h3>
          <div className="space-y-3">
            {history.slice(1).map((h, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuestion(h.q);
                  handleAsk(h.q);
                }}
                className="w-full text-left px-4 py-3 bg-secondary/50 rounded-xl text-sm font-body hover:bg-secondary transition-colors"
              >
                <span className="text-primary font-subhead font-medium">{h.q}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
