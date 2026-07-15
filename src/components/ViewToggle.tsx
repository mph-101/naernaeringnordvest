import { MessageSquare, Newspaper, BarChart2, Star, Sparkles } from "lucide-react";
// Using <a> instead of react-router Link for Next.js compatibility
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
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const isTall = pathname.startsWith("/tall");
  const isHjernevelvet = pathname.startsWith("/hjernevelvet");

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
      if (pathname !== target) window.location.href = target;
      return;
    }
    if (isTall || isHjernevelvet) {
      window.location.href = `/?view=${tabId}`;
      return;
    }
    onViewChange(tabId);
  };

  const isActive = (tabId: TabId) => {
    if (tabId === "tall") return isTall;
    if (tabId === "hjernevelvet") return isHjernevelvet;
    if (isTall || isHjernevelvet) return false;
    return view === tabId;
  };

  return (
    <div className="flex items-center justify-center py-4 sm:py-6 px-3">
      <div className="inline-flex items-center bg-secondary rounded-full p-1 sm:p-1.5 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.id);
          const className = `relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-full font-body text-xs sm:text-sm font-medium transition-all duration-200 ${
            active
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          }`;
          // Etiketter er alltid synlige — ikon-only faner med title-tooltip
          // var ubrukelige på touch (re-audit responsive P1).
          const labelClass = "";

          if (tab.to) {
            return (
              <a key={tab.id} href={tab.to} className={className} title={tab.label} aria-label={tab.label} aria-current={active ? "page" : undefined}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className={labelClass}>{tab.label}</span>
                {defaultView === tab.id && (
                  <Star className="w-3 h-3 fill-primary-ink text-primary-ink shrink-0" />
                )}
              </a>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab.id)}
              className={className}
              title={tab.label}
              aria-label={tab.label}
              aria-pressed={active}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className={labelClass}>{tab.label}</span>
              {defaultView === tab.id && (
                <Star className="w-3 h-3 fill-primary-ink text-primary-ink shrink-0" />
              )}
            </button>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-0.5 sm:ml-1 min-w-10 min-h-10 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all duration-200 shrink-0"
              title={language === "no" ? "Velg startside" : "Choose landing page"}
              aria-label={language === "no" ? "Velg startside" : "Choose landing page"}
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
                    <Star className="w-3 h-3 ml-auto fill-primary-ink text-primary-ink" />
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
