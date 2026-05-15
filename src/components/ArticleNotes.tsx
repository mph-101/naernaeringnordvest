import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StickyNote, X, Save, Loader2, FileText, FileDown, Share2, Users, Linkedin, Twitter, Facebook, Link as LinkIcon, Check, Eye, Shield, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

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
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [sharing, setSharing] = useState(false);
  const [pendingShare, setPendingShare] = useState<
    | { kind: "group"; groupId: string; groupName: string }
    | { kind: "linkedin" }
    | { kind: "twitter" }
    | { kind: "facebook" }
    | { kind: "copy" }
    | null
  >(null);
  type GroupVisibility = "members" | "admins" | "author";
  const [groupVisibility, setGroupVisibility] = useState<GroupVisibility>("members");
  const navigate = useNavigate();
  const { language } = useTheme();
  const isNo = language === "no";

  const t = isNo
    ? { notes: "Mine notater", placeholder: "Skriv notater om denne artikkelen...", save: "Lagre", saved: "Lagret!", login: "Logg inn for å bruke notater", share: "Del notat", inGroup: "Del i gruppe", noGroups: "Du er ikke med i noen grupper", socialShare: "Del på sosiale medier", copyLink: "Kopier lenke", copied: "Kopiert!", shared: "Notat delt i gruppen", emptyShare: "Skriv et notat før du deler", previewTitle: "Forhåndsvisning", previewIntro: "Slik blir delingen seende ut:", linkLabel: "Lenke", confirm: "Del nå", cancel: "Avbryt", target: "Mål", visibility: "Synlighet", visMembers: "Alle medlemmer", visMembersDesc: "Synlig for alle i gruppen", visAdmins: "Kun gruppe-admins", visAdminsDesc: "Bare administratorer ser notatet", visAuthor: "Bare meg", visAuthorDesc: "Lagres i gruppen, men kun synlig for deg" }
    : { notes: "My Notes", placeholder: "Write notes about this article...", save: "Save", saved: "Saved!", login: "Log in to use notes", share: "Share note", inGroup: "Share to group", noGroups: "You are not in any groups", socialShare: "Share on social media", copyLink: "Copy link", copied: "Copied!", shared: "Note shared to group", emptyShare: "Write a note before sharing", previewTitle: "Preview", previewIntro: "Here is how the share will look:", linkLabel: "Link", confirm: "Share now", cancel: "Cancel", target: "Target", visibility: "Visibility", visMembers: "All members", visMembersDesc: "Visible to everyone in the group", visAdmins: "Group admins only", visAdminsDesc: "Only group administrators can see it", visAuthor: "Only me", visAuthorDesc: "Stored in the group but visible only to you" };

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
    const onOpen = () => setIsOpen(true);
    window.addEventListener("nn:open-article-notes", onOpen);
    return () => window.removeEventListener("nn:open-article-notes", onOpen);
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

  // Load groups the user is a member of so they can share notes there.
  useEffect(() => {
    if (!isOpen || !userId) return;
    (async () => {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);
      const ids = (memberships ?? []).map((m: any) => m.group_id);
      if (ids.length === 0) {
        setGroups([]);
        return;
      }
      const { data: gs } = await supabase
        .from("groups")
        .select("id, name")
        .in("id", ids)
        .order("name", { ascending: true });
      setGroups((gs ?? []) as { id: string; name: string }[]);
    })();
  }, [isOpen, userId]);

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
  const articleUrl = typeof window !== "undefined"
    ? `${window.location.origin}/article/${articleId}`
    : `https://naernaeringnordvest.lovable.app/article/${articleId}`;

  const buildShareText = () => {
    const header = isNo ? `📝 Mitt notat om «${title}»` : `📝 My note on "${title}"`;
    return `${header}\n\n${content.trim()}\n\n${articleUrl}`;
  };

  const doShareToGroup = async (groupId: string, groupName: string) => {
    if (!userId || !content.trim()) {
      toast.error(t.emptyShare);
      return;
    }
    setSharing(true);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId);
    const { error } = await supabase
      .from("group_messages")
      .insert({
        group_id: groupId,
        user_id: userId,
        content: buildShareText(),
        article_id: isUuid ? articleId : null,
        visibility: groupVisibility,
      });
    setSharing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${t.shared}: ${groupName}`, {
      action: {
        label: isNo ? "Se delte notater" : "View shared notes",
        onClick: () => navigate("/mine-delte-notater"),
      },
      duration: 6000,
    });
  };

  const openShareWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const doShareLinkedIn = () => {
    if (!content.trim()) return toast.error(t.emptyShare);
    openShareWindow(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`,
    );
  };

  const doShareTwitter = () => {
    if (!content.trim()) return toast.error(t.emptyShare);
    openShareWindow(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText())}`,
    );
  };

  const doShareFacebook = () => {
    if (!content.trim()) return toast.error(t.emptyShare);
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}&quote=${encodeURIComponent(buildShareText())}`,
    );
  };

  const doCopyShareText = async () => {
    if (!content.trim()) return toast.error(t.emptyShare);
    try {
      await navigator.clipboard.writeText(buildShareText());
      toast.success(t.copied);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  const requestShare = (target: NonNullable<typeof pendingShare>) => {
    if (!content.trim()) {
      toast.error(t.emptyShare);
      return;
    }
    setPendingShare(target);
  };

  const confirmPendingShare = async () => {
    if (!pendingShare) return;
    const target = pendingShare;
    setPendingShare(null);
    if (target.kind === "group") await doShareToGroup(target.groupId, target.groupName);
    else if (target.kind === "linkedin") doShareLinkedIn();
    else if (target.kind === "twitter") doShareTwitter();
    else if (target.kind === "facebook") doShareFacebook();
    else if (target.kind === "copy") await doCopyShareText();
  };

  const pendingTargetLabel = (() => {
    if (!pendingShare) return "";
    switch (pendingShare.kind) {
      case "group": return `${t.inGroup}: ${pendingShare.groupName}`;
      case "linkedin": return "LinkedIn";
      case "twitter": return "X / Twitter";
      case "facebook": return "Facebook";
      case "copy": return t.copyLink;
    }
  })();

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
        data-tour="article-notes"
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

                {content.trim() && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={sharing}
                        className="w-full py-2.5 bg-card border border-border rounded-full font-subhead text-xs font-medium text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                        {t.share}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 z-[60]">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Users className="w-4 h-4 mr-2" />
                          {t.inGroup}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                            {groups.length === 0 ? (
                              <DropdownMenuItem disabled>{t.noGroups}</DropdownMenuItem>
                            ) : (
                              groups.map((g) => (
                                <DropdownMenuItem
                                  key={g.id}
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    requestShare({ kind: "group", groupId: g.id, groupName: g.name });
                                  }}
                                >
                                  <Check className="w-3.5 h-3.5 mr-2 opacity-0 group-data-[state=checked]:opacity-100" />
                                  {g.name}
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>{t.socialShare}</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); requestShare({ kind: "linkedin" }); }}>
                        <Linkedin className="w-4 h-4 mr-2" /> LinkedIn
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); requestShare({ kind: "twitter" }); }}>
                        <Twitter className="w-4 h-4 mr-2" /> X / Twitter
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); requestShare({ kind: "facebook" }); }}>
                        <Facebook className="w-4 h-4 mr-2" /> Facebook
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); requestShare({ kind: "copy" }); }}>
                        <LinkIcon className="w-4 h-4 mr-2" /> {t.copyLink}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share preview dialog */}
      {pendingShare && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-elevated w-full max-w-md animate-scale-in flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-headline text-lg font-bold text-headline truncate">{t.previewTitle}</h3>
                  <p className="text-xs text-muted-foreground font-body truncate">
                    {t.target}: {pendingTargetLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPendingShare(null)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-auto space-y-4">
              <p className="text-sm text-muted-foreground font-body">{t.previewIntro}</p>
              <pre className="bg-surface-subtle border border-border rounded-xl p-4 text-sm font-body text-foreground whitespace-pre-wrap break-words max-h-64 overflow-auto">
                {buildShareText()}
              </pre>
              {pendingShare?.kind === "group" && (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-subhead">
                    {t.visibility}
                  </p>
                  <div className="grid gap-2">
                    {([
                      { key: "members" as GroupVisibility, icon: Users, label: t.visMembers, desc: t.visMembersDesc },
                      { key: "admins" as GroupVisibility, icon: Shield, label: t.visAdmins, desc: t.visAdminsDesc },
                      { key: "author" as GroupVisibility, icon: Lock, label: t.visAuthor, desc: t.visAuthorDesc },
                    ]).map((opt) => {
                      const active = groupVisibility === opt.key;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setGroupVisibility(opt.key)}
                          className={`flex items-start gap-3 text-left p-3 rounded-xl border transition-all ${
                            active
                              ? "bg-accent/5 border-accent/40 ring-2 ring-accent/30"
                              : "bg-card border-border hover:bg-secondary"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${active ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-subhead text-sm font-semibold text-headline">{opt.label}</p>
                            <p className="text-xs text-muted-foreground font-body leading-snug">{opt.desc}</p>
                          </div>
                          {active && <Check className="w-4 h-4 text-accent flex-shrink-0 mt-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-subhead mb-1">
                  {t.linkLabel}
                </p>
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-body text-accent hover:underline break-all inline-flex items-center gap-1"
                >
                  <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {articleUrl}
                </a>
              </div>
            </div>

            <div className="p-5 border-t border-border flex gap-2">
              <button
                onClick={() => setPendingShare(null)}
                className="flex-1 py-2.5 bg-card border border-border rounded-full font-subhead text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmPendingShare}
                disabled={sharing}
                className="flex-1 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
