import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Users, 
  BookOpen,
  Tag as TagIcon,
  Sparkles,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  BarChart3,
  UserCog,
  ImageIcon
} from "lucide-react";
import { ArticlesList } from "./ArticlesList";
import { ArticleEditor } from "./ArticleEditor";
import { TipsList } from "./TipsList";
import { JobChangeReview } from "./JobChangeReview";
import { FactBoxesManager } from "./FactBoxesManager";
import { TagsManager } from "./TagsManager";
import { SourcesManager } from "./SourcesManager";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { UsersManager } from "./UsersManager";
import { MediaArchive } from "./MediaArchive";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AdminDashboardProps {
  session: any;
  onLogout: () => void;
}

type View = "dashboard" | "articles" | "editor" | "tips" | "job-changes" | "fact-boxes" | "tags" | "sources" | "analytics" | "users" | "media";

export const AdminDashboard = ({ session, onLogout }: AdminDashboardProps) => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [view, setView] = useState<View>("dashboard");
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleEditArticle = (id: string | null) => {
    setEditingArticleId(id);
    setView("editor");
  };

  const handleBackToArticles = () => {
    setEditingArticleId(null);
    setView("articles");
  };

  const navItems = [
    { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics" as View, label: "Analyse", icon: BarChart3 },
    { id: "articles" as View, label: "Artikler", icon: FileText },
    { id: "sources" as View, label: "Kilder & AI", icon: Sparkles },
    { id: "fact-boxes" as View, label: "Faktabokser", icon: BookOpen },
    { id: "media" as View, label: "Mediearkiv", icon: ImageIcon },
    { id: "tags" as View, label: "Tags", icon: TagIcon },
    { id: "tips" as View, label: "Tips", icon: MessageSquare },
    { id: "job-changes" as View, label: "Jobbytter", icon: Users },
    ...(isAdmin ? [{ id: "users" as View, label: "Brukere", icon: UserCog }] : []),
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-soft md:hidden"
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Tilbake
          </Link>
          <h1 className="font-headline text-xl font-semibold text-headline">
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            {session?.user?.email}
          </p>
        </div>

        <nav className="px-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setIsSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 font-body text-left transition-colors
                ${view === item.id || (item.id === "articles" && view === "editor")
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-body"
          >
            <LogOut className="w-5 h-5" />
            Logg ut
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 p-6 md:p-8 md:ml-0 ml-0 pt-16 md:pt-8">
        {view === "dashboard" && (
          <div>
            <h2 className="font-headline text-2xl font-semibold text-headline mb-6">
              Dashboard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DashboardCard
                title="Lesere & brukere"
                description="Sidevisninger, lesetid, trafikkilder og konvertering"
                icon={BarChart3}
                onClick={() => setView("analytics")}
              />
              <DashboardCard
                title="Artikler"
                description="Administrer artikler og innhold"
                icon={FileText}
                onClick={() => setView("articles")}
              />
              <DashboardCard
                title="Kilder & AI"
                description="Last opp kilder og generer artikkelutkast"
                icon={Sparkles}
                onClick={() => setView("sources")}
              />
              <DashboardCard
                title="Faktabokser"
                description="Gjenbrukbart faktaboks-bibliotek"
                icon={BookOpen}
                onClick={() => setView("fact-boxes")}
              />
              <MediaArchiveCard onClick={() => setView("media")} />
              <DashboardCard
                title="Tags"
                description="Nøkkelord, redigering og sammenslåing"
                icon={TagIcon}
                onClick={() => setView("tags")}
              />
              <DashboardCard
                title="Tips"
                description="Se innkomne tips fra lesere"
                icon={MessageSquare}
                onClick={() => setView("tips")}
              />
              <DashboardCard
                title="Jobbytter"
                description="Gjennomgå og publisér jobbytter"
                icon={Users}
                onClick={() => setView("job-changes")}
              />
              {isAdmin && (
                <DashboardCard
                  title="Brukere"
                  description="Administrer roller og tilganger"
                  icon={UserCog}
                  onClick={() => setView("users")}
                />
              )}
            </div>
          </div>
        )}

        {view === "users" && isAdmin && (
          <UsersManager />
        )}

        {view === "analytics" && (
          <AnalyticsDashboard />
        )}

        {view === "articles" && (
          <ArticlesList onEdit={handleEditArticle} />
        )}

        {view === "editor" && (
          <ArticleEditor 
            articleId={editingArticleId} 
            onBack={handleBackToArticles} 
          />
        )}

        {view === "tips" && (
          <TipsList />
        )}

        {view === "job-changes" && (
          <JobChangeReview />
        )}

        {view === "fact-boxes" && (
          <FactBoxesManager />
        )}

        {view === "tags" && (
          <TagsManager />
        )}

        {view === "sources" && (
          <SourcesManager />
        )}

        {view === "media" && (
          <MediaArchive />
        )}
      </main>
    </div>
  );
};

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
}

const DashboardCard = ({ title, description, icon: Icon, onClick, disabled }: DashboardCardProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      bg-card rounded-xl p-6 text-left shadow-soft transition-all
      ${disabled 
        ? "opacity-50 cursor-not-allowed" 
        : "hover:shadow-elevated hover:-translate-y-1 cursor-pointer"
      }
    `}
  >
    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <h3 className="font-headline text-lg font-medium text-headline mb-1">
      {title}
    </h3>
    <p className="text-sm text-muted-foreground font-body">
      {description}
    </p>
  </button>
);

interface MediaStats {
  total: number;
  recent: { id: string; public_url: string; alt_text: string }[];
  latestAt: string | null;
}

const MediaArchiveCard = ({ onClick }: { onClick: () => void }) => {
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, count } = await supabase
        .from("media_assets")
        .select("id, public_url, alt_text, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(4);
      if (!active) return;
      setStats({
        total: count ?? 0,
        recent: (data ?? []).map((d) => ({ id: d.id, public_url: d.public_url, alt_text: d.alt_text })),
        latestAt: data?.[0]?.created_at ?? null,
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const latestLabel = stats?.latestAt
    ? new Intl.DateTimeFormat("nb-NO", { dateStyle: "medium" }).format(new Date(stats.latestAt))
    : null;

  return (
    <button
      onClick={onClick}
      className="bg-card rounded-xl p-6 text-left shadow-soft transition-all hover:shadow-elevated hover:-translate-y-1 cursor-pointer flex flex-col"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-primary" />
        </div>
        {!loading && (
          <div className="text-right">
            <div className="font-headline text-2xl font-semibold text-headline leading-none">
              {stats?.total ?? 0}
            </div>
            <div className="text-xs text-muted-foreground font-body mt-1">filer</div>
          </div>
        )}
      </div>
      <h3 className="font-headline text-lg font-medium text-headline mb-1">Mediearkiv</h3>
      <p className="text-sm text-muted-foreground font-body mb-3">
        {latestLabel ? `Sist oppdatert ${latestLabel}` : "Bilder, alt-tekst og kreditering"}
      </p>
      {stats && stats.recent.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 mt-auto">
          {stats.recent.map((m) => (
            <div key={m.id} className="aspect-square rounded-md overflow-hidden bg-muted">
              <img
                src={m.public_url}
                alt={m.alt_text}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </button>
  );
};
