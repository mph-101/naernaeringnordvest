/**
 * Slugify a tag name for URL-safe slugs.
 * Norwegian-aware: æ→ae, ø→o, å→a.
 */
export function slugifyTag(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}
