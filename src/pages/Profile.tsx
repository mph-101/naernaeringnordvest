import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, StickyNote, Users, LogOut, Loader2, Trash2, Globe, Lock } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
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
  const { language } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"notes" | "groups">("notes");

  const t = language === "no"
    ? {
        profile: "Min profil", notes: "Notater", groups: "Grupper",
        noNotes: "Ingen notater ennå", noGroups: "Ingen grupper ennå",
        article: "Artikkel", updated: "Oppdatert", joined: "Ble med",
        admin: "Admin", member: "Medlem", delete: "Slett",
        loginRequired: "Du må logge inn for å se profilen din",
        login: "Logg inn", logout: "Logg ut", members: "medlemmer",
        deleteConfirm: "Er du sikker?", deleted: "Slettet!",
      }
    : {
        profile: "My Profile", notes: "Notes", groups: "Groups",
        noNotes: "No notes yet", noGroups: "No groups yet",
        article: "Article", updated: "Updated", joined: "Joined",
        admin: "Admin", member: "Member", delete: "Delete",
        loginRequired: "You need to log in to view your profile",
        login: "Log in", logout: "Log out", members: "members",
        deleteConfirm: "Are you sure?", deleted: "Deleted!",
      };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);
      setUserEmail(session.user.email ?? null);

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setDisplayName(profile?.display_name ?? null);

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

      setNotes(notesRes.data || []);

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
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-headline text-2xl font-bold text-headline truncate">
              {displayName || userEmail}
            </h1>
            {displayName && (
              <p className="text-sm text-muted-foreground font-body truncate">{userEmail}</p>
            )}
          </div>
        </div>

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
        </div>

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="space-y-3">
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
                        {t.article} #{note.article_id}
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
      </div>
    </div>
  );
};

export default Profile;
