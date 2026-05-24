// Stable per-browser visitor ID used for anonymous paywall tracking.
// Stored in localStorage so it survives across sessions in the same browser.
// Falls back to sessionStorage if localStorage is blocked. Returns null in
// SSR contexts where window is unavailable.

const KEY = "nn_visitor_id";

function generateUuid(): string {
  // crypto.randomUUID is available in all modern browsers
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for very old environments
  return "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && existing.length >= 8) return existing;
    const fresh = generateUuid();
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // localStorage might be blocked (Safari private mode, settings, etc.)
    try {
      const existing = window.sessionStorage.getItem(KEY);
      if (existing && existing.length >= 8) return existing;
      const fresh = generateUuid();
      window.sessionStorage.setItem(KEY, fresh);
      return fresh;
    } catch {
      return null;
    }
  }
}
