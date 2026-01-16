import { MessageSquare, Newspaper } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";

interface ViewToggleProps {
  view: "search" | "feed";
  onViewChange: (view: "search" | "feed") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const { language } = useTheme();
  const t = translations[language];

  return (
    <div className="flex items-center justify-center py-6">
      <div className="inline-flex bg-secondary rounded-full p-1.5">
        <button
          onClick={() => onViewChange("search")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-body text-sm font-medium transition-all duration-200 ${
            view === "search"
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {t.ask}
        </button>
        <button
          onClick={() => onViewChange("feed")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-body text-sm font-medium transition-all duration-200 ${
            view === "feed"
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Newspaper className="w-4 h-4" />
          {t.browse}
        </button>
      </div>
    </div>
  );
}
