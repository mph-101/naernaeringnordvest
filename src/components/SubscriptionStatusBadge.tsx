import { CheckCircle2, Sparkles, AlertCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";

/**
 * Compact pill shown in the header reflecting the user's subscription state.
 * Renders nothing while loading, or for users with no subscription record at all.
 */
export function SubscriptionStatusBadge() {
  const sub = useSubscription();
  const { language } = useTheme();
  const navigate = useNavigate();
  const isNo = language === "no";

  if (sub.loading || !sub.status) return null;

  let label = "";
  let className = "";
  let Icon = CheckCircle2;
  let title = "";

  if (sub.cancelAtPeriodEnd || sub.status === "canceled") {
    label = isNo ? "Avsluttes" : "Ending";
    className = "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20";
    Icon = AlertCircle;
    title = isNo ? "Abonnementet avsluttes ved periodens slutt" : "Subscription ends at period end";
  } else if (sub.status === "trialing") {
    label = isNo ? "Prøveperiode" : "Trial";
    className = "bg-accent/10 text-accent hover:bg-accent/20";
    Icon = Sparkles;
    title = isNo ? "Du er i prøveperiode" : "You are on a trial";
  } else if (sub.status === "past_due") {
    label = isNo ? "Forfalt" : "Past due";
    className = "bg-destructive/10 text-destructive hover:bg-destructive/20";
    Icon = AlertCircle;
    title = isNo ? "Betaling forfalt" : "Payment overdue";
  } else if (sub.isActive) {
    label = isNo ? "Aktiv" : "Active";
    className = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20";
    Icon = CheckCircle2;
    title = isNo ? "Aktivt abonnement" : "Active subscription";
  } else {
    // Inactive / lapsed — surface as a soft prompt
    label = isNo ? "Inaktiv" : "Inactive";
    className = "bg-muted text-muted-foreground hover:bg-muted/80";
    Icon = Clock;
    title = isNo ? "Ingen aktivt abonnement" : "No active subscription";
  }

  return (
    <button
      onClick={() => navigate("/profil")}
      title={title}
      className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-subhead font-semibold transition-colors ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}