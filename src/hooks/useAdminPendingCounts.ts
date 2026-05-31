import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PendingCounts {
  tips: number;
  jobListings: number;
  events: number;
}

/**
 * Live-queue counts for the admin panel notification badges.
 *
 * - job_listings / events: rows with status = "pending" (the review queue).
 * - tips: total rows visible to the caller. RLS scopes `tips` to admins and
 *   journalists, and a tip is addressed to a specific journalist, so this is
 *   naturally a per-journalist count (a pure admin with no directed tips sees
 *   0). Tips have no "reviewed" status, so the badge reflects the full inbox
 *   rather than only unseen items — see the source-protection notes in
 *   CLAUDE.md before changing this.
 *
 * Counts refresh in real time via postgres_changes subscriptions.
 */
export function useAdminPendingCounts() {
  const [counts, setCounts] = useState<PendingCounts>({ tips: 0, jobListings: 0, events: 0 });

  const refresh = useCallback(async () => {
    const [tipsRes, jobsRes, eventsRes] = await Promise.all([
      supabase.from("tips").select("id", { count: "exact", head: true }),
      supabase.from("job_listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    setCounts({
      tips: tipsRes.count ?? 0,
      jobListings: jobsRes.count ?? 0,
      events: eventsRes.count ?? 0,
    });
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("admin-pending-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "tips" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "job_listings" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return counts;
}
