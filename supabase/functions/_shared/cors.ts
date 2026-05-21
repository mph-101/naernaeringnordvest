const FALLBACK_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

// Production + any Vercel deployment for this project (always allowed,
// regardless of ALLOWED_ORIGINS env var).
const PROJECT_DOMAINS = [
  "https://naernaeringnordvest.vercel.app",
];
const VERCEL_PREVIEW_PATTERN = /^https:\/\/naernaeringnordvest(-[a-z0-9-]+)?\.vercel\.app$/;

function getAllowedOrigins(): string[] {
  const env = Deno.env.get("ALLOWED_ORIGINS");
  if (env) return env.split(",").map((o) => o.trim());
  return FALLBACK_ORIGINS;
}

export function corsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  const isAllowed =
    allowed.includes(origin) ||
    PROJECT_DOMAINS.includes(origin) ||
    VERCEL_PREVIEW_PATTERN.test(origin);
  const match = isAllowed ? origin : "";

  return {
    "Access-Control-Allow-Origin": match,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    ...(match ? { Vary: "Origin" } : {}),
  };
}
