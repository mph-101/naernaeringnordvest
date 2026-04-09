import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StickyNote, X, Save, Loader2, FileText, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface ArticleNotesProps {
  articleId: string;
  articleTitle?: string;
}

export function ArticleNotes({ articleId, articleTitle }: ArticleNotesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { language } = useTheme();
  const isNo = language === "no";

  const t = isNo
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

  const title = articleTitle || `Artikkel #${articleId}`;
  const dateStr = new Date().toLocaleDateString(isNo ? "nb-NO" : "en-US", { day: "numeric", month: "long", year: "numeric" });

  const exportAsTxt = () => {
    if (!content.trim()) return;
    const text = `${title}\n${dateStr}\n${"—".repeat(40)}\n${content}\n`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notat-${articleId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isNo ? "Eksportert som tekstfil" : "Exported as text file");
  };

  const exportAsPdf = async () => {
    if (!content.trim()) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const margin = 20;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const titleLines = doc.splitTextToSize(title, maxWidth);
    for (const line of titleLines) {
      doc.text(line, margin, y);
      y += 7;
    }
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(dateStr, margin, y);
    doc.setTextColor(0);
    y += 12;

    doc.setFontSize(11);
    const lines = doc.splitTextToSize(content, maxWidth);
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 6;
    }

    doc.save(`notat-${articleId}.pdf`);
    toast.success(isNo ? "Eksportert som PDF" : "Exported as PDF");
  };

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
                <div className="text-center py-8">
                  <p className="text-muted-foreground font-body mb-4">{t.login}</p>
                  <button onClick={() => { setIsOpen(false); navigate("/login"); }} className="px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
                    {isNo ? "Logg inn" : "Log in"}
                  </button>
                </div>
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
              <div className="p-5 border-t border-border space-y-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t.save}
                </button>

                {content.trim() && (
                  <div className="flex gap-2">
                    <button
                      onClick={exportAsTxt}
                      className="flex-1 py-2.5 bg-card border border-border rounded-full font-subhead text-xs font-medium text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {isNo ? "Eksporter .txt" : "Export .txt"}
                    </button>
                    <button
                      onClick={exportAsPdf}
                      className="flex-1 py-2.5 bg-card border border-border rounded-full font-subhead text-xs font-medium text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      {isNo ? "Eksporter PDF" : "Export PDF"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
