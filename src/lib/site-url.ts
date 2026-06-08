// Canonical, absolute base URL for the site. Used for SEO-critical absolute
// URLs (JSON-LD, OG canonical) where preview/deploy hostnames must NOT leak in.
//
// Set NEXT_PUBLIC_SITE_URL in the production environment to the real domain.
// The fallback is the intended launch domain; see docs/magnus-todo.md.
export function getSiteUrl(): string {
  const fromEnv =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SITE_URL) || "";
  return (fromEnv || "https://naernaering.no").replace(/\/+$/, "");
}
