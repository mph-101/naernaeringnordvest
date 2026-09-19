import type { Region } from "@/hooks/useRegion";

/**
 * Displayed region names override the raw `editorial_regions.name` column
 * for regions whose product-facing name changed after the DB row was
 * seeded. Rebrand 2026-09-19: pilot region "Nordvestlandet" -> "Nordvest"
 * (see docs/magnus-todo.md — DB row still says "Nordvestlandet", intentionally
 * left untouched pending Magnus' own UPDATE). Drop an entry once its DB row
 * is updated to match; this override then becomes a no-op.
 */
const REGION_NAME_OVERRIDES: Record<string, string> = {
  nordvestlandet: "Nordvest",
};

export function regionDisplayName(region: Region): string {
  return REGION_NAME_OVERRIDES[region.slug] ?? region.name;
}
