import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Users, Newspaper, MessageCircle, Shield, Lock } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

interface SharedNote {
  id: string;
  group_id: string;
  group_name: string;
  content: string;
  article_id: string | null;
  article_title: string | null;
  created_at: string;
  visibility: string;
}

const NOTE_PREFIXES = ["📝 Mitt notat om", "📝 My note on"];

const MineDelteNotater = () => {
  const navigate = useNavigate();
  const { language } = useTheme();
  const isNo = language === "no";
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<SharedNote[]>([]);

  const t = isNo
    ? {
        title: "Mine delte notater",
        intro: "Notater du har delt i grupper – åpne for å se innlegget i samtalen.",
        empty: "Du har ikke delt noen notater ennå.",
        back: "Tilbake",
        openInGroup: "Åpne i gruppe",
        readArticle: "Les artikkelen",
        loginRequired: "Logg inn for å se dine delte notater.",
        visMembers: "Alle medlemmer",
        visAdmins: "Kun admins",
        visAuthor: "Kun meg",
      }
    : {
        title: "My shared notes",
        intro: "Notes you have shared to groups – open to view the post in the conversation.",
        empty: "You have not shared any notes yet.",
        back: "Back",
        openInGroup: "Open in group",
        readArticle: "Read article",
        loginRequired: "Log in to see your shared notes.",
        visMembers: "All members",
        visAdmins: "Admins only",
        visAuthor: "Only me",
      };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data: msgs } = await supabase
        .from("group_messages")
        .select("id, group_id, content, article_id, created_at, visibility")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);

      const filtered = (msgs ?? []).filter((m: any) =>
        NOTE_PREFIXES.some((p) => typeof m.content === "string" && m.content.startsWith(p)),
      );

      const groupIds = [...new Set(filtered.map((m: any) => m.group_id))];
      const articleIds = [...new Set(filtered.map((m: any) => m.article_id).filter(Boolean))] as string[];

      const [{ data: groups }, { data: articles }] = await Promise.all([
        groupIds.length
          ? supabase.from("groups").select("id, name").in("id", groupIds)
          : Promise.resolve({ data: [] as any[] }),
        articleIds.length
          ? supabase.from("articles").select("id, title").in("id", articleIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const groupMap = new Map((groups ?? []).map((g: any) => [g.id, g.name]));
      const articleMap = new Map((articles ?? []).map((a: any) => [a.id, a.title]));

      setNotes(
        filtered.map((m: any) => ({
          id: m.id,
          group_id: m.group_id,
          group_name: groupMap.get(m.group_id) ?? (isNo ? "Gruppe" : "Group"),
          content: m.content,
          article_id: m.article_id,
          article_title: m.article_id ? articleMap.get(m.article_id) ?? null : null,
          created_at: m.created_at,
          visibility: m.visibility ?? "members",
        })),
      );
      setLoading(false);
    })();
  }, [userId, isNo]);

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> {t.back}
        </button>

        <h1 className="font-headline text-3xl font-bold text-headline mb-2">{t.title}</h1>
        <p className="text-muted-foreground font-body mb-8">{t.intro}</p>

        {!userId && !loading && (
          <p className="text-muted-foreground font-body py-12 text-center">{t.loginRequired}</p>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && userId && notes.length === 0 && (
          <p className="text-muted-foreground font-body py-12 text-center">{t.empty}</p>
        )}

        <div className="space-y-4">
          {notes.map((n) => {
            const vis = n.visibility === "admins"
              ? { label: t.visAdmins, Icon: Shield, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" }
              : n.visibility === "author"
              ? { label: t.visAuthor, Icon: Lock, cls: "bg-muted text-muted-foreground" }
              : { label: t.visMembers, Icon: Users, cls: "bg-accent/10 text-accent" };
            const VisIcon = vis.Icon;
            return (
            <article
              key={n.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-soft"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-body mb-2">
                <Users className="w-3.5 h-3.5" />
                <Link to={`/grupper/${n.group_id}`} className="hover:text-foreground transition-colors">
                  {n.group_name}
                </Link>
                <span>·</span>
                <span>
                  {new Date(n.created_at).toLocaleString(isNo ? "nb-NO" : "en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-subhead font-medium ${vis.cls}`}>
                  <VisIcon className="w-3 h-3" /> {vis.label}
                </span>
              </div>
              <pre className="whitespace-pre-wrap font-body text-foreground leading-relaxed text-sm">
                {n.content}
              </pre>
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
                <Link
                  to={`/grupper/${n.group_id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-subhead font-semibold text-accent hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> {t.openInGroup}
                </Link>
                {n.article_id && (
                  <Link
                    to={`/article/${n.article_id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-subhead font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <Newspaper className="w-3.5 h-3.5" />
                    {n.article_title ? n.article_title : t.readArticle}
                  </Link>
                )}
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MineDelteNotater;