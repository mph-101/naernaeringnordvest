import { useState } from "react";
import { CreditCard, Loader2, ExternalLink, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

interface SubscriptionSectionProps {
  isNo: boolean;
}

export function SubscriptionSection({ isNo }: SubscriptionSectionProps) {
  const sub = useSubscription();
  const [opening, setOpening] = useState(false);

  const t = isNo
    ? {
        title: "Abonnement",
        desc: "Administrer planen din og betalingsinformasjon",
        active: "Aktivt",
        trialing: "Prøveperiode",
        pastDue: "Forfalt betaling",
        canceled: "Avsluttes",
        none: "Ingen aktivt abonnement",
        noneDesc: "Bli medlem for å låse opp alle artikler",
        subscribe: "Bli medlem",
        manage: "Administrer abonnement",
        opening: "Åpner portal...",
        renews: "Fornyes",
        endsOn: "Avsluttes",
        trialEnds: "Prøveperiode slutter",
        plan: "Plan",
        loading: "Laster...",
        portalError: "Kunne ikke åpne portalen",
      }
    : {
        title: "Subscription",
        desc: "Manage your plan and payment information",
        active: "Active",
        trialing: "Trial",
        pastDue: "Payment overdue",
        canceled: "Ending",
        none: "No active subscription",
        noneDesc: "Become a member to unlock all articles",
        subscribe: "Subscribe",
        manage: "Manage subscription",
        opening: "Opening portal...",
        renews: "Renews",
        endsOn: "Ends on",
        trialEnds: "Trial ends",
        plan: "Plan",
        loading: "Loading...",
        portalError: "Could not open portal",
      };

  const handleOpenPortal = async () => {
    setOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          returnUrl: window.location.href,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.url) {
        throw new Error(error?.message || t.portalError);
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.portalError;
      toast.error(msg);
    } finally {
      setOpening(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(isNo ? "nb-NO" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (sub.loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-body">{t.loading}</span>
        </div>
      </div>
    );
  }

  // Status badge config
  let badgeLabel = t.none;
  let badgeClass = "bg-muted text-muted-foreground";
  let BadgeIcon = AlertCircle;

  if (sub.isActive) {
    if (sub.cancelAtPeriodEnd || sub.status === "canceled") {
      badgeLabel = t.canceled;
      badgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      BadgeIcon = AlertCircle;
    } else if (sub.status === "trialing") {
      badgeLabel = t.trialing;
      badgeClass = "bg-accent/10 text-accent";
      BadgeIcon = Sparkles;
    } else if (sub.status === "past_due") {
      badgeLabel = t.pastDue;
      badgeClass = "bg-destructive/10 text-destructive";
      BadgeIcon = AlertCircle;
    } else {
      badgeLabel = t.active;
      badgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      BadgeIcon = CheckCircle2;
    }
  }

  const dateLabel =
    sub.status === "trialing" && sub.trialEndsAt
      ? { label: t.trialEnds, date: formatDate(sub.trialEndsAt) }
      : sub.cancelAtPeriodEnd || sub.status === "canceled"
        ? { label: t.endsOn, date: formatDate(sub.currentPeriodEnd) }
        : sub.currentPeriodEnd
          ? { label: t.renews, date: formatDate(sub.currentPeriodEnd) }
          : null;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-headline text-lg font-semibold text-headline">{t.title}</h3>
          <p className="text-sm text-muted-foreground font-body">{t.desc}</p>
        </div>
      </div>

      {sub.isActive ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-subhead font-semibold ${badgeClass}`}>
              <BadgeIcon className="w-3.5 h-3.5" />
              {badgeLabel}
            </span>
            {sub.plan && (
              <span className="px-3 py-1 rounded-full text-xs font-subhead font-medium bg-secondary text-foreground">
                {sub.plan}
              </span>
            )}
          </div>

          {dateLabel?.date && (
            <p className="text-sm text-muted-foreground font-body">
              {dateLabel.label}{" "}
              <span className="text-foreground font-medium">{dateLabel.date}</span>
            </p>
          )}

          <button
            onClick={handleOpenPortal}
            disabled={opening}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {opening ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.opening}
              </>
            ) : (
              <>
                {t.manage}
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-subhead font-semibold ${badgeClass}`}>
              <BadgeIcon className="w-3.5 h-3.5" />
              {badgeLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-body">{t.noneDesc}</p>
          <Link
            to="/abonnement"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft"
          >
            <Sparkles className="w-4 h-4" />
            {t.subscribe}
          </Link>
        </div>
      )}
    </div>
  );
}