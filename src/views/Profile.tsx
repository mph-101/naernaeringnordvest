import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, StickyNote, Users, LogOut, Loader2, Trash2, Globe, Lock, Settings, Eye, EyeOff, Download, FileText, FileDown } from "lucide-react";
import { Header } from "@/components/Header";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ApiKeysSection } from "@/components/ApiKeysSection";
import { SubscriptionSection } from "@/components/SubscriptionSection";
import { NotificationsSection } from "@/components/NotificationsSection";
import { AudioModeSection } from "@/components/AudioModeSection";
import { NoteShareButton } from "@/components/NoteShareButton";
import { supabase } from "@/integrations/supabase/client";
import { useTheme, HideableElement } from "@/hooks/useTheme";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { articlesNo, articlesEn } from "@/lib/articles";

interface Note {
  id: string;
  article_id: string;
  content: string;
  updated_at: string;
}

interface GroupMembership {
  id: string;
  role: string;
  joined_at: string;
  group: {
    id: string;
    name: string;
    description: string | null;
    visibility: string;
  };
}

const Profile = () => {
  const navigate = useNavigate();
  const { language, hiddenElements, toggleHiddenElement, resetAllSettings } = useTheme();
  const isNo = language === "no";
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [articleTitles, setArticleTitles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"notes" | "groups" | "settings">("notes");

  const t = isNo
    ? {
        profile: "Min profil", notes: "Notater", groups: "Grupper", settings: "Innstillinger",
        noNotes: "Ingen notater ennå", noGroups: "Ingen grupper ennå",
        article: "Artikkel", updated: "Oppdatert", joined: "Ble med",
        admin: "Admin", member: "Medlem", delete: "Slett",
        loginRequired: "Du må logge inn for å se profilen din",
        login: "Logg inn", logout: "Logg ut", members: "medlemmer",
        deleteConfirm: "Er du sikker?", deleted: "Slettet!",
        visibilityTitle: "Synlige elementer",
        visibilityDesc: "Velg hvilke seksjoner du vil se i appen",
      }
    : {
        profile: "My Profile", notes: "Notes", groups: "Groups", settings: "Settings",
        noNotes: "No notes yet", noGroups: "No groups yet",
        article: "Article", updated: "Updated", joined: "Joined",
        admin: "Admin", member: "Member", delete: "Delete",
        loginRequired: "You need to log in to view your profile",
        login: "Log in", logout: "Log out", members: "members",
        deleteConfirm: "Are you sure?", deleted: "Deleted!",
        visibilityTitle: "Visible elements",
        visibilityDesc: "Choose which sections to show in the app",
      };

  const toggleItems: { id: HideableElement; labelNo: string; labelEn: string }[] = [
    { id: "search", labelNo: "Spør (AI-chat)", labelEn: "Ask (AI chat)" },
    { id: "feed", labelNo: "Utforsk (nyhetsfeed)", labelEn: "Browse (news feed)" },
    { id: "tall", labelNo: "Tall (selskapsdatabase)", labelEn: "Numbers (company database)" },
    { id: "job_changes", labelNo: "Jobbytter", labelEn: "Job changes" },
  ];

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);
      setUserEmail(session.user.email ?? null);

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, region")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setDisplayName(profile?.display_name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
      setUserRegion((profile as any)?.region ?? null);

      // Fetch notes and groups in parallel
      const [notesRes, groupsRes] = await Promise.all([
        supabase
          .from("article_notes")
          .select("*")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("group_members")
          .select("id, role, joined_at, group_id")
          .eq("user_id", session.user.id)
          .order("joined_at", { ascending: false }),
      ]);

      const fetchedNotes: Note[] = notesRes.data || [];
      setNotes(fetchedNotes);

      // Resolve article titles from local data and DB
      const localArticles = language === "no" ? articlesNo : articlesEn;
      const localMap = new Map(localArticles.map(a => [a.id, a.title]));
      const titleMap = new Map<string, string>();
      const dbIds: string[] = [];

      for (const note of fetchedNotes) {
        const localTitle = localMap.get(note.article_id);
        if (localTitle) {
          titleMap.set(note.article_id, localTitle);
        } else {
          dbIds.push(note.article_id);
        }
      }

      if (dbIds.length > 0) {
        const titleCol = language === "no" ? "title" : "title_en, title";
        const { data: dbArticles } = await supabase
          .from("articles")
          .select("id, title, title_en")
          .in("id", dbIds);
        for (const a of dbArticles || []) {
          titleMap.set(a.id, (language === "no" ? a.title : a.title_en) || a.title);
        }
      }

      setArticleTitles(titleMap);

      // Fetch group details for memberships
      if (groupsRes.data && groupsRes.data.length > 0) {
        const groupIds = groupsRes.data.map(m => m.group_id);
        const { data: groupDetails } = await supabase
          .from("groups")
          .select("id, name, description, visibility")
          .in("id", groupIds);

        const groupMap = new Map((groupDetails || []).map(g => [g.id, g]));
        const memberships: GroupMembership[] = groupsRes.data
          .map(m => ({
            id: m.id,
            role: m.role,
            joined_at: m.joined_at,
            group: groupMap.get(m.group_id)!,
          }))
          .filter(m => m.group);
        setGroups(memberships);
      }

      setLoading(false);
    };

    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) { setUserId(null); setUserEmail(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase.from("article_notes").delete().eq("id", noteId);
    if (error) { toast.error(error.message); return; }
    setNotes(prev => prev.filter(n => n.id !== noteId));
    toast.success(t.deleted);
  };

  const handleLeaveGroup = async (membershipId: string) => {
    const { error } = await supabase.from("group_members").delete().eq("id", membershipId);
    if (error) { toast.error(error.message); return; }
    setGroups(prev => prev.filter(g => g.id !== membershipId));
    toast.success(t.deleted);
  };

  const buildNotesText = () => {
    return notes.map(note => {
      const title = articleTitles.get(note.article_id) || `${t.article} #${note.article_id}`;
      const date = new Date(note.updated_at).toLocaleDateString(isNo ? "nb-NO" : "en-US", { day: "numeric", month: "long", year: "numeric" });
      return `${title}\n${date}\n${"—".repeat(40)}\n${note.content}\n`;
    }).join("\n\n");
  };

  const exportAsTxt = () => {
    if (notes.length === 0) return;
    const text = buildNotesText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notater-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isNo ? "Eksportert som tekstfil" : "Exported as text file");
  };

  const exportAsPdf = async () => {
    if (notes.length === 0) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(isNo ? "Mine notater" : "My Notes", margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(new Date().toLocaleDateString(isNo ? "nb-NO" : "en-US", { day: "numeric", month: "long", year: "numeric" }), margin, y);
    doc.setTextColor(0);
    y += 12;

    for (const note of notes) {
      const title = articleTitles.get(note.article_id) || `${t.article} #${note.article_id}`;
      const date = new Date(note.updated_at).toLocaleDateString(isNo ? "nb-NO" : "en-US", { day: "numeric", month: "short", year: "numeric" });

      if (y > 260) { doc.addPage(); y = 20; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, margin, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(date, margin, y);
      doc.setTextColor(0);
      y += 8;

      doc.setFontSize(10);
      const lines = doc.splitTextToSize(note.content, maxWidth);
      for (const line of lines) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 5;
      }
      y += 10;
    }

    doc.save(`notater-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(isNo ? "Eksportert som PDF" : "Exported as PDF");
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
    </div>
  );

  if (!userId) return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <User className="w-8 h-8 text-accent" />
        </div>
        <h1 className="font-headline text-2xl font-bold text-headline mb-3">{t.loginRequired}</h1>
        <button onClick={() => navigate("/login")} className="px-6 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
          {t.login}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />

      <div className="max-w-3xl mx-auto px-6 py-12">
        <ProfileEditor
          userId={userId}
          userEmail={userEmail}
          displayName={displayName}
          avatarUrl={avatarUrl}
          userRegion={userRegion}
          onUpdate={(updates) => {
            if (updates.displayName !== undefined) setDisplayName(updates.displayName || null);
            if (updates.avatarUrl !== undefined) setAvatarUrl(updates.avatarUrl || null);
            if (updates.region !== undefined) setUserRegion(updates.region || null);
          }}
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-subhead font-medium transition-all ${
              activeTab === "notes"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-card border border-border text-foreground hover:bg-secondary"
            }`}
          >
            <StickyNote className="w-4 h-4" />
            {t.notes} ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-subhead font-medium transition-all ${
              activeTab === "groups"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-card border border-border text-foreground hover:bg-secondary"
            }`}
          >
            <Users className="w-4 h-4" />
            {t.groups} ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-subhead font-medium transition-all ${
              activeTab === "settings"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-card border border-border text-foreground hover:bg-secondary"
            }`}
          >
            <Settings className="w-4 h-4" />
            {t.settings}
          </button>
        </div>

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            {notes.length > 0 && (
              <div className="flex gap-2 justify-end mb-2">
                <button
                  onClick={exportAsTxt}
                  className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-subhead font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {isNo ? "Eksporter .txt" : "Export .txt"}
                </button>
                <button
                  onClick={exportAsPdf}
                  className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-subhead font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  {isNo ? "Eksporter PDF" : "Export PDF"}
                </button>
              </div>
            )}
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <StickyNote className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-body">{t.noNotes}</p>
              </div>
            ) : (
              notes.map(note => (
                <div key={note.id} className="bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/article/${note.article_id}`}
                        className="text-sm text-accent hover:underline font-subhead font-medium"
                      >
                        {articleTitles.get(note.article_id) || `${t.article} #${note.article_id}`}
                      </Link>
                      <p className="text-foreground font-body mt-2 line-clamp-3 leading-relaxed">
                        {note.content}
                      </p>
                      <span className="text-xs text-muted-foreground font-body mt-2 inline-block">
                        {t.updated} {new Date(note.updated_at).toLocaleDateString(language === "no" ? "nb-NO" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <NoteShareButton
                      articleId={note.article_id}
                      articleTitle={articleTitles.get(note.article_id)}
                      content={note.content}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === "groups" && (
          <div className="space-y-3">
            {groups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-body mb-4">{t.noGroups}</p>
                <button onClick={() => navigate("/grupper")} className="px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
                  {language === "no" ? "Utforsk grupper" : "Browse groups"}
                </button>
              </div>
            ) : (
              groups.map(membership => (
                <div key={membership.id} className="bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/grupper/${membership.group.id}`} className="font-headline text-lg font-semibold text-headline truncate hover:text-accent transition-colors">
                          {membership.group.name}
                        </Link>
                        {membership.group.visibility === "invite_only" ? (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={`px-2 py-0.5 text-xs font-subhead font-medium rounded-full flex-shrink-0 ${
                          membership.role === "admin" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                        }`}>
                          {membership.role === "admin" ? t.admin : t.member}
                        </span>
                      </div>
                      {membership.group.description && (
                        <p className="text-sm text-muted-foreground font-body line-clamp-2">{membership.group.description}</p>
                      )}
                      <span className="text-xs text-muted-foreground font-body mt-2 inline-block">
                        {t.joined} {new Date(membership.joined_at).toLocaleDateString(language === "no" ? "nb-NO" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleLeaveGroup(membership.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <SubscriptionSection isNo={isNo} />

            <NotificationsSection userId={userId} isNo={isNo} />

            <AudioModeSection userId={userId} isNo={isNo} />

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-headline text-lg font-semibold text-headline mb-1">
                {isNo ? "Nyhetsbrev" : "Newsletter"}
              </h3>
              <p className="text-sm text-muted-foreground font-body mb-4">
                {isNo
                  ? "Meld deg på morgenbrief, ukebrev eller sektorbrev."
                  : "Sign up for the morning brief, weekly brief or sector brief."}
              </p>
              <button
                onClick={() => navigate("/nyhetsbrev")}
                className="px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft"
              >
                {isNo ? "Administrer nyhetsbrev" : "Manage newsletters"}
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-headline text-lg font-semibold text-headline mb-1">{t.visibilityTitle}</h3>
              <p className="text-sm text-muted-foreground font-body mb-5">{t.visibilityDesc}</p>
              <div className="space-y-4">
                {toggleItems.map(item => {
                  const isVisible = !hiddenElements.includes(item.id);
                  return (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isVisible ? <Eye className="w-4 h-4 text-accent" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-sm font-body text-foreground">{isNo ? item.labelNo : item.labelEn}</span>
                      </div>
                      <Switch
                        checked={isVisible}
                        onCheckedChange={() => toggleHiddenElement(item.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <ApiKeysSection isNo={isNo} />

            <button
              onClick={() => { resetAllSettings(); toast.success(isNo ? "Innstillinger tilbakestilt" : "Settings reset"); }}
              className="w-full py-3 px-4 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl font-subhead text-sm font-medium transition-colors"
            >
              {isNo ? "Tilbakestill alle innstillinger" : "Reset all settings"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
