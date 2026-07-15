import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Building2, FileText, TrendingUp, AlertTriangle, X, User, MessageSquare, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

type NotificationType =
  | "article_mention"
  | "financials_new"
  | "roles_changed"
  | "status_changed"
  | "user_article"
  | "user_group_message"
  | "user_stream_start";

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  orgnr: string | null;
  company_name: string | null;
  payload: any;
  read_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 10;

function relativeTime(iso: string, isNo: boolean): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.round((now - then) / 1000));
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return isNo ? "nå" : "now";
  if (min < 60) return isNo ? `${min} min siden` : `${min}m ago`;
  if (hr < 24) return isNo ? `${hr} t siden` : `${hr}h ago`;
  if (day < 7) return isNo ? `${day} dager siden` : `${day}d ago`;
  return new Date(iso).toLocaleDateString(isNo ? "nb-NO" : "en-US", { day: "numeric", month: "short" });
}

function NotificationLine({ n, isNo, onClick }: { n: NotificationRow; isNo: boolean; onClick: () => void }) {
  const company = n.company_name || n.orgnr;
  let icon = <Bell className="w-4 h-4 text-muted-foreground" />;
  let title = "";
  let body = "";

  switch (n.type) {
    case "article_mention":
      icon = <FileText className="w-4 h-4 text-accent" />;
      title = isNo ? `${company} omtalt` : `${company} mentioned`;
      body = n.payload?.title || "";
      break;
    case "financials_new":
      icon = <TrendingUp className="w-4 h-4 text-primary" />;
      title = isNo ? `Nytt regnskap fra ${company}` : `New financials from ${company}`;
      body = isNo
        ? `Regnskap for ${n.payload?.year} er publisert`
        : `${n.payload?.year} accounts published`;
      break;
    case "roles_changed":
      icon = <Building2 className="w-4 h-4 text-primary" />;
      title = isNo ? `Ledelse endret i ${company}` : `Roles changed at ${company}`;
      {
        const added = n.payload?.added?.length || 0;
        const removed = n.payload?.removed?.length || 0;
        body = isNo
          ? `${added} ny${added === 1 ? "" : "e"}, ${removed} fjernet`
          : `${added} added, ${removed} removed`;
      }
      break;
    case "status_changed":
      icon = <AlertTriangle className="w-4 h-4 text-destructive" />;
      title = isNo ? `Statusendring: ${company}` : `Status change: ${company}`;
      body = n.payload?.konkurs
        ? (isNo ? "Selskapet er meldt konkurs" : "Bankruptcy filed")
        : n.payload?.under_avvikling
          ? (isNo ? "Under avvikling" : "Under liquidation")
          : (isNo ? "Status endret" : "Status updated");
      break;
    case "user_article": {
      const author = n.payload?.by_display_name || (isNo ? "En du følger" : "Someone you follow");
      icon = <User className="w-4 h-4 text-accent" />;
      title = isNo ? `${author} publiserte en sak` : `${author} published a story`;
      body = n.payload?.title || "";
      break;
    }
    case "user_group_message": {
      const author = n.payload?.by_display_name || (isNo ? "En du følger" : "Someone you follow");
      icon = <MessageSquare className="w-4 h-4 text-primary" />;
      title = isNo ? `${author} skrev i ${n.payload?.group_name || "en gruppe"}` : `${author} posted in ${n.payload?.group_name || "a group"}`;
      body = n.payload?.snippet || "";
      break;
    }
    case "user_stream_start": {
      const author = n.payload?.by_display_name || (isNo ? "En du følger" : "Someone you follow");
      icon = <Radio className="w-4 h-4 text-destructive" />;
      title = isNo ? `${author} er LIVE nå` : `${author} is LIVE now`;
      body = n.payload?.title || "";
      break;
    }
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors ${n.read_at ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-subhead text-sm font-semibold text-headline truncate">{title}</p>
          {body && <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-0.5">{body}</p>}
          <p className="text-[0.625rem] text-muted-foreground font-body mt-1">{relativeTime(n.created_at, isNo)}</p>
        </div>
        {!n.read_at && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />}
      </div>
    </button>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { language } = useTheme();
  const isNo = language === "no";
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Auth
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUserId(data.session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) setUserId(s?.user?.id ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Unread count
  const refreshCount = async (uid: string) => {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .is("read_at", null);
    setUnreadCount(count || 0);
  };

  // Latest items
  const refreshItems = async (uid: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    setItems((data as NotificationRow[]) || []);
  };

  // Initial load + Realtime subscription
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setItems([]);
      return;
    }
    refreshCount(userId);

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => { refreshCount(userId); if (open) refreshItems(userId); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => { refreshCount(userId); if (open) refreshItems(userId); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Load dropdown items when opening
  useEffect(() => {
    if (open && userId) refreshItems(userId);
  }, [open, userId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleClickItem = async (n: NotificationRow) => {
    // Mark as read (idempotent)
    if (!n.read_at && userId) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    setOpen(false);
    // Navigate to most relevant context
    if ((n.type === "article_mention" || n.type === "user_article") && n.payload?.article_id) {
      navigate(`/article/${n.payload.article_id}`);
    } else if (n.type === "user_group_message" && n.payload?.group_id) {
      navigate(`/grupper/${n.payload.group_id}`);
    } else if (n.type === "user_stream_start" && n.payload?.by_user_id) {
      // Resolve username from by_user_id; the simplest approach is to
      // fetch the profile lazily, but to keep the click instantaneous we
      // optimistically use any username embedded in the payload.
      const uname = n.payload?.by_username;
      if (uname) {
        navigate(`/@${uname}`);
      } else {
        // Fallback: open notifications page
        navigate("/varsler");
      }
    } else {
      navigate("/tall");
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    refreshCount(userId);
    refreshItems(userId);
  };

  if (!userId) return null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 hover:bg-secondary rounded-full transition-colors"
        title={isNo ? "Varsler" : "Notifications"}
        aria-label={isNo ? "Varsler" : "Notifications"}
      >
        <Bell className="w-4 h-4 text-foreground/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-accent text-accent-foreground text-[0.625rem] font-semibold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-elevated z-50 overflow-hidden animate-scale-in">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-headline text-base font-semibold text-headline">
              {isNo ? "Varsler" : "Notifications"}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-subhead text-muted-foreground hover:text-foreground px-2 py-1 rounded"
                >
                  {isNo ? "Marker alle som lest" : "Mark all read"}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-body">
                  {isNo ? "Ingen varsler ennå" : "No notifications yet"}
                </p>
                <p className="text-xs text-muted-foreground/70 font-body mt-1">
                  {isNo ? "Følg selskaper på /tall for å få varsler her" : "Follow companies in /tall to get updates"}
                </p>
              </div>
            ) : (
              items.map((n) => (
                <NotificationLine key={n.id} n={n} isNo={isNo} onClick={() => handleClickItem(n)} />
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-border bg-surface-subtle">
            <button
              onClick={() => { setOpen(false); navigate("/varsler"); }}
              className="w-full text-xs font-subhead text-foreground hover:text-accent py-1.5 text-center"
            >
              {isNo ? "Se alle varsler →" : "View all notifications →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
