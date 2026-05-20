import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, Plus, Lock, Globe, Search, Loader2, LogIn } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  created_by: string | null;
  created_at: string;
  member_count?: number;
}

const Groups = () => {
  const navigate = useNavigate();
  const { language } = useTheme();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [newGroup, setNewGroup] = useState({ name: "", description: "", visibility: "public" });
  const [creating, setCreating] = useState(false);

  const t = language === "no"
    ? {
        title: "Grupper", subtitle: "Diskuter og samarbeid", create: "Opprett gruppe", search: "Søk grupper...",
        name: "Gruppenavn", desc: "Beskrivelse", public: "Offentlig", inviteOnly: "Kun inviterte",
        members: "medlemmer", join: "Bli med", open: "Åpne", cancel: "Avbryt", save: "Opprett",
        login: "Logg inn for å opprette grupper", noGroups: "Ingen grupper ennå", visibility: "Synlighet",
      }
    : {
        title: "Groups", subtitle: "Discuss and collaborate", create: "Create Group", search: "Search groups...",
        name: "Group name", desc: "Description", public: "Public", inviteOnly: "Invite only",
        members: "members", join: "Join", open: "Open", cancel: "Cancel", save: "Create",
        login: "Log in to create groups", noGroups: "No groups yet", visibility: "Visibility",
      };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("groups").select("*");
    if (error) { toast.error(error.message); setLoading(false); return; }

    // Get member counts
    const groupIds = (data || []).map(g => g.id);
    if (groupIds.length > 0) {
      const { data: members } = await supabase.from("group_members").select("group_id").in("group_id", groupIds);
      const counts: Record<string, number> = {};
      members?.forEach(m => { counts[m.group_id] = (counts[m.group_id] || 0) + 1; });
      setGroups((data || []).map(g => ({ ...g, member_count: counts[g.id] || 0 })));
    } else {
      setGroups([]);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!userId || !newGroup.name.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from("groups").insert({
      name: newGroup.name.trim(),
      description: newGroup.description.trim() || null,
      visibility: newGroup.visibility,
      created_by: userId,
    }).select().single();
    if (error) { toast.error(error.message); setCreating(false); return; }

    // Add creator as admin member
    await supabase.from("group_members").insert({ group_id: data.id, user_id: userId, role: "admin" });
    setCreating(false);
    setShowCreate(false);
    setNewGroup({ name: "", description: "", visibility: "public" });
    fetchGroups();
    navigate(`/grupper/${data.id}`);
  };

  const handleJoin = async (groupId: string) => {
    if (!userId) return;
    const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: userId });
    if (error) { toast.error(error.message); return; }
    toast.success(language === "no" ? "Du er nå medlem!" : "You're now a member!");
    navigate(`/grupper/${groupId}`);
  };

  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-headline text-2xl md:text-3xl font-bold text-headline">{t.title}</h1>
            <p className="text-muted-foreground font-body text-sm mt-1">{t.subtitle}</p>
          </div>
          {userId && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
              <Plus className="w-4 h-4" /> {t.create}
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.search}
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
        </div>

        {/* Login prompt */}
        {!userId && !loading && filtered.length > 0 && (
          <div className="mb-4 p-4 bg-accent/5 border border-accent/20 rounded-xl flex items-center gap-3">
            <LogIn className="w-5 h-5 text-accent flex-shrink-0" />
            <p className="text-sm font-body text-foreground flex-1">
              {language === "no"
                ? "Logg inn for å bli med i grupper og delta i samtaler."
                : "Log in to join groups and participate in conversations."}
            </p>
            <Link to="/login" className="px-4 py-2 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors flex-shrink-0">
              {language === "no" ? "Logg inn" : "Log in"}
            </Link>
          </div>
        )}

        {/* Groups List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-body">{t.noGroups}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(group => (
              <div key={group.id} className="bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-headline text-lg font-semibold text-headline truncate">{group.name}</h3>
                      {group.visibility === "invite_only" ? (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground font-body line-clamp-2">{group.description}</p>
                    )}
                    <span className="text-xs text-muted-foreground font-body mt-2 inline-block">
                      {group.member_count ?? 0} {t.members}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(userId ? `/grupper/${group.id}` : "/login")}
                    className="ml-4 px-4 py-2 bg-secondary text-foreground rounded-full font-subhead text-sm font-medium hover:bg-secondary/80 transition-colors flex-shrink-0"
                  >
                    {userId ? t.open : (language === "no" ? "Logg inn" : "Log in")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-elevated max-w-md w-full p-6 animate-scale-in">
            <h2 className="font-headline text-xl font-bold text-headline mb-5">{t.create}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.name}</label>
                <input value={newGroup.name} onChange={e => setNewGroup(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-3 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" />
              </div>
              <div>
                <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.desc}</label>
                <textarea value={newGroup.description} onChange={e => setNewGroup(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none" />
              </div>
              <div>
                <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.visibility}</label>
                <div className="flex gap-2">
                  <button onClick={() => setNewGroup(p => ({ ...p, visibility: "public" }))} className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-subhead font-medium transition-all ${newGroup.visibility === "public" ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border text-foreground hover:bg-secondary"}`}>
                    <Globe className="w-4 h-4" /> {t.public}
                  </button>
                  <button onClick={() => setNewGroup(p => ({ ...p, visibility: "invite_only" }))} className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-subhead font-medium transition-all ${newGroup.visibility === "invite_only" ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border text-foreground hover:bg-secondary"}`}>
                    <Lock className="w-4 h-4" /> {t.inviteOnly}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-3 bg-card border border-border text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary transition-colors">{t.cancel}</button>
              <button onClick={handleCreate} disabled={creating || !newGroup.name.trim()} className="flex-1 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft disabled:opacity-50 flex items-center justify-center gap-2">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />} {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
