/**
 * Lightweight first-party analytics client.
 *
 * - Persists an anonymous session id in localStorage (no cookies, no PII).
 * - Logs article views and discrete user-journey events.
 * - All inserts go through Supabase RLS — only staff can read aggregated data.
 */
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "nn_session_id";
const SESSION_TIMESTAMP_KEY = "nn_session_ts";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min idle window

export type FunnelEvent =
  | "signup"
  | "onboarding_completed"
  | "article_read"
  | "paywall_viewed"
  | "subscription_started";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getSessionId(): string {
  try {
    const now = Date.now();
    const ts = Number(localStorage.getItem(SESSION_TIMESTAMP_KEY) || "0");
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing && now - ts < SESSION_TTL_MS) {
      localStorage.setItem(SESSION_TIMESTAMP_KEY, String(now));
      return existing;
    }
    const fresh = uuid();
    localStorage.setItem(SESSION_KEY, fresh);
    localStorage.setItem(SESSION_TIMESTAMP_KEY, String(now));
    return fresh;
  } catch {
    return uuid();
  }
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return "tablet";
  if (/mobi|android|iphone/.test(ua)) return "mobile";
  return "desktop";
}

function getReferrerHost(): string | null {
  try {
    const ref = document.referrer;
    if (!ref) return "direct";
    const url = new URL(ref);
    if (url.host === window.location.host) return "internal";
    return url.host;
  } catch {
    return null;
  }
}

function getRegion(): string | null {
  try {
    return localStorage.getItem("nn_region") || null;
  } catch {
    return null;
  }
}

/**
 * Start tracking a single article view. Returns a handle with `update` and
 * `end` so the caller can periodically extend the read time / scroll depth
 * and finalise the row when the user leaves.
 */
export async function startArticleView(articleId: string) {
  if (!articleId) return null;
  const sessionId = getSessionId();

  const referrer_host = getReferrerHost();
  const device_type = detectDevice();
  const region_slug = getRegion();

  // Writes go through SECURITY DEFINER RPCs (see migration
  // 20260603120000_article_view_write_rpcs.sql). The RPC sets user_id from
  // auth.uid() server-side, and returns the new id even to anonymous callers
  // (a direct INSERT ... RETURNING cannot, since anon has no SELECT policy).
  const { data: rowId, error } = await supabase.rpc("log_article_view", {
    _article_id: articleId,
    _session_id: sessionId,
    _referrer_host: referrer_host,
    _device_type: device_type,
    _region_slug: region_slug,
  });

  if (error || !rowId) return null;
  let lastSeconds = 0;
  let lastDepth = 0;
  let lastCompleted = false;

  return {
    update: async (read_seconds: number, scroll_depth: number, completed: boolean) => {
      const sec = Math.round(read_seconds);
      const depth = Math.min(100, Math.round(scroll_depth * 100) / 100);
      // avoid noisy writes
      if (
        sec === lastSeconds &&
        Math.abs(depth - lastDepth) < 1 &&
        completed === lastCompleted
      ) {
        return;
      }
      lastSeconds = sec;
      lastDepth = depth;
      lastCompleted = completed;
      await supabase.rpc("update_article_view", {
        _id: rowId,
        _session_id: sessionId,
        _read_seconds: sec,
        _scroll_depth: depth,
        _completed: completed,
      });
    },
    end: async (read_seconds: number, scroll_depth: number, completed: boolean) => {
      const sec = Math.round(read_seconds);
      const depth = Math.min(100, Math.round(scroll_depth * 100) / 100);
      try {
        // Fire-and-forget on unload; same guarded RPC as update().
        await supabase.rpc("update_article_view", {
          _id: rowId,
          _session_id: sessionId,
          _read_seconds: sec,
          _scroll_depth: depth,
          _completed: completed,
        });
      } catch {
        /* ignore */
      }
    },
  };
}

/** Log a single funnel/journey event (signup, onboarding_completed, etc). */
export async function trackEvent(event: FunnelEvent | string, data: Record<string, any> = {}) {
  try {
    const sessionId = getSessionId();
    const { data: sess } = await supabase.auth.getSession();
    await supabase.from("user_events").insert({
      session_id: sessionId,
      user_id: sess.session?.user?.id ?? null,
      event_type: event,
      event_data: data,
      region_slug: getRegion(),
      referrer_host: getReferrerHost(),
    } as any);
  } catch (err) {
    console.warn("trackEvent failed", err);
  }
}
