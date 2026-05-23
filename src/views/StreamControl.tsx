import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Radio, Plus, Trash2, Copy, Check, Loader2, ArrowLeft, AlertCircle, Eye, EyeOff,
} from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface Stream {
  id: string;
  title: string | null;
  description: string | null;
  status: "idle" | "live" | "ended" | "disabled";
  rtmps_url: string | null;
  stream_key: string | null;
  playback_id: string;
  provider_input_uid: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

const PUBLIC_ROLES = ["journalist", "contributor", "editor"];

export default function StreamControl() {
  const { language } = useTheme();
  const navigate = useNavigate();
  const isNo = language === "no";

  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasPublicRole, setHasPublicRole] = useState<boolean>(false);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const t = isNo
    ? {
        title: "Live-stream",
        subtitle: "Opprett og administrer streams. RTMPS-URL og stream-key er hemmelige — del aldri.",
        back: "Tilbake til profil",
        createTitle: "Opprett ny stream",
        titlePlaceholder: "Tittel (vises offentlig)",
        descPlaceholder: "Beskrivelse (valgfri)",
        create: "Opprett",
        loading: "Laster...",
        empty: "Du har ingen streams ennå",
        live: "LIVE",
        idle: "Klar",
        ended: "Avsluttet",
        rtmpsUrl: "RTMPS-URL",
        streamKey: "Stream-key",
        playbackUrl: "Playback URL",
        showKey: "Vis",
        hideKey: "Skjul",
        copy: "Kopier",
        copied: "Kopiert!",
        delete: "Slett",
        confirmDelete: "Slette denne streamen permanent?",
        howTo: "Bruk OBS Studio, Streamlabs eller en annen RTMPS-app. Pek den til RTMPS-URLen over med stream-key som auth.",
        cloudflareNotConfigured: "Cloudflare Stream er ikke konfigurert. Be administrator om å sette CLOUDFLARE_ACCOUNT_ID og CLOUDFLARE_STREAM_API_TOKEN som secrets.",
        notAuthorized: "Krever journalist-rolle",
        login: "Logg inn",
      }
    : {
        title: "Live stream",
        subtitle: "Create and manage your streams. RTMPS URL and stream key are secrets — never share them.",
        back: "Back to profile",
        createTitle: "New stream",
        titlePlaceholder: "Title (shown publicly)",
        descPlaceholder: "Description (optional)",
        create: "Create",
        loading: "Loading...",
        empty: "You have no streams yet",
        live: "LIVE",
        idle: "Ready",
        ended: "Ended",
        rtmpsUrl: "RTMPS URL",
        streamKey: "Stream key",
        playbackUrl: "Playback URL",
        showKey: "Show",
        hideKey: "Hide",
        copy: "Copy",
        copied: "Copied!",
        delete: "Delete",
        confirmDelete: "Delete this stream permanently?",
        howTo: "Use OBS Studio, Streamlabs or any RTMPS app. Point it at the RTMPS URL above with the stream key as auth.",
        cloudflareNotConfigured: "Cloudflare Stream is not configured. Ask an admin to set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN as secrets.",
        notAuthorized: "Requires journalist role",
        login: "Log in",
      };

  // Auth + role check
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      if (uid) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        const pub = (roles || []).some((r: any) => PUBLIC_ROLES.includes(r.role));
        if (mounted) setHasPublicRole(pub);
      }
      if (mounted) setAuthChecked(true);
    })();
    return () => { mounted = false; };
  }, []);

  const loadStreams = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("cloudflare-stream", {
      body: {},
      headers: undefined,
      method: "GET",
    } as any);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setStreams((data?.streams as Stream[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userId && hasPublicRole) loadStreams();
  }, [userId, hasPublicRole]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-stream", {
        body: { title: title.trim(), description: description.trim() || null },
      });
      if (error) throw error;
      if (data?.stream) {
        setStreams((prev) => [data.stream, ...prev]);
        setTitle("");
        setDescription("");
        toast.success(isNo ? "Stream opprettet" : "Stream created");
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (stream: Stream) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      const { error } = await supabase.functions.invoke(
        `cloudflare-stream?action=delete&id=${encodeURIComponent(stream.id)}`,
        { body: {}, method: "DELETE" as any } as any
      );
      if (error) throw error;
      setStreams((prev) => prev.filter((s) => s.id !== stream.id));
      toast.success(isNo ? "Slettet" : "Deleted");
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  };

  const copyToClipboard = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
          <Radio className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground font-body">{t.notAuthorized}</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-accent text-accent-foreground rounded-full font-subhead font-semibold">
            {t.login}
          </Link>
        </div>
      </div>
    );
  }

  if (!hasPublicRole) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive/60 mx-auto" />
          <p className="text-muted-foreground font-body">{t.notAuthorized}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button onClick={() => navigate("/profil")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> {t.back}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Radio className="w-6 h-6 text-accent" />
          <h1 className="font-headline text-3xl font-bold text-headline">{t.title}</h1>
        </div>
        <p className="text-muted-foreground font-body text-sm mb-8">{t.subtitle}</p>

        {/* Create form */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <h2 className="font-headline text-lg font-semibold text-headline mb-4">{t.createTitle}</h2>
          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePlaceholder}
              className="input"
              maxLength={200}
              disabled={creating}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descPlaceholder}
              rows={2}
              className="input resize-none"
              maxLength={2000}
              disabled={creating}
            />
            <button
              onClick={handleCreate}
              disabled={!title.trim() || creating}
              className="px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t.create}
            </button>
          </div>
        </div>

        {/* Stream list */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : streams.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-body">{t.empty}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {streams.map((s) => (
              <div key={s.id} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline text-lg font-semibold text-headline">{s.title || "Untitled"}</h3>
                    {s.description && (
                      <p className="text-sm text-muted-foreground font-body mt-1">{s.description}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-subhead font-semibold ${
                    s.status === "live"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {s.status === "live" && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />}
                    {s.status === "live" ? t.live : s.status === "idle" ? t.idle : t.ended}
                  </span>
                </div>

                {/* Stream credentials */}
                <div className="space-y-2 bg-surface-subtle rounded-xl p-4 mt-3">
                  <div>
                    <p className="text-xs font-subhead font-medium text-muted-foreground mb-1">{t.rtmpsUrl}</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={s.rtmps_url || ""}
                        className="input text-xs"
                      />
                      <button onClick={() => copyToClipboard(s.rtmps_url || "", `${s.id}-rtmps`)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg" title={t.copy}>
                        {copied === `${s.id}-rtmps` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-subhead font-medium text-muted-foreground mb-1">{t.streamKey}</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        type={revealedKeys[s.id] ? "text" : "password"}
                        value={s.stream_key || ""}
                        className="input text-xs"
                      />
                      <button onClick={() => setRevealedKeys((r) => ({ ...r, [s.id]: !r[s.id] }))} className="p-2 text-muted-foreground hover:text-foreground rounded-lg" title={revealedKeys[s.id] ? t.hideKey : t.showKey}>
                        {revealedKeys[s.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => copyToClipboard(s.stream_key || "", `${s.id}-key`)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg" title={t.copy}>
                        {copied === `${s.id}-key` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-body mt-2">{t.howTo}</p>
                </div>

                <button
                  onClick={() => handleDelete(s)}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-full px-3 py-1.5 font-subhead font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t.delete}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
