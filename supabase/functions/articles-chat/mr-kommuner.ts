// Deterministic Møre og Romsdal kommune resolution for Spør's data lookups.
//
// Why this exists: the planner LLM only knew a handful of MR kommunenumre and
// had a stale code for Ålesund (1507 → correct is 1508 after the 2024 Haram
// split). Mapping place → kommunenummer in code instead removes the
// hallucination/staleness risk and gives full regional coverage.
//
// SYNC: mirror of the "Møre og Romsdal" block in src/data/regions.ts. This is a
// Deno edge function and cannot import from src/, so the list is duplicated.
// Keep the two in sync if the kommune structure changes.

export interface MrKommune {
  nummer: string;
  navn: string;
}

export const MR_KOMMUNER: MrKommune[] = [
  { nummer: "1505", navn: "Kristiansund" },
  { nummer: "1506", navn: "Molde" },
  { nummer: "1508", navn: "Ålesund" },
  { nummer: "1511", navn: "Vanylven" },
  { nummer: "1514", navn: "Sande" },
  { nummer: "1515", navn: "Herøy" },
  { nummer: "1516", navn: "Ulstein" },
  { nummer: "1517", navn: "Hareid" },
  { nummer: "1520", navn: "Ørsta" },
  { nummer: "1525", navn: "Stranda" },
  { nummer: "1528", navn: "Sykkylven" },
  { nummer: "1531", navn: "Sula" },
  { nummer: "1532", navn: "Giske" },
  { nummer: "1535", navn: "Vestnes" },
  { nummer: "1539", navn: "Rauma" },
  { nummer: "1547", navn: "Aukra" },
  { nummer: "1554", navn: "Averøy" },
  { nummer: "1557", navn: "Gjemnes" },
  { nummer: "1560", navn: "Tingvoll" },
  { nummer: "1563", navn: "Sunndal" },
  { nummer: "1566", navn: "Surnadal" },
  { nummer: "1573", navn: "Smøla" },
  { nummer: "1576", navn: "Aure" },
  { nummer: "1577", navn: "Volda" },
  { nummer: "1578", navn: "Fjord" },
  { nummer: "1579", navn: "Hustadvika" },
  { nummer: "1580", navn: "Haram" },
];

/** All MR kommunenumre — for region-wide register queries (comma-joined). */
export const MR_KOMMUNE_NUMBERS: string[] = MR_KOMMUNER.map((k) => k.nummer);

const BY_LOWER_NAME = new Map(MR_KOMMUNER.map((k) => [k.navn.toLowerCase(), k]));
const BY_NUMMER = new Map(MR_KOMMUNER.map((k) => [k.nummer, k.navn]));

/** Kommune name for a kommunenummer, or null if it is not an MR kommune. */
export function kommuneNavnByNummer(nummer: string): string | null {
  return BY_NUMMER.get(nummer) ?? null;
}

/**
 * Find the first Møre og Romsdal kommune named as a whole word in `text`.
 * Token-based (not substring) so "fjorden" does not match "Fjord". Note that a
 * few kommune names double as common words (Fjord, Sande, Aure) — a false hit
 * only adds an unnecessary geo-filter, never wrong financial figures.
 *
 * "Herøy" resolves to MR (1515), not Nordland (1818): the regional default for
 * a Nordvest paper.
 */
export function resolveMrKommuneFromText(text: string): MrKommune | null {
  if (!text) return null;
  const tokens = text.toLowerCase().split(/[^a-zæøå0-9]+/);
  for (const tok of tokens) {
    if (!tok) continue;
    const hit = BY_LOWER_NAME.get(tok);
    if (hit) return hit;
  }
  return null;
}

// Relative geo terms that, for a Nær Næring reader, mean "the region" =
// Møre og Romsdal / Nordvestlandet. Used to scope lookups region-wide when the
// user says "lokale/regionale/her i regionen" without naming a kommune.
const REGION_WORDS = new Set([
  "regionen",
  "regional",
  "regionalt",
  "regionale",
  "lokal",
  "lokale",
  "lokalt",
  "nordvestlandet",
  "fylket",
]);

/** True when the question refers to the region relatively (no kommune named). */
export function isRegionScoped(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (lower.includes("møre og romsdal")) return true;
  return lower.split(/[^a-zæøå0-9]+/).some((t) => REGION_WORDS.has(t));
}

/**
 * If the question refers to the region relatively (and no specific kommune was
 * resolved), scope BRREG queries and the Tall plan to ALL of Møre og Romsdal —
 * the comma-separated kommune list, which enhetsregisteret and brreg-proxy both
 * accept. Mutates in place; returns true when region scope was applied.
 */
export function applyRegionScope(
  brreg: Array<{ params?: Record<string, string> }> | null,
  tall: { kommunenummer?: string } | null,
  text: string,
): boolean {
  if (!isRegionScoped(text)) return false;
  const csv = MR_KOMMUNE_NUMBERS.join(",");
  if (tall && !tall.kommunenummer) tall.kommunenummer = csv;
  if (brreg) {
    for (const q of brreg) {
      if (!q.params) q.params = {};
      if (!q.params.kommunenummer) q.params.kommunenummer = csv;
    }
  }
  return true;
}

/**
 * If the question names an MR kommune, fill it into any BRREG query and the
 * Tall plan that did not already specify a kommunenummer. Mutates the passed
 * structures in place and returns the resolved kommune (or null).
 */
export function applyMrKommune(
  brreg: Array<{ params?: Record<string, string> }> | null,
  tall: { kommunenummer?: string } | null,
  text: string,
): MrKommune | null {
  const mr = resolveMrKommuneFromText(text);
  if (!mr) return null;
  if (tall && !tall.kommunenummer) tall.kommunenummer = mr.nummer;
  if (brreg) {
    for (const q of brreg) {
      if (!q.params) q.params = {};
      if (!q.params.kommunenummer) q.params.kommunenummer = mr.nummer;
    }
  }
  return mr;
}
