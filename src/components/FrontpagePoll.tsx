import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { BarChart3, Check, Loader2, Vote } from "lucide-react";
import { toast } from "sonner";

interface PollOption { id: string; label: string }
interface Poll {
  id: string;
  question: string;
  description: string | null;
  options: PollOption[];
  ends_at: string | null;
}
interface PollResult { option_id: string; votes: number; percent: number }

export function FrontpagePoll() {
  const { userId } = useAuth();
  const { language } = useTheme();
  const isNo = language === "no";
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myChoice, setMyChoice] = useState<string | null>(null);
  const [results, setResults] = useState<PollResult[]>([]);
  const sessionId = getSessionId();

  const t = isNo
    ? { ukens: "Ukens spørsmål", thanks: "Takk for stemmen din", totalVotes: (n: number) => `${n} stemmer`, vote: "Avgi stemme", error: "Kunne ikke registrere stemme" }
    : { ukens: "Question of the week", thanks: "Thanks for your vote", totalVotes: (n: number) => `${n} votes`, vote: "Vote", error: "Could not register vote" };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("polls")
        .select("id, question, description, options, ends_at")
        .eq("active", true)
        .lte("starts_at", nowIso)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const options = Array.isArray(data.options) ? (data.options as unknown as PollOption[]) : [];
        setPoll({ ...(data as any), options });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!poll) return;
    (async () => {
      const { data } = await supabase.rpc("poll_user_choice", { _poll_id: poll.id, _session_id: sessionId });
      if (data) {
        setMyChoice(data as unknown as string);
        loadResults(poll.id);
      }
    })();
  }, [poll, sessionId]);

  async function loadResults(pollId: string) {
    const { data } = await supabase.rpc("poll_results", { _poll_id: pollId });
    if (data) setResults(data as unknown as PollResult[]);
  }

  async function vote(optionId: string) {
    if (!poll || submitting || myChoice) return;
    setSubmitting(true);
    const payload: any = { poll_id: poll.id, option_id: optionId };
    if (userId) payload.user_id = userId;
    else payload.session_id = sessionId;
    const { error } = await supabase.from("poll_votes").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(t.error);
      return;
    }
    setMyChoice(optionId);
    loadResults(poll.id);
  }

  if (loading || !poll || !poll.options.length) return null;

  const totalVotes = results.reduce((sum, r) => sum + Number(r.votes || 0), 0);

  return (
    <section data-tour="frontpage-poll" className="max-w-3xl mx-auto px-6 pt-2 pb-10">
      <div className="bg-card border border-border rounded-3xl shadow-soft p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-subhead font-semibold uppercase tracking-wider">
            <Vote className="w-3 h-3" />
            {t.ukens}
          </span>
        </div>
        <h2 className="font-headline text-xl md:text-2xl font-bold text-headline leading-snug mb-2">
          {poll.question}
        </h2>
        {poll.description && (
          <p className="text-sm text-muted-foreground font-body mb-5">{poll.description}</p>
        )}

        {!myChoice ? (
          <div className="grid gap-2.5 mt-4">
            {poll.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => vote(opt.id)}
                disabled={submitting}
                className="group text-left px-4 py-3 rounded-2xl border border-border bg-surface-subtle hover:border-accent hover:bg-accent/5 transition-all font-body text-foreground disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 group-hover:border-accent transition-colors" />}
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {poll.options.map((opt) => {
              const r = results.find((x) => x.option_id === opt.id);
              const pct = r ? Number(r.percent) : 0;
              const isMine = myChoice === opt.id;
              return (
                <div key={opt.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm font-body">
                    <span className={`flex items-center gap-1.5 ${isMine ? "font-semibold text-accent" : "text-foreground"}`}>
                      {isMine && <Check className="w-3.5 h-3.5" />}
                      {opt.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isMine ? "bg-accent" : "bg-muted-foreground/40"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground font-body pt-2 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              {t.thanks} · {t.totalVotes(totalVotes)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}