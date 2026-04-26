import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Send, User, MoreVertical, Flag, EyeOff, Eye, Trash2, Shield, AlertTriangle } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  id: string;
  article_id: string;
  user_id: string;
  content: string;
  status: "published" | "hidden" | "deleted";
  moderation_reason: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  author_name: string;
  is_journalist: boolean;
  report_count?: number;
}

interface ArticleDiscussionProps {
  articleId: string;
  authorName: string;
}

const COPY = {
  no: {
    discussion: "Kommentarer",
    sub: "Bli med i samtalen om denne saken",
    placeholder: "Skriv en kommentar...",
    send: "Send",
    loginToComment: "Logg inn for å kommentere",
    empty: "Ingen kommentarer ennå. Vær den første til å si noe.",
    journalist: "Journalist",
    moderator: "Moderator",
    hidden: "Skjult av moderator",
    deleted: "Slettet",
    report: "Rapporter",
    hide: "Skjul",
    unhide: "Vis igjen",
    delete: "Slett",
    deleteOwn: "Slett kommentar",
    moderationReason: "Moderasjonsgrunn (synlig for staben)",
    confirmHide: "Skjul denne kommentaren?",
    confirmDelete: "Slett denne kommentaren permanent?",
    cancel: "Avbryt",
    confirm: "Bekreft",
    reportTitle: "Rapporter kommentar",
    reportDesc: "Fortell hvorfor denne kommentaren bør gjennomgås.",
    reportPlaceholder: "Beskriv kort hva som er galt...",
    submitReport: "Send rapport",
    reportSent: "Rapport sendt — takk for at du varslet oss.",
    reportDuplicate: "Du har allerede rapportert denne kommentaren.",
    posted: "Kommentar publisert",
    error: "Noe gikk galt",
    reportsBadge: (n: number) => `${n} rapport${n === 1 ? "" : "er"}`,
    just: "nå",
    minAgo: (n: number) => `${n} min siden`,
    hAgo: (n: number) => `${n}t siden`,
    dAgo: (n: number) => `${n}d siden`,
  },
  en: {
    discussion: "Comments",
    sub: "Join the conversation about this story",
    placeholder: "Write a comment...",
    send: "Send",
    loginToComment: "Log in to comment",
    empty: "No comments yet. Be the first to say something.",
    journalist: "Journalist",
    moderator: "Moderator",
    hidden: "Hidden by moderator",
    deleted: "Deleted",
    report: "Report",
    hide: "Hide",
    unhide: "Unhide",
    delete: "Delete",
    deleteOwn: "Delete comment",
    moderationReason: "Moderation reason (visible to staff)",
    confirmHide: "Hide this comment?",
    confirmDelete: "Delete this comment permanently?",
    cancel: "Cancel",
    confirm: "Confirm",
    reportTitle: "Report comment",
    reportDesc: "Tell us why this comment should be reviewed.",
    reportPlaceholder: "Briefly describe the issue...",
    submitReport: "Submit report",
    reportSent: "Report submitted — thanks for flagging.",
    reportDuplicate: "You've already reported this comment.",
    posted: "Comment posted",
    error: "Something went wrong",
    reportsBadge: (n: number) => `${n} report${n === 1 ? "" : "s"}`,
    just: "now",
    minAgo: (n: number) => `${n}m ago`,
    hAgo: (n: number) => `${n}h ago`,
    dAgo: (n: number) => `${n}d ago`,
  },
};

function timeAgo(iso: string, lang: "no" | "en") {
  const t = COPY[lang];
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t.just;
  if (m < 60) return t.minAgo(m);
  const h = Math.floor(m / 60);
  if (h < 24) return t.hAgo(h);
  return t.dAgo(Math.floor(h / 24));
}

export function ArticleDiscussion({ articleId, authorName }: ArticleDiscussionProps) {
  const { language } = useTheme();
  const text = COPY[language];
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId, isAuthenticated, isStaff } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const [reportTarget, setReportTarget] = useState<Comment | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [moderationTarget, setModerationTarget] = useState<{ comment: Comment; action: "hide" | "delete" } | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [moderationSubmitting, setModerationSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    // RLS handles visibility: public sees published only; moderators/owners see more.
    const { data, error } = await (supabase as any)
      .from("article_comments")
      .select("id, article_id, user_id, content, status, moderation_reason, moderated_by, moderated_at, created_at")
      .eq("article_id", articleId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load comments", error);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as any[];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    let nameMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);
      nameMap = new Map(
        (profiles ?? []).map((p: any) => [p.user_id, p.display_name || (p.email?.split("@")[0] ?? "Anonym")])
      );
    }

    // Report counts visible to moderators only (RLS will silently return 0 otherwise)
    let reportCounts = new Map<string, number>();
    if (isStaff && rows.length > 0) {
      const { data: reports } = await (supabase as any)
        .from("article_comment_reports")
        .select("comment_id")
        .in("comment_id", rows.map((r) => r.id))
        .eq("status", "open");
      (reports ?? []).forEach((r: any) => {
        reportCounts.set(r.comment_id, (reportCounts.get(r.comment_id) ?? 0) + 1);
      });
    }

    const enriched: Comment[] = rows.map((r) => {
      const name = nameMap.get(r.user_id) ?? "Anonym";
      return {
        ...r,
        author_name: name,
        is_journalist: name.trim().toLowerCase() === authorName.trim().toLowerCase(),
        report_count: reportCounts.get(r.id) ?? 0,
      };
    });
    setComments(enriched);
    setLoading(false);
  }, [articleId, authorName, isStaff]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`article-comments-${articleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "article_comments", filter: `article_id=eq.${articleId}` },
        () => loadComments()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [articleId, loadComments]);

  const handlePost = async () => {
    const content = draft.trim();
    if (!content || !userId) return;
    if (content.length > 4000) {
      toast({ title: text.error, description: "Max 4000 tegn", variant: "destructive" });
      return;
    }
    setPosting(true);
    const { error } = await (supabase as any).from("article_comments").insert({
      article_id: articleId,
      user_id: userId,
      content,
    });
    setPosting(false);
    if (error) {
      toast({ title: text.error, description: error.message, variant: "destructive" });
      return;
    }
    setDraft("");
    toast({ title: text.posted });
    loadComments();
  };

  const submitReport = async () => {
    if (!reportTarget || !userId) return;
    const reason = reportText.trim();
    if (!reason) return;
    setReportSubmitting(true);
    const { error } = await (supabase as any).from("article_comment_reports").insert({
      comment_id: reportTarget.id,
      reporter_id: userId,
      reason,
    });
    setReportSubmitting(false);
    if (error) {
      const dup = error.code === "23505";
      toast({
        title: dup ? text.reportDuplicate : text.error,
        description: dup ? undefined : error.message,
        variant: dup ? "default" : "destructive",
      });
      if (dup) {
        setReportTarget(null);
        setReportText("");
      }
      return;
    }
    toast({ title: text.reportSent });
    setReportTarget(null);
    setReportText("");
  };

  const submitModeration = async () => {
    if (!moderationTarget || !userId) return;
    setModerationSubmitting(true);
    const newStatus = moderationTarget.action === "hide" ? "hidden" : "deleted";
    const { error } = await (supabase as any)
      .from("article_comments")
      .update({
        status: newStatus,
        moderation_reason: moderationReason.trim() || null,
        moderated_by: userId,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", moderationTarget.comment.id);
    setModerationSubmitting(false);
    if (error) {
      toast({ title: text.error, description: error.message, variant: "destructive" });
      return;
    }
    // Mark related open reports as resolved
    await (supabase as any)
      .from("article_comment_reports")
      .update({ status: "resolved", reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("comment_id", moderationTarget.comment.id)
      .eq("status", "open");

    setModerationTarget(null);
    setModerationReason("");
    loadComments();
  };

  const restoreComment = async (c: Comment) => {
    const { error } = await (supabase as any)
      .from("article_comments")
      .update({
        status: "published",
        moderation_reason: null,
        moderated_by: userId,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", c.id);
    if (error) {
      toast({ title: text.error, description: error.message, variant: "destructive" });
      return;
    }
    loadComments();
  };

  const deleteOwn = async (c: Comment) => {
    const { error } = await (supabase as any).from("article_comments").delete().eq("id", c.id);
    if (error) {
      toast({ title: text.error, description: error.message, variant: "destructive" });
      return;
    }
    loadComments();
  };

  return (
    <div className="mt-12 border-t border-border pt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="font-headline text-xl font-bold text-headline">{text.discussion}</h2>
          <p className="text-sm text-muted-foreground font-body">{text.sub}</p>
        </div>
        {isStaff && (
          <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-subhead font-medium">
            <Shield className="w-3 h-3" />
            {text.moderator}
          </span>
        )}
      </div>

      {/* Comments list */}
      <div className="space-y-3 mb-6">
        {loading ? (
          <div className="text-sm text-muted-foreground font-body">…</div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body italic">{text.empty}</p>
        ) : (
          comments.map((c) => {
            const isOwn = c.user_id === userId;
            const isHidden = c.status === "hidden";
            const isDeleted = c.status === "deleted";
            const canModerate = isStaff;
            const canReport = isAuthenticated && !isOwn && c.status === "published";

            return (
              <div
                key={c.id}
                className={`p-4 rounded-xl transition-colors ${
                  isHidden || isDeleted
                    ? "bg-muted/40 border border-dashed border-border"
                    : c.is_journalist
                    ? "bg-accent/5 border border-accent/20"
                    : "bg-card border border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      c.is_journalist ? "bg-accent/20" : "bg-secondary"
                    }`}
                  >
                    <User className={`w-4 h-4 ${c.is_journalist ? "text-accent" : "text-muted-foreground"}`} />
                  </div>
                  <span className="font-subhead text-sm font-semibold text-headline">{c.author_name}</span>
                  {c.is_journalist && (
                    <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-subhead font-medium rounded-full">
                      {text.journalist}
                    </span>
                  )}
                  {isStaff && (c.report_count ?? 0) > 0 && c.status === "published" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive text-xs font-subhead font-medium rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      {text.reportsBadge(c.report_count!)}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground font-body ml-auto">
                    {timeAgo(c.created_at, language)}
                  </span>
                  {(canModerate || canReport || isOwn) && !isDeleted && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label="Handlinger"
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {canReport && (
                          <DropdownMenuItem onClick={() => setReportTarget(c)}>
                            <Flag className="w-4 h-4 mr-2" />
                            {text.report}
                          </DropdownMenuItem>
                        )}
                        {canModerate && c.status === "published" && (
                          <DropdownMenuItem onClick={() => { setModerationTarget({ comment: c, action: "hide" }); setModerationReason(""); }}>
                            <EyeOff className="w-4 h-4 mr-2" />
                            {text.hide}
                          </DropdownMenuItem>
                        )}
                        {canModerate && isHidden && (
                          <DropdownMenuItem onClick={() => restoreComment(c)}>
                            <Eye className="w-4 h-4 mr-2" />
                            {text.unhide}
                          </DropdownMenuItem>
                        )}
                        {canModerate && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setModerationTarget({ comment: c, action: "delete" }); setModerationReason(""); }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {text.delete}
                            </DropdownMenuItem>
                          </>
                        )}
                        {!canModerate && isOwn && (
                          <DropdownMenuItem
                            onClick={() => deleteOwn(c)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {text.deleteOwn}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {isHidden ? (
                  <div className="pl-10">
                    <p className="text-sm text-muted-foreground italic font-body">
                      {text.hidden}
                      {c.moderation_reason && isStaff ? ` — ${c.moderation_reason}` : ""}
                    </p>
                    {isStaff && (
                      <p className="text-foreground font-body leading-relaxed mt-2 opacity-60 line-through">
                        {c.content}
                      </p>
                    )}
                  </div>
                ) : isDeleted ? (
                  <p className="pl-10 text-sm text-muted-foreground italic font-body">{text.deleted}</p>
                ) : (
                  <p className="text-foreground font-body leading-relaxed pl-10 whitespace-pre-wrap">{c.content}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      {isAuthenticated ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={text.placeholder}
            maxLength={4000}
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-body">{draft.length}/4000</span>
            <button
              onClick={handlePost}
              disabled={!draft.trim() || posting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-subhead font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {text.send}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => navigate("/login")}
          className="w-full py-3 bg-card border border-border text-foreground rounded-xl font-subhead text-sm font-semibold hover:bg-secondary transition-colors"
        >
          {text.loginToComment}
        </button>
      )}

      {/* Report dialog */}
      <Dialog open={!!reportTarget} onOpenChange={(o) => { if (!o) { setReportTarget(null); setReportText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text.reportTitle}</DialogTitle>
            <DialogDescription>{text.reportDesc}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder={text.reportPlaceholder}
            maxLength={1000}
            rows={4}
          />
          <DialogFooter>
            <button
              onClick={() => { setReportTarget(null); setReportText(""); }}
              className="px-4 py-2 rounded-lg text-sm font-subhead font-medium text-foreground hover:bg-secondary transition-colors"
            >
              {text.cancel}
            </button>
            <button
              onClick={submitReport}
              disabled={!reportText.trim() || reportSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-subhead font-semibold bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {text.submitReport}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Moderation dialog */}
      <Dialog
        open={!!moderationTarget}
        onOpenChange={(o) => { if (!o) { setModerationTarget(null); setModerationReason(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderationTarget?.action === "hide" ? text.confirmHide : text.confirmDelete}
            </DialogTitle>
            <DialogDescription className="font-body">
              "{moderationTarget?.comment.content.slice(0, 140)}
              {(moderationTarget?.comment.content.length ?? 0) > 140 ? "…" : ""}"
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={moderationReason}
            onChange={(e) => setModerationReason(e.target.value)}
            placeholder={text.moderationReason}
            maxLength={500}
            rows={3}
          />
          <DialogFooter>
            <button
              onClick={() => { setModerationTarget(null); setModerationReason(""); }}
              className="px-4 py-2 rounded-lg text-sm font-subhead font-medium text-foreground hover:bg-secondary transition-colors"
            >
              {text.cancel}
            </button>
            <button
              onClick={submitModeration}
              disabled={moderationSubmitting}
              className={`px-4 py-2 rounded-lg text-sm font-subhead font-semibold disabled:opacity-50 transition-colors ${
                moderationTarget?.action === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-accent text-accent-foreground hover:bg-accent/90"
              }`}
            >
              {text.confirm}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
