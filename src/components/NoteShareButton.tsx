import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, Loader2, Users, Linkedin, Twitter, Facebook, Link as LinkIcon, X, Check, Shield, Lock, LogIn } from "lucide-react";
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

interface NoteShareButtonProps {
  articleId: string;
  articleTitle?: string;
  content: string;
  variant?: "compact" | "full";
}

type GroupVisibility = "members" | "admins" | "author";
type Pending =
  | { kind: "group"; groupId: string; groupName: string }
  | { kind: "linkedin" }
  | { kind: "twitter" }
  | { kind: "facebook" }
  | { kind: "copy" }
  | null;

export function NoteShareButton({ articleId, articleTitle, content, variant = "compact" }: NoteShareButtonProps) {
  const navigate = useNavigate();
  const { language } = useTheme();
  const isNo = language === "no";
  const [userId, setUserId] = useState<string | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [sharing, setSharing] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [groupVisibility, setGroupVisibility] = useState<GroupVisibility>("members");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const t = isNo
    ? { share: "Del", inGroup: "Del i gruppe", noGroups: "Du er ikke med i noen grupper", socialShare: "Del på sosiale medier", copyLink: "Kopier lenke", copied: "Kopiert!", shared: "Notat delt i gruppen", emptyShare: "Notatet er tomt", previewTitle: "Forhåndsvisning", previewIntro: "Slik blir delingen seende ut:", linkLabel: "Lenke", confirm: "Del nå", cancel: "Avbryt", target: "Mål", visibility: "Synlighet", visMembers: "Alle medlemmer", visMembersDesc: "Synlig for alle i gruppen", visAdmins: "Kun gruppe-admins", visAdminsDesc: "Bare administratorer ser notatet", visAuthor: "Bare meg", visAuthorDesc: "Lagres i gruppen, men kun synlig for deg" }
    : { share: "Share", inGroup: "Share to group", noGroups: "You are not in any groups", socialShare: "Share on social media", copyLink: "Copy link", copied: "Copied!", shared: "Note shared to group", emptyShare: "Note is empty", previewTitle: "Preview", previewIntro: "Here is how the share will look:", linkLabel: "Link", confirm: "Share now", cancel: "Cancel", target: "Target", visibility: "Visibility", visMembers: "All members", visMembersDesc: "Visible to everyone in the group", visAdmins: "Group admins only", visAdminsDesc: "Only group administrators can see it", visAuthor: "Only me", visAuthorDesc: "Stored in the group but visible only to you" };

  const tLogin = isNo
    ? { title: "Logg inn for å dele", body: "Du må være innlogget for å dele notater i grupper eller på sosiale medier.", login: "Logg inn", cancel: "Avbryt" }
    : { title: "Log in to share", body: "You need to be logged in to share notes in groups or on social media.", login: "Log in", cancel: "Cancel" };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);
      const ids = (memberships ?? []).map((m: any) => m.group_id);
      if (ids.length === 0) return setGroups([]);
      const { data: gs } = await supabase
        .from("groups")
        .select("id, name")
        .in("id", ids)
        .order("name", { ascending: true });
      setGroups((gs ?? []) as { id: string; name: string }[]);
    })();
  }, [userId]);

  const title = articleTitle || `Artikkel #${articleId}`;
  const articleUrl = typeof window !== "undefined"
    ? `${window.location.origin}/article/${articleId}`
    : `https://naernaeringnordvest.lovable.app/article/${articleId}`;

  const buildShareText = () => {
    const header = isNo ? `📝 Mitt notat om «${title}»` : `📝 My note on "${title}"`;
    return `${header}\n\n${content.trim()}\n\n${articleUrl}`;
  };

  const requestShare = (target: NonNullable<Pending>) => {
    if (!content.trim()) return toast.error(t.emptyShare);
    setPending(target);
  };

  const openWin = (url: string) => window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");

  const doShareToGroup = async (groupId: string, groupName: string) => {
    if (!userId) return;
    setSharing(true);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId);
    const { error } = await supabase.from("group_messages").insert({
      group_id: groupId,
      user_id: userId,
      content: buildShareText(),
      article_id: isUuid ? articleId : null,
      visibility: groupVisibility,
    });
    setSharing(false);
    if (error) return toast.error(error.message);
    toast.success(`${t.shared}: ${groupName}`, {
      action: { label: isNo ? "Se delte notater" : "View shared notes", onClick: () => navigate("/mine-delte-notater") },
      duration: 6000,
    });
  };

  const confirmShare = async () => {
    if (!pending) return;
    const p = pending;
    setPending(null);
    if (p.kind === "group") return doShareToGroup(p.groupId, p.groupName);
    if (p.kind === "linkedin") return openWin(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`);
    if (p.kind === "twitter") return openWin(`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText())}`);
    if (p.kind === "facebook") return openWin(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}&quote=${encodeURIComponent(buildShareText())}`);
    if (p.kind === "copy") {
      try { await navigator.clipboard.writeText(buildShareText()); toast.success(t.copied); }
      catch { toast.error("Clipboard unavailable"); }
    }
  };

  const pendingLabel = (() => {
    if (!pending) return "";
    switch (pending.kind) {
      case "group": return `${t.inGroup}: ${pending.groupName}`;
      case "linkedin": return "LinkedIn";
      case "twitter": return "X / Twitter";
      case "facebook": return "Facebook";
      case "copy": return t.copyLink;
    }
  })();

  const triggerCls = variant === "full"
    ? "w-full py-2.5 bg-card border border-border rounded-full font-subhead text-xs font-medium text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
    : "p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors flex-shrink-0";

  return (
    <>
      {userId ? (
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button disabled={sharing} className={triggerCls} title={t.share} aria-label={t.share}>
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            {variant === "full" && <span>{t.share}</span>}
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
                      onSelect={(e) => { e.preventDefault(); requestShare({ kind: "group", groupId: g.id, groupName: g.name }); }}
                    >
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
      ) : (
        <button
          onClick={() => setShowLoginPrompt(true)}
          className={triggerCls}
          title={t.share}
          aria-label={t.share}
        >
          <Share2 className="w-4 h-4" />
          {variant === "full" && <span>{t.share}</span>}
        </button>
      )}

      {showLoginPrompt && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowLoginPrompt(false)}>
          <div className="bg-card rounded-2xl shadow-elevated w-full max-w-sm animate-scale-in p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                <LogIn className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <h3 className="font-headline text-lg font-bold text-headline">{tLogin.title}</h3>
                <p className="text-sm text-muted-foreground font-body mt-1">{tLogin.body}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowLoginPrompt(false)} className="flex-1 py-2.5 bg-card border border-border rounded-full font-subhead text-sm font-medium text-foreground hover:bg-secondary transition-colors">{tLogin.cancel}</button>
              <button
                onClick={() => { setShowLoginPrompt(false); navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); }}
                className="flex-1 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft inline-flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-4 h-4" /> {tLogin.login}
              </button>
            </div>
          </div>
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-elevated w-full max-w-md animate-scale-in flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-headline text-lg font-bold text-headline truncate">{t.previewTitle}</h3>
                  <p className="text-xs text-muted-foreground font-body truncate">{t.target}: {pendingLabel}</p>
                </div>
              </div>
              <button onClick={() => setPending(null)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-auto space-y-4">
              <p className="text-sm text-muted-foreground font-body">{t.previewIntro}</p>
              <pre className="bg-surface-subtle border border-border rounded-xl p-4 text-sm font-body text-foreground whitespace-pre-wrap break-words max-h-64 overflow-auto">
                {buildShareText()}
              </pre>

              {pending.kind === "group" && (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-subhead">{t.visibility}</p>
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
                            active ? "bg-accent/5 border-accent/40 ring-2 ring-accent/30" : "bg-card border-border hover:bg-secondary"
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
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-subhead mb-1">{t.linkLabel}</p>
                <a href={articleUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-body text-accent hover:underline break-all inline-flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {articleUrl}
                </a>
              </div>
            </div>

            <div className="p-5 border-t border-border flex gap-2">
              <button onClick={() => setPending(null)} className="flex-1 py-2.5 bg-card border border-border rounded-full font-subhead text-sm font-medium text-foreground hover:bg-secondary transition-colors">{t.cancel}</button>
              <button onClick={confirmShare} disabled={sharing} className="flex-1 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
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