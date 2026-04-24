import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, AlertCircle, X } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";

type BannerKind = "trial" | "canceled" | "past_due";

/**
 * Slim banner under the header surfacing time-sensitive subscription states:
 *  - trialing: shows days remaining + upgrade CTA
 *  - cancel_at_period_end / canceled with future period_end: shows end date + reactivate CTA
 *  - past_due: shows payment failed + manage CTA
 * Dismissable per-state via sessionStorage.
 */
export function SubscriptionTrialBanner() {
  const sub = useSubscription();
  const { language } = useTheme();
  const navigate = useNavigate();
  const isNo = language === "no";
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  // Determine banner kind
  let kind: BannerKind | null = null;
  if (sub.status === "trialing") kind = "trial";
  else if (sub.status === "past_due") kind = "past_due";
  else if ((sub.cancelAtPeriodEnd || sub.status === "canceled") && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date()) {
    kind = "canceled";
  }

  const stateKey = kind ? `nn:sub-banner-dismissed:${kind}` : null;

  useEffect(() => {
    if (!stateKey) {
      setDismissedKey(null);
      return;
    }
    setDismissedKey(sessionStorage.getItem(stateKey));
  }, [stateKey]);

  if (sub.loading || !kind || !stateKey) return null;
  if (dismissedKey === "1") return null;

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(isNo ? "nb-NO" : "en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

  const daysUntil = (iso: string | null) => {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  };

  let bgClass = "";
  let Icon = Sparkles;
  let message = "";
  let ctaLabel = "";

  if (kind === "trial") {
    bgClass = "bg-accent/10 text-accent border-accent/20";
    Icon = Sparkles;
    const days = daysUntil(sub.trialEndsAt);
    if (days !== null) {
      message = isNo
        ? `Du har ${days} ${days === 1 ? "dag" : "dager"} igjen av prøveperioden${sub.trialEndsAt ? ` (slutter ${formatDate(sub.trialEndsAt)})` : ""}.`
        : `You have ${days} ${days === 1 ? "day" : "days"} left in your trial${sub.trialEndsAt ? ` (ends ${formatDate(sub.trialEndsAt)})` : ""}.`;
    } else {
      message = isNo ? "Du er i prøveperiode." : "You are on a trial.";
    }
    ctaLabel = isNo ? "Oppgrader" : "Upgrade";
  } else if (kind === "canceled") {
    bgClass = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
    Icon = AlertCircle;
    message = isNo
      ? `Abonnementet avsluttes ${formatDate(sub.currentPeriodEnd)}. Du har fortsatt full tilgang frem til da.`
      : `Your subscription ends on ${formatDate(sub.currentPeriodEnd)}. You retain full access until then.`;
    ctaLabel = isNo ? "Gjenoppta" : "Resume";
  } else if (kind === "past_due") {
    bgClass = "bg-destructive/10 text-destructive border-destructive/20";
    Icon = AlertCircle;
    message = isNo
      ? "Siste betaling mislyktes. Oppdater betalingsinformasjon for å unngå avbrudd."
      : "Your last payment failed. Update your payment method to avoid interruption.";
    ctaLabel = isNo ? "Administrer" : "Manage";
  }

  const handleDismiss = () => {
    sessionStorage.setItem(stateKey, "1");
    setDismissedKey("1");
  };

  return (
    <div className={`w-full border-b ${bgClass}`}>
      <div className="max-w-5xl mx-auto px-6 py-2.5 flex items-center gap-3">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <p className="flex-1 text-sm font-body min-w-0">{message}</p>
        <button
          onClick={() => navigate("/profil")}
          className="px-3 py-1 rounded-full text-xs font-subhead font-semibold bg-current/10 hover:bg-current/20 transition-colors flex-shrink-0"
          style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
        >
          {ctaLabel}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-current/10 transition-colors flex-shrink-0 opacity-70 hover:opacity-100"
          title={isNo ? "Lukk" : "Dismiss"}
          aria-label={isNo ? "Lukk" : "Dismiss"}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}