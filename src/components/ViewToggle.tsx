import { MessageSquare, Newspaper, BarChart2, Star, Sparkles } from "lucide-react";
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

type TabId = "search" | "feed" | "tall" | "hjernevelvet";

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const { language, defaultView, setDefaultView, hiddenElements } = useTheme();
  const t = translations[language];
  const location = useLocation();
  const navigate = useNavigate();
  const isIdrett = location.pathname.startsWith("/idrett");
  const isTall = location.pathname.startsWith("/tall");
  const isHjernevelvet = location.pathname.startsWith("/hjernevelvet");

  const allTabs: { id: TabId; label: string; icon: typeof MessageSquare; to?: string }[] = [
    { id: "search", label: t.ask, icon: MessageSquare },
    { id: "feed", label: t.browse, icon: Newspaper },
    { id: "tall", label: "Tall", icon: BarChart2, to: "/tall" },
    { id: "hjernevelvet", label: "Hjernevelvet", icon: Sparkles, to: "/hjernevelvet" },
  ];

  const tabs = allTabs.filter((tab) => !hiddenElements.includes(tab.id));

  const handleClick = (tabId: TabId) => {
    if (tabId === "tall" || tabId === "hjernevelvet") {
      const target = tabId === "tall" ? "/tall" : "/hjernevelvet";
      if (location.pathname !== target) navigate(target);
      return;
    }
    if (isTall || isIdrett || isHjernevelvet) navigate(`/?view=${tabId}`);
    onViewChange(tabId);
  };

  const isActive = (tabId: TabId) => {
    if (tabId === "tall") return isTall;
    if (tabId === "hjernevelvet") return isHjernevelvet;
    if (isTall || isHjernevelvet) return false;
    return !isIdrett && view === tabId;
  };

  return (
    <div className="flex items-center justify-center py-4 sm:py-6 px-3">
      <div className="inline-flex items-center bg-secondary rounded-full p-1 sm:p-1.5 max-w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.id);
          const className = `relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-full font-body text-xs sm:text-sm font-medium transition-all duration-200 ${
            active
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          }`;
          const labelClass = active ? "" : "hidden sm:inline";

          if (tab.to) {
            return (
              <Link key={tab.id} to={tab.to} className={className} title={tab.label}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className={labelClass}>{tab.label}</span>
                {defaultView === tab.id && (
                  <Star className="w-3 h-3 fill-primary text-primary shrink-0" />
                )}
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab.id)}
              className={className}
              title={tab.label}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className={labelClass}>{tab.label}</span>
              {defaultView === tab.id && (
                <Star className="w-3 h-3 fill-primary text-primary shrink-0" />
              )}
            </button>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-0.5 sm:ml-1 p-1.5 sm:p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all duration-200 shrink-0"
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
