import { useState, type ReactNode } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  storageKey?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

function readStored(key: string | undefined, fallback: boolean): boolean {
  if (!key) return fallback;
  try {
    const v = localStorage.getItem(`editor-section-${key}`);
    if (v === "true") return true;
    if (v === "false") return false;
  } catch {}
  return fallback;
}

export const CollapsibleSection = ({
  title,
  icon: Icon,
  defaultOpen = false,
  storageKey,
  headerRight,
  children,
}: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(() => readStored(storageKey, defaultOpen));

  const handleToggle = (next: boolean) => {
    setOpen(next);
    if (storageKey) {
      try { localStorage.setItem(`editor-section-${storageKey}`, String(next)); } catch {}
    }
  };

  return (
    <Collapsible open={open} onOpenChange={handleToggle}>
      <div className="bg-card rounded-xl shadow-soft overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
          >
            <span className="flex items-center gap-2 font-headline text-lg font-medium text-headline">
              {Icon && <Icon className="w-4 h-4 text-accent" />}
              {title}
            </span>
            <div className="flex items-center gap-2">
              {headerRight && (
                <span onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                  {headerRight}
                </span>
              )}
              <ChevronRight
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-6">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
