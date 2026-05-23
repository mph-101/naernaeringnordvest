import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail, ExternalLink, Loader2, FileText, MessageSquare, User as UserIcon, Briefcase, Globe2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { FollowUserButton } from "@/components/FollowUserButton";
import { LiveStreamPlayer } from "@/components/LiveStreamPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

interface JournalistProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  bio: string | null;
  title: string | null;
  beat: string | null;
  contact_email: string | null;
  social_urls: Record<string, string> | null;
  editorial_region: string | null;
}

interface ArticleRow {
  id: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  published_at: string | null;
  image_url: string | null;
  type: string | null;
}

interface ContributionRow {
  id: string;
  group_id: string;
  group_name: string;
  content: string;
  created_at: string;
}

interface LiveStreamRow {
  id: string;
  user_id: string;
  status: string;
  title: string | null;
  playback_id: string;
  started_at: string | null;
}

type Tab = "saker" | "bidrag" | "om";

const PUBLIC_ROLES = ["journalist", "contributor", "editor"];

interface Props {
  username: string;  // already stripped of '@'
}

export default function JournalistProfile({ username }: Props) {
  const { language } = useTheme();
  const navigate = useNavigate();
  const isNo = language === "no";

  const [profile, setProfile] = useState<JournalistProfile | null>(null);
  const [hasPublicRole, setHasPublicRole] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [liveStream, setLiveStream] = useState<LiveStreamRow | null>(null);
  const [tab, setTab] = useState<Tab>("saker");

  const t = isNo
    ? {
        notFound: "Brukeren finnes ikke",
        backToTeam: "Se redaksjonen",
        saker: "Saker",
        bidrag: "Bidrag",
        om: "Om",
        noArticles: "Ingen publiserte saker ennå",
        contact: "Send e-post",
        about: "Om",
      }
    : {
        notFound: "User not found",
        backToTeam: "View the editorial team",
        saker: "Stories",
        bidrag: "Activity",
        om: "About",
        noArticles: "No published stories yet",
        contact: "Send email",
        about: "About",
      };

  // Load profile by username (case-insensitive)
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, bio, title, beat, contact_email, social_urls, editorial_region")
        .ilike("username", username)
        .maybeSingle();
      if (!mounted) return;
      if (!p) {
        setProfile(null);
        setHasPublicRole(false);
        setLoading(false);
        return;
      }
      const profileRow = p as any as JournalistProfile;
      setProfile(profileRow);

      // Verify the user actually has a public-facing role; reject otherwise
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profileRow.user_id);
      const pub = (roles || []).some((r: any) => PUBLIC_ROLES.includes(r.role));
      if (!mounted) return;
      setHasPublicRole(pub);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [username]);

  // Load articles when Saker-tab is active (or just preload)
  useEffect(() => {
    if (!profile || !hasPublicRole) return;
    let mounted = true;
    setLoadingArticles(true);
    (async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, excerpt, category, published_at, image_url, type")
        .eq("created_by", profile.user_id)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(50);
      if (!mounted) return;
      setArticles((data as ArticleRow[]) || []);
      setLoadingArticles(false);
    })();
    return () => { mounted = false; };
  }, [profile, hasPublicRole]);

  // Watch for live streams from this user. Realtime-subscribe so a
  // visitor sees the live banner appear as soon as the stream goes live.
  useEffect(() => {
    if (!profile || !hasPublicRole) return;
    let mounted = true;

    const refresh = async () => {
      const { data } = await supabase
        .from("live_streams_public")
        .select("id, user_id, status, title, playback_id, started_at")
        .eq("user_id", profile.user_id)
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      setLiveStream((data as LiveStreamRow) || null);
    };

    refresh();

    const channel = supabase
      .channel(`live-stream-${profile.user_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_streams", filter: `user_id=eq.${profile.user_id}` },
        () => refresh()
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [profile, hasPublicRole]);

  // Load contributions (group_messages in public groups)
  useEffect(() => {
    if (!profile || !hasPublicRole || tab !== "bidrag") return;
    let mounted = true;
    setLoadingContributions(true);
    (async () => {
      // First fetch the messages
      const { data: msgs } = await supabase
        .from("group_messages")
        .select("id, group_id, content, created_at, visibility")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(50);
      const rows = (msgs as any[]) || [];
      // Filter for members-visibility (or null) - we still need to verify
      // the group is public; do a second query for the group ids
      const candidate = rows.filter((r) => !r.visibility || r.visibility === "members");
      const groupIds = Array.from(new Set(candidate.map((r) => r.group_id)));
      if (groupIds.length === 0) {
        if (mounted) {
          setContributions([]);
          setLoadingContributions(false);
        }
        return;
      }
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, visibility")
        .in("id", groupIds);
      const publicGroupMap = new Map<string, string>();
      for (const g of (groups as any[]) || []) {
        if (g.visibility === "public") publicGroupMap.set(g.id, g.name);
      }
      const visible: ContributionRow[] = candidate
        .filter((r) => publicGroupMap.has(r.group_id))
        .map((r) => ({
          id: r.id,
          group_id: r.group_id,
          group_name: publicGroupMap.get(r.group_id) || "",
          content: r.content,
          created_at: r.created_at,
        }));
      if (mounted) {
        setContributions(visible);
        setLoadingContributions(false);
      }
    })();
    return () => { mounted = false; };
  }, [profile, hasPublicRole, tab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!profile || !hasPublicRole) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
          <UserIcon className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h1 className="font-headline text-2xl font-bold text-headline">{t.notFound}</h1>
          <button
            onClick={() => navigate("/team")}
            className="px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 shadow-soft"
          >
            {t.backToTeam}
          </button>
        </div>
      </div>
    );
  }

  const social = profile.social_urls || {};
  const socialEntries = (Object.entries(social) as [string, string][])
    .filter(([_, v]) => typeof v === "string" && v.trim().length > 0);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isNo ? "nb-NO" : "en-US", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Live banner (only when this user is currently streaming) */}
        {liveStream && (
          <div className="mb-6">
            <LiveStreamPlayer playbackId={liveStream.playback_id} title={liveStream.title} />
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name || ""} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-12 h-12 text-accent" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-headline text-3xl font-bold text-headline">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-0.5">
              @{profile.username}
              {profile.title && <> · <span className="text-foreground">{profile.title}</span></>}
            </p>
            {profile.beat && (
              <p className="text-sm text-muted-foreground font-body mt-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {profile.beat}
              </p>
            )}
            {profile.bio && (
              <p className="text-sm font-body text-foreground mt-3 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Contact + Social */}
            {(profile.contact_email || socialEntries.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.contact_email && (
                  <a
                    href={`mailto:${profile.contact_email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground rounded-full text-xs font-subhead font-medium hover:bg-secondary/80"
                  >
                    <Mail className="w-3.5 h-3.5" /> {t.contact}
                  </a>
                )}
                {socialEntries.map(([key, value]) => (
                  <a
                    key={key}
                    href={key === "signal" ? `sgnl://signal.me/#p/${encodeURIComponent(value)}` : (value.startsWith("http") ? value : `https://${value}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground rounded-full text-xs font-subhead font-medium hover:bg-secondary/80"
                  >
                    <Globe2 className="w-3.5 h-3.5" />
                    {key === "x" ? "X" : key.charAt(0).toUpperCase() + key.slice(1)}
                  </a>
                ))}
              </div>
            )}

            <div className="mt-4">
              <FollowUserButton followeeId={profile.user_id} displayName={profile.display_name} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          {([
            ["saker", t.saker, <FileText className="w-4 h-4" key="i" />],
            ["bidrag", t.bidrag, <MessageSquare className="w-4 h-4" key="i" />],
            ["om", t.om, <UserIcon className="w-4 h-4" key="i" />],
          ] as [Tab, string, JSX.Element][]).map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-subhead text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "saker" && (
          <div className="space-y-3">
            {loadingArticles ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-body">{t.noArticles}</p>
              </div>
            ) : (
              articles.map((a) => (
                <Link
                  key={a.id}
                  to={`/article/${a.id}`}
                  className="block bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-colors"
                >
                  {a.category && (
                    <span className="inline-block text-[10px] text-accent font-subhead uppercase tracking-wider mb-1">
                      {a.category}
                    </span>
                  )}
                  <h3 className="font-headline text-lg font-semibold text-headline">{a.title}</h3>
                  {a.excerpt && (
                    <p className="text-sm text-muted-foreground font-body mt-1 line-clamp-2">{a.excerpt}</p>
                  )}
                  {a.published_at && (
                    <p className="text-xs text-muted-foreground font-body mt-2">{formatDate(a.published_at)}</p>
                  )}
                </Link>
              ))
            )}
          </div>
        )}

        {tab === "bidrag" && (
          <div className="space-y-3">
            {loadingContributions ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : contributions.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-body">
                  {isNo ? "Ingen offentlige bidrag ennå" : "No public activity yet"}
                </p>
              </div>
            ) : (
              contributions.map((c) => (
                <Link
                  key={c.id}
                  to={`/grupper/${c.group_id}`}
                  className="block bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-subhead font-medium text-muted-foreground">
                      {isNo ? "i" : "in"} {c.group_name}
                    </span>
                    <span className="text-xs text-muted-foreground/70">·</span>
                    <span className="text-xs text-muted-foreground font-body">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm font-body text-foreground whitespace-pre-wrap line-clamp-4">{c.content}</p>
                </Link>
              ))
            )}
          </div>
        )}

        {tab === "om" && (
          <div className="bg-card border border-border rounded-xl p-6">
            {profile.bio ? (
              <p className="text-foreground font-body leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            ) : (
              <p className="text-muted-foreground font-body">{isNo ? "Ingen beskrivelse" : "No description"}</p>
            )}
            {profile.contact_email && (
              <p className="text-sm text-muted-foreground font-body mt-4">
                <a href={`mailto:${profile.contact_email}`} className="inline-flex items-center gap-1.5 text-accent hover:underline">
                  <Mail className="w-3.5 h-3.5" />
                  {profile.contact_email}
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
