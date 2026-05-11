import { useEffect, useState } from "react";
import { X, Loader2, Send, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  articleId: string;
  articleTitle: string;
  authorName: string;
  journalistId: string | null;
}

export function JournalistContactDialog({ open, onClose, articleId, articleTitle, authorName, journalistId }: Props) {
  const { userId, email } = useAuth();
  const { language } = useTheme();
  const navigate = useNavigate();
  const isNo = language === "no";
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const t = isNo
    ? { title: "Kontakt journalist", subtitle: (n: string) => `Skriv direkte til ${n}`, placeholder: "Hva ønsker du å si til journalisten?", send: "Send melding", sent: "Melding sendt!", login: "Du må være logget inn", goLogin: "Logg inn", reArticle: "Om artikkelen:" }
    : { title: "Contact journalist", subtitle: (n: string) => `Write directly to ${n}`, placeholder: "What would you like to tell the journalist?", send: "Send message", sent: "Message sent!", login: "You must be signed in", goLogin: "Sign in", reArticle: "Re article:" };

  useEffect(() => {
    if (!open) setBody("");
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (!userId) return;
    if (body.trim().length < 2) return;
    setSending(true);
    const { error } = await supabase.from("journalist_messages").insert({
      article_id: articleId,
      journalist_id: journalistId,
      from_user_id: userId,
      from_email: email,
      body: body.trim(),
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.sent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-foreground/40 backdrop-blur-sm p-0 md:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card w-full md:max-w-lg rounded-t-3xl md:rounded-3xl shadow-elevated border border-border p-6 md:p-8 animate-fade-up">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <Mail className="w-4 h-4" />
              <span className="text-xs font-subhead font-semibold uppercase tracking-wider">{t.title}</span>
            </div>
            <h3 className="font-headline text-xl font-bold text-headline mt-1">{t.subtitle(authorName)}</h3>
            <p className="text-xs text-muted-foreground font-body mt-1 truncate">{t.reArticle} {articleTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1.5 -mt-1.5 text-muted-foreground hover:text-foreground rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!userId ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground font-body mb-4">{t.login}</p>
            <button onClick={() => navigate("/login")} className="px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold">
              {t.goLogin}
            </button>
          </div>
        ) : (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.placeholder}
              rows={6}
              className="w-full bg-surface-subtle border border-border rounded-2xl p-4 font-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={submit}
                disabled={sending || body.trim().length < 2}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold disabled:opacity-50 hover:bg-accent/90 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t.send}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}