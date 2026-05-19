const getEnv = (viteKey: string, nextKey: string): string => {
  if (typeof import.meta !== "undefined" && (import.meta as any).env?.[viteKey]) {
    return (import.meta as any).env[viteKey];
  }
  if (typeof process !== "undefined" && process.env?.[nextKey]) {
    return process.env[nextKey]!;
  }
  return "";
};

export const SUPABASE_URL = getEnv("VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const SUPABASE_PROJECT_ID = getEnv("VITE_SUPABASE_PROJECT_ID", "NEXT_PUBLIC_SUPABASE_URL").replace("https://", "").replace(".supabase.co", "");
export const PAYMENTS_CLIENT_TOKEN = getEnv("VITE_PAYMENTS_CLIENT_TOKEN", "VITE_PAYMENTS_CLIENT_TOKEN") || undefined;
