/**
 * Extract a route parameter from the browser URL.
 *
 * react-router's useParams() returns {} in Next.js because BrowserRouter
 * doesn't know about Next.js routes. This helper reads the actual URL instead.
 *
 * @param position - Segment position from the end (0 = last, 1 = second-to-last)
 */
export function getUrlParam(position = 0): string | undefined {
  if (typeof window === "undefined") return undefined;
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1 - position] || undefined;
}
