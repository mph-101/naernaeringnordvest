/**
 * Universal env helper — works in both Vite and Next.js.
 *
 * Next.js inlines process.env.NEXT_PUBLIC_* at build time via static analysis,
 * so the references MUST be literal strings (not dynamic keys).
 */

function firstNonEmpty(...values: (string | undefined)[]): string {
  for (const v of values) {
    if (v) return v;
  }
  return "";
}

export const SUPABASE_URL = firstNonEmpty(
  typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_SUPABASE_URL : undefined,
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = firstNonEmpty(
  typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY : undefined,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const SUPABASE_PROJECT_ID = firstNonEmpty(
  typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID : undefined,
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").replace(".supabase.co", ""),
);

export const PAYMENTS_CLIENT_TOKEN = firstNonEmpty(
  typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_PAYMENTS_CLIENT_TOKEN : undefined,
) || undefined;
