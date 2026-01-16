import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Users, 
  LogOut,
  ArrowLeft,
  Menu,
  X
} from "lucide-react";
import { ArticlesList } from "./ArticlesList";
import { ArticleEditor } from "./ArticleEditor";
import { TipsList } from "./TipsList";

interface AdminDashboardProps {
  session: any;
  onLogout: () => void;
}

type View = "dashboard" | "articles" | "editor" | "tips";

export const AdminDashboard = ({ session, onLogout }: AdminDashboardProps) => {
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
    { id: "articles" as View, label: "Artikler", icon: FileText },
    { id: "tips" as View, label: "Tips", icon: MessageSquare },
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
                title="Artikler"
                description="Administrer artikler og innhold"
                icon={FileText}
                onClick={() => setView("articles")}
              />
              <DashboardCard
                title="Tips"
                description="Se innkomne tips fra lesere"
                icon={MessageSquare}
                onClick={() => setView("tips")}
              />
              <DashboardCard
                title="Brukere"
                description="Kommer snart"
                icon={Users}
                disabled
              />
            </div>
          </div>
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
