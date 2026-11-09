// Pre-launch gate: pure decision logic, kept free of Next imports so it can be
// unit-tested. middleware.ts is the only caller.
//
// When PRELAUNCH is on, every public route is served the /kommer-snart page.
// Staff routes stay reachable, and a secret preview link sets a cookie that
// lets invited people browse the real site.

export const PRELAUNCH_PAGE = "/kommer-snart";
export const PREVIEW_COOKIE = "naer_forhandsvisning";
export const PREVIEW_PARAM = "forhandsvisning";
export const PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Routes that must keep working behind the gate: CMS, auth, API routes and
// newsletter unsubscribe (people who sign up on the gate page need a way out).
const EXEMPT_PREFIXES = [
  "/admin",
  "/login",
  "/nullstill-passord",
  "/reset-password",
  "/api",
  "/unsubscribe",
];

// Static files in /public that the matcher in middleware.ts does not exclude.
const STATIC_FILE = /\.(?:js|css|txt|xml|ico|json|map|woff2?|webmanifest)$/i;

export type PrelaunchDecision =
  | { type: "off" } // gate disabled: behave exactly as before
  | { type: "pass" } // gate enabled, but this request may see the real site
  | { type: "grant" } // valid preview link: set cookie, redirect to clean URL
  | { type: "gate" }; // serve the coming-soon page

export interface PrelaunchInput {
  /** Raw value of the PRELAUNCH env var. */
  enabled: string | undefined;
  /** Raw value of the PRELAUNCH_PREVIEW_TOKEN env var. */
  previewToken: string | undefined;
  pathname: string;
  /** Value of the ?forhandsvisning= query param, if present. */
  previewParam: string | null | undefined;
  /** Value of the preview cookie, if present. */
  previewCookie: string | null | undefined;
}

export function isPrelaunchEnabled(raw: string | undefined): boolean {
  return raw === "true" || raw === "1";
}

function isExemptPath(pathname: string): boolean {
  if (pathname === PRELAUNCH_PAGE) return true;
  if (STATIC_FILE.test(pathname)) return true;
  return EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// A short or missing token would make the preview link guessable, so it is
// treated as "no preview access configured".
function usableToken(raw: string | undefined): string | null {
  const token = raw?.trim();
  return token && token.length >= 16 ? token : null;
}

export function prelaunchDecision(input: PrelaunchInput): PrelaunchDecision {
  if (!isPrelaunchEnabled(input.enabled)) return { type: "off" };

  const token = usableToken(input.previewToken);
  if (token && input.previewParam === token) return { type: "grant" };
  if (token && input.previewCookie === token) return { type: "pass" };
  if (isExemptPath(input.pathname)) return { type: "pass" };

  return { type: "gate" };
}
