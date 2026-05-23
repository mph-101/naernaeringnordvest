import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Building2, FileText, TrendingUp, AlertTriangle, Loader2, LogIn, User, MessageSquare, Radio } from "lucide-react";
import { Header } from "@/components/Header";
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

const PAGE_SIZE = 30;

const FILTERS: { key: NotificationType | "all"; labelNo: string; labelEn: string }[] = [
  { key: "all", labelNo: "Alle", labelEn: "All" },
  { key: "article_mention", labelNo: "Artikler", labelEn: "Articles" },
  { key: "financials_new", labelNo: "Regnskap", labelEn: "Financials" },
  { key: "roles_changed", labelNo: "Ledelse", labelEn: "Roles" },
  { key: "status_changed", labelNo: "Status", labelEn: "Status" },
  { key: "user_article", labelNo: "Fra følger", labelEn: "From people" },
  { key: "user_group_message", labelNo: "Gruppe-innlegg", labelEn: "Group posts" },
  { key: "user_stream_start", labelNo: "Live", labelEn: "Live" },
];

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
  return new Date(iso).toLocaleString(isNo ? "nb-NO" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function NotificationCard({ n, isNo, onClick }: { n: NotificationRow; isNo: boolean; onClick: () => void }) {
  const company = n.company_name || n.orgnr;
  let icon = <Bell className="w-5 h-5 text-muted-foreground" />;
  let title = "";
  let body = "";

  switch (n.type) {
    case "article_mention":
      icon = <FileText className="w-5 h-5 text-accent" />;
      title = isNo ? `${company} omtalt i ny artikkel` : `${company} mentioned in new article`;
      body = n.payload?.title || "";
      break;
    case "financials_new":
      icon = <TrendingUp className="w-5 h-5 text-primary" />;
      title = isNo ? `Nytt regnskap fra ${company}` : `New financials from ${company}`;
      {
        const oms = n.payload?.omsetning;
        const omsFmt = typeof oms === "number"
          ? `${(oms / 1_000_000).toFixed(1)} MNOK`
          : "";
        body = isNo
          ? `${n.payload?.year}: ${omsFmt ? `Omsetning ${omsFmt}` : "Regnskap publisert"}`
          : `${n.payload?.year}: ${omsFmt ? `Revenue ${omsFmt}` : "Accounts published"}`;
      }
      break;
    case "roles_changed":
      icon = <Building2 className="w-5 h-5 text-primary" />;
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
      icon = <AlertTriangle className="w-5 h-5 text-destructive" />;
      title = isNo ? `Statusendring: ${company}` : `Status change: ${company}`;
      body = n.payload?.konkurs
        ? (isNo ? `Selskapet er meldt konkurs${n.payload?.konkursdato ? ` (${n.payload.konkursdato})` : ""}` : "Bankruptcy filed")
        : n.payload?.under_avvikling
          ? (isNo ? "Under avvikling" : "Under liquidation")
          : (isNo ? "Status endret" : "Status updated");
      break;
    case "user_article": {
      const author = n.payload?.by_display_name || (isNo ? "En du følger" : "Someone you follow");
      icon = <User className="w-5 h-5 text-accent" />;
      title = isNo ? `${author} publiserte en sak` : `${author} published a story`;
      body = n.payload?.title || "";
      break;
    }
    case "user_group_message": {
      const author = n.payload?.by_display_name || (isNo ? "En du følger" : "Someone you follow");
      icon = <MessageSquare className="w-5 h-5 text-primary" />;
      title = isNo
        ? `${author} skrev i ${n.payload?.group_name || "en gruppe"}`
        : `${author} posted in ${n.payload?.group_name || "a group"}`;
      body = n.payload?.snippet || "";
      break;
    }
    case "user_stream_start": {
      const author = n.payload?.by_display_name || (isNo ? "En du følger" : "Someone you follow");
      icon = <Radio className="w-5 h-5 text-destructive" />;
      title = isNo ? `${author} er LIVE nå` : `${author} is LIVE now`;
      body = n.payload?.title || "";
      break;
    }
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-card border border-border rounded-2xl p-5 hover:border-accent/30 transition-colors ${
        n.read_at ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-headline text-base font-semibold text-headline">{title}</h3>
            {!n.read_at && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />}
          </div>
          {body && <p className="text-sm text-muted-foreground font-body mt-1">{body}</p>}
          <p className="text-xs text-muted-foreground font-body mt-2">{relativeTime(n.created_at, isNo)}</p>
        </div>
      </div>
    </button>
  );
}

export default function Varsler() {
  const navigate = useNavigate();
  const { language } = useTheme();
  const isNo = language === "no";
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadPage = async (uid: string, p: number, filterValue: NotificationType | "all") => {
    setLoading(true);
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);

    if (filterValue !== "all") query = query.eq("type", filterValue);

    const { data } = await query;
    const rows = (data as NotificationRow[]) || [];
    setItems((prev) => (p === 0 ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  };

  // Initial + on-filter-change
  useEffect(() => {
    if (!userId) return;
    setPage(0);
    loadPage(userId, 0, filter);
  }, [userId, filter]);

  // Realtime: prepend new arrivals
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`varsler-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as NotificationRow;
          if (filter !== "all" && row.type !== filter) return;
          setItems((prev) => [row, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, filter]);

  const loadMore = () => {
    if (!userId || loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    loadPage(userId, next, filter);
  };

  const handleClickItem = async (n: NotificationRow) => {
    if (!n.read_at && userId) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      setItems((prev) => prev.map((r) => (r.id === n.id ? { ...r, read_at: new Date().toISOString() } : r)));
    }
    if ((n.type === "article_mention" || n.type === "user_article") && n.payload?.article_id) {
      navigate(`/article/${n.payload.article_id}`);
    } else if (n.type === "user_group_message" && n.payload?.group_id) {
      navigate(`/grupper/${n.payload.group_id}`);
    } else if (n.type === "user_stream_start" && n.payload?.by_username) {
      navigate(`/@${n.payload.by_username}`);
    } else {
      navigate("/tall");
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
    setItems((prev) => prev.map((r) => (r.read_at ? r : { ...r, read_at: now })));
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
          <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h1 className="font-headline text-2xl font-bold text-headline">
            {isNo ? "Logg inn for å se varsler" : "Log in to view notifications"}
          </h1>
          <p className="text-muted-foreground font-body">
            {isNo
              ? "Følg selskaper og få varsler ved artikkel-omtaler, regnskap og endringer."
              : "Follow companies to get notified about mentions, financials and changes."}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 shadow-soft"
          >
            <LogIn className="w-4 h-4" />
            {isNo ? "Logg inn" : "Log in"}
          </Link>
        </div>
      </div>
    );
  }

  const hasUnread = items.some((r) => !r.read_at);

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="font-headline text-2xl md:text-3xl font-bold text-headline">
              {isNo ? "Varsler" : "Notifications"}
            </h1>
            <p className="text-muted-foreground font-body text-sm mt-1">
              {isNo ? "Endringer i selskaper du følger" : "Updates from companies you follow"}
            </p>
          </div>
          {hasUnread && (
            <button
              onClick={markAllAsRead}
              className="text-sm font-subhead text-muted-foreground hover:text-foreground px-3 py-1.5"
            >
              {isNo ? "Marker alle som lest" : "Mark all read"}
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-subhead font-medium transition-colors ${
                filter === f.key
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              {isNo ? f.labelNo : f.labelEn}
            </button>
          ))}
        </div>

        {/* List */}
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground font-body">
              {isNo ? "Ingen varsler ennå" : "No notifications yet"}
            </p>
            <p className="text-sm text-muted-foreground/70 font-body">
              {isNo
                ? "Følg selskaper på /tall for å få varsler her."
                : "Follow companies in /tall to get updates here."}
            </p>
            <Link
              to="/tall"
              className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90"
            >
              {isNo ? "Utforsk selskaper" : "Explore companies"}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <NotificationCard key={n.id} n={n} isNo={isNo} onClick={() => handleClickItem(n)} />
            ))}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 bg-card border border-border rounded-xl font-subhead text-sm text-foreground hover:bg-secondary disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : (isNo ? "Last flere" : "Load more")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
