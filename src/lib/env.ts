/**
 * Universal env helper — works in both Vite and Next.js.
 *
 * Next.js inlines process.env.NEXT_PUBLIC_* at build time via static analysis,
 * so the references MUST be literal strings (not dynamic keys).
 *
 * In Vite, `process` is not defined, so we guard every access.
 */

function firstNonEmpty(...values: (string | undefined)[]): string {
  for (const v of values) {
    if (v) return v;
  }
  return "";
}

const hasProcess = typeof process !== "undefined" && process.env;

export const SUPABASE_URL = firstNonEmpty(
  typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_SUPABASE_URL : undefined,
  hasProcess ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined,
);

export const SUPABASE_ANON_KEY = firstNonEmpty(
  typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY : undefined,
  hasProcess ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined,
);

export const SUPABASE_PROJECT_ID = firstNonEmpty(
  typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID : undefined,
  hasProcess ? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").replace(".supabase.co", "") : undefined,
);

export const PAYMENTS_CLIENT_TOKEN = firstNonEmpty(
  typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_PAYMENTS_CLIENT_TOKEN : undefined,
  hasProcess ? process.env.NEXT_PUBLIC_PAYMENTS_CLIENT_TOKEN : undefined,
) || undefined;
