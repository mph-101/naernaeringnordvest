import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStripeEnvironment } from "@/lib/stripe";

export interface SubscriptionState {
  loading: boolean;
  isActive: boolean;
  status: string | null;
  plan: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const initial: SubscriptionState = {
  loading: true,
  isActive: false,
  status: null,
  plan: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

/**
 * Reads personal subscription status for the current user.
 * Note: This is UX only. All gating happens server-side via has_active_subscription.
 */
export function useSubscription() {
  const { userId } = useAuth();
  const [state, setState] = useState<SubscriptionState>(initial);

  useEffect(() => {
    if (!userId) {
      setState({ ...initial, loading: false });
      return;
    }
    let mounted = true;

    const load = async () => {
      const env = getStripeEnvironment();
      const { data } = await supabase
        .from("subscriptions")
        .select("status, plan, trial_ends_at, current_period_end, cancel_at_period_end")
        .eq("user_id", userId)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mounted) return;
      const status = data?.status ?? null;
      const periodEnd = data?.current_period_end ?? null;
      const futurePeriod = !periodEnd || new Date(periodEnd) > new Date();
      const isActive =
        !!status &&
        ((["trialing", "active", "past_due"].includes(status) && futurePeriod) ||
          (status === "canceled" && futurePeriod));
      setState({
        loading: false,
        isActive,
        status,
        plan: data?.plan ?? null,
        trialEndsAt: data?.trial_ends_at ?? null,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
      });
    };

    load();

    const channelName = `subscription:${userId}`;
    // Remove any stale channel with the same name (React strict mode double-mount)
    const existing = supabase.getChannels().find((c) => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return state;
}