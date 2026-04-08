import { MessageSquare, Newspaper, BarChart2, Star } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ViewToggleProps {
  view: "search" | "feed";
  onViewChange: (view: "search" | "feed") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const { language, defaultView, setDefaultView } = useTheme();
  const t = translations[language];
  const location = useLocation();
  const navigate = useNavigate();
  const isIdrett = location.pathname.startsWith("/idrett");
  const isTall = location.pathname.startsWith("/tall");

  const tabs = [
    { id: "search" as const, label: t.ask, icon: MessageSquare },
    { id: "feed" as const, label: t.browse, icon: Newspaper },
    { id: "tall" as const, label: "Tall", icon: BarChart2 },
  ];

  const handleClick = (tabId: "search" | "feed" | "tall") => {
    if (tabId === "tall") {
      if (!isTall) navigate("/tall");
    } else {
      if (isTall || isIdrett) navigate(`/?view=${tabId}`);
      onViewChange(tabId);
    }
  };

  const isActive = (tabId: string) => {
    if (tabId === "tall") return isTall;
    if (isTall) return false;
    return !isIdrett && view === tabId;
  };

  return (
    <div className="flex items-center justify-center py-6">
      <div className="inline-flex items-center bg-secondary rounded-full p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.id);

          if (tab.id === "tall") {
            return (
              <Link
                key={tab.id}
                to="/tall"
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full font-body text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {defaultView === tab.id && (
                  <Star className="w-3 h-3 fill-primary text-primary" />
                )}
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full font-body text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {defaultView === tab.id && (
                <Star className="w-3 h-3 fill-primary text-primary" />
              )}
            </button>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-1 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all duration-200"
              title={language === "no" ? "Velg startside" : "Choose landing page"}
            >
              <Star className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {language === "no" ? "Foretrukket startside" : "Preferred landing page"}
            </p>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => setDefaultView(tab.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {defaultView === tab.id && (
                    <Star className="w-3 h-3 ml-auto fill-primary text-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
