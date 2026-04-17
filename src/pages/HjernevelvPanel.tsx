import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users, MessageSquare, Send, Check, X, Loader2, Video, Building } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  type HjernevelvPanel,
  type HjernevelvWriter,
  type PanelQuestion,
  type PanelRegistration,
  FORMAT_LABEL,
  STATUS_LABEL,
  formatPanelDate,
} from "@/lib/hjernevelv";

const HjernevelvPanelPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, userId, loading: authLoading } = useAuth();
  const { language } = useTheme();
  const isNo = language === "no";

  const [panel, setPanel] = useState<HjernevelvPanel | null>(null);
  const [panelists, setPanelists] = useState<Array<{ writer: HjernevelvWriter; role: string }>>([]);
  const [questions, setQuestions] = useState<PanelQuestion[]>([]);
  const [myRegistration, setMyRegistration] = useState<PanelRegistration | null>(null);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submittingQ, setSubmittingQ] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [comment, setComment] = useState("");

  const t = isNo
    ? {
        back: "Tilbake", register: "Meld deg på", registered: "Påmeldt", cancel: "Avmeld",
        attendees: "påmeldte", maxReached: "Maks antall nådd",
        questions: "Spørsmål til panelet", noQuestions: "Ingen godkjente spørsmål ennå. Vær den første!",
        sendQuestion: "Send spørsmål", placeholder: "Hva vil du spørre panelet om?",
        anonymous: "Send anonymt", panelists: "Panelet", commentPlaceholder: "Valgfri kommentar...",
        loginRequired: "Logg inn for å se panelet", loginCta: "Logg inn",
        notFound: "Panelet finnes ikke", join: "Bli med digitalt",
        questionSent: "Spørsmål sendt — venter på godkjenning",
        registerSuccess: "Du er påmeldt!", cancelSuccess: "Avmelding registrert",
        moderator: "Moderator",
      }
    : {
        back: "Back", register: "Register", registered: "Registered", cancel: "Cancel",
        attendees: "registered", maxReached: "Max reached",
        questions: "Questions for the panel", noQuestions: "No approved questions yet. Be the first!",
        sendQuestion: "Send question", placeholder: "What would you like to ask?",
        anonymous: "Submit anonymously", panelists: "Panel", commentPlaceholder: "Optional comment...",
        loginRequired: "Sign in to view the panel", loginCta: "Sign in",
        notFound: "Panel not found", join: "Join digitally",
        questionSent: "Question sent — awaiting approval",
        registerSuccess: "You are registered!", cancelSuccess: "Registration cancelled",
        moderator: "Moderator",
      };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [pRes, plRes, qRes, rRes, cRes] = await Promise.all([
      supabase.from("hjernevelv_panels" as any).select("*").eq("id", id).maybeSingle(),
      supabase
        .from("hjernevelv_panelists" as any)
        .select("role, writer:hjernevelv_writers(*)")
        .eq("panel_id", id),
      supabase
        .from("hjernevelv_panel_questions" as any)
        .select("*")
        .eq("panel_id", id)
        .order("upvotes", { ascending: false })
        .order("created_at", { ascending: false }),
      userId
        ? supabase
            .from("hjernevelv_panel_registrations" as any)
            .select("*")
            .eq("panel_id", id)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.rpc("hjernevelv_panel_counts" as any, { _panel_id: id }),
    ]);
    setPanel((pRes.data as unknown as HjernevelvPanel) || null);
    const pl = ((plRes.data as any[]) || [])
      .filter((row) => row.writer)
      .map((row) => ({ writer: row.writer as HjernevelvWriter, role: row.role as string }));
    setPanelists(pl);
    setQuestions(((qRes.data as unknown as PanelQuestion[]) || []));
    setMyRegistration((rRes.data as unknown as PanelRegistration) || null);
    const counts = (cRes.data as any[])?.[0];
    if (counts) setRegistrationCount(Number(counts.registration_count) || 0);
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) load();
    else if (!authLoading) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated, userId]);

  const submitQuestion = async () => {
    if (!userId || !id) return;
    const text = newQuestion.trim();
    if (text.length < 5) {
      toast.error(isNo ? "Skriv et lengre spørsmål" : "Write a longer question");
      return;
    }
    setSubmittingQ(true);
    const { error } = await supabase.from("hjernevelv_panel_questions" as any).insert({
      panel_id: id,
      user_id: userId,
      question: text,
      is_anonymous: isAnonymous,
    });
    setSubmittingQ(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewQuestion("");
    toast.success(t.questionSent);
    load();
  };

  const register = async () => {
    if (!userId || !id) return;
    setRegistering(true);
    const { error } = await supabase.from("hjernevelv_panel_registrations" as any).insert({
      panel_id: id,
      user_id: userId,
      comment: comment.trim() || null,
    });
    setRegistering(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.registerSuccess);
    setComment("");
    load();
  };

  const cancelRegistration = async () => {
    if (!myRegistration) return;
    setRegistering(true);
    const { error } = await supabase
      .from("hjernevelv_panel_registrations" as any)
      .delete()
      .eq("id", myRegistration.id);
    setRegistering(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.cancelSuccess);
    load();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="text-muted-foreground font-body mb-4">{t.loginRequired}</p>
          <button onClick={() => navigate("/login")} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-subhead">
            {t.loginCta}
          </button>
        </main>
      </div>
    );
  }

  if (!panel) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center text-muted-foreground font-body">{t.notFound}</main>
      </div>
    );
  }

  const isFull = panel.max_attendees != null && registrationCount >= panel.max_attendees;
  const canRegister = !myRegistration && (panel.status === "open" || panel.status === "live") && !isFull;
  const isUpcoming = new Date(panel.scheduled_at) > new Date();

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> {t.back}
        </button>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-subhead px-2 py-0.5 rounded-full bg-accent/10 text-accent">
              {FORMAT_LABEL[panel.format][language]}
            </span>
            <span className="text-xs font-subhead px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {STATUS_LABEL[panel.status][language]}
            </span>
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-bold text-headline leading-tight mb-3">
            {panel.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground font-body">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> {formatPanelDate(panel.scheduled_at, language)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {panel.format === "physical" ? <Building className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              {panel.location ?? FORMAT_LABEL[panel.format][language]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {registrationCount} {t.attendees}
              {panel.max_attendees ? ` / ${panel.max_attendees}` : ""}
            </span>
          </div>
        </header>

        {panel.description && (
          <p className="text-base text-foreground/85 font-body leading-relaxed mb-8 whitespace-pre-wrap">
            {panel.description}
          </p>
        )}

        {/* Registration */}
        <section className="mb-10 bg-card border border-border rounded-2xl p-6">
          {myRegistration ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-subhead text-accent">
                <Check className="w-4 h-4" /> {t.registered}
              </div>
              {isUpcoming && (
                <button
                  onClick={cancelRegistration}
                  disabled={registering}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition"
                >
                  {registering ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3 inline mr-1" />{t.cancel}</>}
                </button>
              )}
              {myRegistration && panel.meeting_url && (
                <a
                  href={panel.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition inline-flex items-center gap-1"
                >
                  <Video className="w-3 h-3" /> {t.join}
                </a>
              )}
            </div>
          ) : canRegister ? (
            <div className="space-y-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.commentPlaceholder}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={register}
                disabled={registering}
                className="w-full sm:w-auto px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-subhead font-medium hover:opacity-90 disabled:opacity-50 transition inline-flex items-center justify-center gap-1.5"
              >
                {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t.register}
              </button>
            </div>
          ) : isFull ? (
            <p className="text-sm text-muted-foreground font-body">{t.maxReached}</p>
          ) : (
            <p className="text-sm text-muted-foreground font-body">
              {STATUS_LABEL[panel.status][language]}
            </p>
          )}
        </section>

        {/* Panelists */}
        {panelists.length > 0 && (
          <section className="mb-10">
            <h2 className="font-headline text-xl font-semibold text-headline mb-4">{t.panelists}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {panelists.map(({ writer, role }) => (
                <a
                  key={writer.id}
                  href={`/hjernevelvet/skribent/${writer.slug}`}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-accent/40 transition"
                >
                  {writer.avatar_url ? (
                    <img src={writer.avatar_url} alt={writer.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-headline text-muted-foreground">
                      {writer.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-body text-sm text-foreground truncate">{writer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {role === "moderator" ? t.moderator : (writer.expertise[0] ?? "")}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Questions */}
        <section>
          <h2 className="font-headline text-xl font-semibold text-headline mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent" />
            {t.questions}
          </h2>

          {isUpcoming && (
            <div className="bg-card border border-border rounded-xl p-4 mb-5 space-y-3">
              <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={t.placeholder}
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground font-body cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-border"
                  />
                  {t.anonymous}
                </label>
                <button
                  onClick={submitQuestion}
                  disabled={submittingQ || newQuestion.trim().length < 5}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-subhead font-medium hover:opacity-90 disabled:opacity-50 transition inline-flex items-center gap-1.5"
                >
                  {submittingQ ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t.sendQuestion}
                </button>
              </div>
            </div>
          )}

          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body">{t.noQuestions}</p>
          ) : (
            <ul className="space-y-3">
              {questions.map((q) => {
                const isMine = q.user_id === userId;
                return (
                  <li
                    key={q.id}
                    className={`bg-card border rounded-xl p-4 ${
                      q.status === "answered"
                        ? "border-accent/40"
                        : q.status === "pending"
                        ? "border-dashed border-border opacity-80"
                        : "border-border"
                    }`}
                  >
                    <p className="text-sm font-body text-foreground mb-2 whitespace-pre-wrap">{q.question}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-body">
                      <span>
                        {q.is_anonymous
                          ? (isNo ? "Anonym" : "Anonymous")
                          : (q.display_name || (isMine ? (isNo ? "Deg" : "You") : (isNo ? "Leser" : "Reader")))}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        {q.status === "pending" && isMine && (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/60">
                            {isNo ? "Venter" : "Pending"}
                          </span>
                        )}
                        {q.status === "answered" && (
                          <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                            {isNo ? "Besvart" : "Answered"}
                          </span>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default HjernevelvPanelPage;
