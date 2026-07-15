import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUrlParam } from "@/lib/params";
import { ArrowLeft, Send, Users, Lock, Globe, Settings, UserPlus, Loader2, Newspaper, Shield, Eye } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface Message {
  id: string;
  user_id: string;
  content: string;
  article_id: string | null;
  visibility?: string | null;
  created_at: string;
  profile?: { display_name: string | null };
}

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  created_by: string | null;
}

const GroupDetail = () => {
  const id = getUrlParam();
  const navigate = useNavigate();
  const { language } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [group, setGroup] = useState<GroupData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const t = language === "no"
    ? {
        back: "Tilbake", members: "medlemmer", join: "Bli med", send: "Send",
        placeholder: "Skriv en melding...", loginJoin: "Logg inn for å bli med",
        invite: "Inviter", inviteTitle: "Inviter via e-post", inviteEmail: "E-postadresse",
        cancel: "Avbryt", sendInvite: "Send invitasjon", invited: "Invitasjon sendt!",
        notFound: "Gruppe ikke funnet", noMessages: "Ingen meldinger ennå. Start samtalen!",
        articleRef: "Om artikkel",
        visAdmins: "Kun admins", visAuthor: "Kun deg",
      }
    : {
        back: "Back", members: "members", join: "Join", send: "Send",
        placeholder: "Write a message...", loginJoin: "Log in to join",
        invite: "Invite", inviteTitle: "Invite via email", inviteEmail: "Email address",
        cancel: "Cancel", sendInvite: "Send invite", invited: "Invitation sent!",
        notFound: "Group not found", noMessages: "No messages yet. Start the conversation!",
        articleRef: "About article",
        visAdmins: "Admins only", visAuthor: "Only you",
      };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchGroup();
    fetchMessages();
    fetchMemberCount();

    // Realtime
    const channel = supabase
      .channel(`group-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${id}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        // Fetch profile for new message author
        fetchProfileFor(newMsg.user_id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    if (!id || !userId) return;
    supabase.from("group_members").select("role").eq("group_id", id).eq("user_id", userId).maybeSingle()
      .then(({ data }) => {
        setIsMember(!!data);
        setIsAdmin(data?.role === "admin");
      });
  }, [id, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchGroup = async () => {
    const { data } = await supabase.from("groups").select("*").eq("id", id!).maybeSingle();
    setGroup(data);
    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data } = await supabase.from("group_messages").select("*").eq("group_id", id!).order("created_at", { ascending: true });
    setMessages(data || []);
    // Fetch profiles for all unique user_ids
    const userIds = [...new Set((data || []).map(m => m.user_id))];
    userIds.forEach(uid => fetchProfileFor(uid));
  };

  const fetchProfileFor = async (uid: string) => {
    if (profiles[uid]) return;
    const { data } = await supabase.from("profiles").select("display_name").eq("user_id", uid).maybeSingle();
    if (data) setProfiles(prev => ({ ...prev, [uid]: data.display_name || "Anonym" }));
  };

  const fetchMemberCount = async () => {
    const { count } = await supabase.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", id!);
    setMemberCount(count || 0);
  };

  const handleJoin = async () => {
    if (!userId || !id) return;
    const { error } = await supabase.from("group_members").insert({ group_id: id, user_id: userId });
    if (error) { toast.error(error.message); return; }
    setIsMember(true);
    fetchMemberCount();
    fetchMessages();
  };

  const handleSend = async () => {
    if (!message.trim() || !userId || !id) return;
    const content = message.trim();
    setMessage("");
    const { error } = await supabase.from("group_messages").insert({ group_id: id, user_id: userId, content });
    if (error) toast.error(error.message);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !id) return;
    const { error } = await supabase.from("group_invitations").insert({
      group_id: id, invited_by: userId, invite_email: inviteEmail.trim(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t.invited);
    setInviteEmail("");
    setShowInvite(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
    </div>
  );

  if (!group) return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h1 className="font-headline text-2xl font-bold text-headline mb-4">{t.notFound}</h1>
        <button onClick={() => navigate("/grupper")} className="text-accent hover:underline font-body">{t.back}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showSearch={false} />

      {/* Group Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <button onClick={() => navigate("/grupper")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 font-body text-sm">
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline text-xl font-bold text-headline">{group.name}</h1>
                {group.visibility === "invite_only" ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
              </div>
              {group.description && <p className="text-sm text-muted-foreground font-body mt-1">{group.description}</p>}
              <span className="text-xs text-muted-foreground font-body mt-2 inline-flex items-center gap-1">
                <Users className="w-3 h-3" /> {memberCount} {t.members}
              </span>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-foreground rounded-full font-subhead text-xs font-medium hover:bg-secondary/80 transition-colors">
                  <UserPlus className="w-3.5 h-3.5" /> {t.invite}
                </button>
              )}
              {!isMember && userId && (
                <button onClick={handleJoin} className="px-4 py-2 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
                  {t.join}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-3">
          {!userId ? (
            <div className="text-center py-16 space-y-4">
              <Lock className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground font-body">
                {language === "no"
                  ? "Du må være innlogget for å se meldinger i denne gruppen."
                  : "You need to be logged in to view messages in this group."}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft"
              >
                {language === "no" ? "Logg inn" : "Log in"}
              </Link>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground font-body py-12">{t.noMessages}</p>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`p-4 rounded-xl ${msg.user_id === userId ? "bg-accent/5 border border-accent/20 ml-8" : "bg-card border border-border mr-8"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-subhead text-sm font-semibold text-headline">
                    {profiles[msg.user_id] || "..."}
                  </span>
                  <span className="text-xs text-muted-foreground font-body">
                    {new Date(msg.created_at).toLocaleString(language === "no" ? "nb-NO" : "en-US", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                  </span>
                </div>
                <p className="text-foreground font-body leading-relaxed">{msg.content}</p>
                {msg.visibility && msg.visibility !== "members" && (
                  <span className="inline-flex items-center gap-1 mt-2 mr-2 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[0.625rem] font-subhead font-semibold uppercase tracking-wider">
                    {msg.visibility === "admins" ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {msg.visibility === "admins" ? t.visAdmins : t.visAuthor}
                  </span>
                )}
                {msg.article_id && (
                  <Link to={`/article/${msg.article_id}`} className="inline-flex items-center gap-1 mt-2 text-xs text-accent hover:underline font-body">
                    <Newspaper className="w-3 h-3" /> {t.articleRef}
                  </Link>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      {isMember && (
        <div className="border-t border-border bg-card p-4">
          <div className="max-w-3xl mx-auto relative">
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder={t.placeholder}
              className="w-full px-4 py-3 pr-12 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
            <button onClick={handleSend} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {!isMember && userId && (
        <div className="border-t border-border bg-card p-4 text-center">
          <button onClick={handleJoin} className="px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
            {t.join}
          </button>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-elevated max-w-sm w-full p-6 animate-scale-in">
            <h3 className="font-headline text-lg font-bold text-headline mb-4">{t.inviteTitle}</h3>
            <div className="mb-4">
              <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.inviteEmail}</label>
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" className="w-full px-4 py-3 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-3 bg-card border border-border text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary transition-colors">{t.cancel}</button>
              <button onClick={handleInvite} disabled={!inviteEmail.trim()} className="flex-1 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft disabled:opacity-50">{t.sendInvite}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;
