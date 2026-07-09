import { X, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

/**
 * Stille førstegangsbanner — erstatter den tidligere tvungne /velkommen-
 * redirecten. Avisa vises umiddelbart; region-/startside-valget tilbys som
 * en lukkbar stripe. Lukking markerer onboarding som sett (nager aldri igjen);
 * fullført /velkommen gjør det samme via completeOnboarding().
 */
export function FirstVisitBanner() {
  const { language, hasOnboarded, completeOnboarding } = useTheme();
  if (hasOnboarded) return null;
  const isNo = language === "no";

  return (
    <div className="max-w-5xl mx-auto px-6 pt-4">
      <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-soft">
        <MapPin className="w-4 h-4 text-accent-ink flex-shrink-0" aria-hidden />
        <p className="text-sm text-foreground font-body flex-1 min-w-0">
          {isNo
            ? "Ny her? Velg region og startside, så viser vi deg det som er nærmest."
            : "New here? Pick your region and start page and we'll show you what's closest."}
        </p>
        <Link
          to="/velkommen"
          className="px-3 py-2 rounded-full bg-accent text-accent-foreground text-xs font-subhead font-semibold hover:bg-accent/90 transition-colors whitespace-nowrap"
        >
          {isNo ? "Tilpass" : "Customize"}
        </Link>
        <button
          onClick={completeOnboarding}
          aria-label={isNo ? "Lukk" : "Close"}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
