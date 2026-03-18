import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StickyNote, X, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface ArticleNotesProps {
  articleId: string;
}

export function ArticleNotes({ articleId }: ArticleNotesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { language } = useTheme();

  const t = language === "no"
    ? { notes: "Mine notater", placeholder: "Skriv notater om denne artikkelen...", save: "Lagre", saved: "Lagret!", login: "Logg inn for å bruke notater" }
    : { notes: "My Notes", placeholder: "Write notes about this article...", save: "Save", saved: "Saved!", login: "Log in to use notes" };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);
    supabase
      .from("article_notes")
      .select("content")
      .eq("article_id", articleId)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setContent(data?.content ?? "");
        setLoading(false);
      });
  }, [isOpen, userId, articleId]);

  const handleSave = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("article_notes")
      .upsert({ user_id: userId, article_id: articleId, content }, { onConflict: "user_id,article_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.saved);
    }
  }, [userId, articleId, content, t.saved]);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-accent text-accent-foreground rounded-full shadow-elevated flex items-center justify-center hover:scale-105 transition-transform"
        aria-label={t.notes}
      >
        <StickyNote className="w-6 h-6" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-elevated w-full max-w-md animate-scale-in flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center">
                  <StickyNote className="w-4 h-4 text-accent" />
                </div>
                <h3 className="font-headline text-lg font-bold text-headline">{t.notes}</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 overflow-auto">
              {!userId ? (
                <p className="text-muted-foreground font-body text-center py-8">{t.login}</p>
              ) : loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t.placeholder}
                  className="w-full h-64 bg-surface-subtle border border-border rounded-xl p-4 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
                />
              )}
            </div>

            {/* Footer */}
            {userId && !loading && (
              <div className="p-5 border-t border-border">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t.save}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
