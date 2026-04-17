/**
 * Choose drop cap variant for an article based on category and length.
 *
 * - "feature" — long features: large serif accent (default for ≥600 words)
 * - "news"    — news stories: smaller sans-serif (200–599 words, or news category)
 * - "none"    — short notices: no drop cap (<200 words, or notice/notis category)
 *
 * Returns the CSS class name to apply to the first paragraph,
 * or an empty string for "none".
 */
export type DropcapVariant = "feature" | "news" | "none";

const NOTICE_KEYWORDS = ["notis", "notice", "kort", "kunngjør", "jobbytte", "opprykk"];
const NEWS_KEYWORDS = ["nyhet", "news", "aktuelt", "siste"];

export function pickDropcapVariant(
  category: string | null | undefined,
  bodyText: string,
): DropcapVariant {
  const cat = (category || "").toLowerCase().trim();
  // Strip HTML for a rough word count
  const words = bodyText
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  // Category-based overrides take precedence
  if (NOTICE_KEYWORDS.some((k) => cat.includes(k))) return "none";
  if (NEWS_KEYWORDS.some((k) => cat.includes(k))) return words < 150 ? "none" : "news";

  // Length-based default
  if (words < 200) return "none";
  if (words < 600) return "news";
  return "feature";
}

export function dropcapClassName(variant: DropcapVariant): string {
  if (variant === "feature") return "article-dropcap-feature";
  if (variant === "news") return "article-dropcap-news";
  return "";
}
