import { MessageSquare, Newspaper } from "lucide-react";

interface ViewToggleProps {
  view: "search" | "feed";
  onViewChange: (view: "search" | "feed") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center justify-center py-6">
      <div className="inline-flex bg-surface-subtle rounded-xl p-1 border border-border">
        <button
          onClick={() => onViewChange("search")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-body text-sm font-medium transition-all duration-200 ${
            view === "search"
              ? "bg-background text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Ask
        </button>
        <button
          onClick={() => onViewChange("feed")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-body text-sm font-medium transition-all duration-200 ${
            view === "feed"
              ? "bg-background text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Newspaper className="w-4 h-4" />
          Browse
        </button>
      </div>
    </div>
  );
}
