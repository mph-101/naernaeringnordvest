// Shared SSB (Statistisk sentralbyrå) API helper for the næringsbarometer.
// Posts json-stat2 queries to the open SSB PxWebApi and flattens the response
// into a list of cells, each carrying its dimension codes + value.
//
// SSB query gotchas baked in by callers (see barometer-refresh / detector):
//   - 08551/14830: NACE letter codes (00-99 = total) vs 14623: interval codes.
//   - 12937 hovedområde (letter) aggregation requires the `vs:NACE2007StrHoved`
//     valueset filter with EXPLICIT member codes (the `*` wildcard is rejected).
//   - 14623 returns 0 for the not-yet-published latest year — callers must _rens.

export interface SsbSelection {
  code: string;
  selection: { filter: string; values: string[] };
}

export interface SsbCell {
  dims: Record<string, string>;
  value: number | null;
}

export interface SsbResult {
  cells: SsbCell[];
  labels: Record<string, Record<string, string>>; // dimCode -> (valueCode -> label)
  updated: string | null;
}

const SSB_BASE = "https://data.ssb.no/api/v0/no/table";

// SSB's PxWebApi is periodically slow/unresponsive; Deno's fetch has no default
// timeout, so bound it so a single hung socket can't stall the caller (e.g. the
// barometer cron or an articles-chat hop) until the platform wall-clock kill.
const SSB_TIMEOUT_MS = 10_000;

export async function ssbFetch(
  tableId: string,
  query: SsbSelection[],
): Promise<SsbResult> {
  const res = await fetch(`${SSB_BASE}/${tableId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, response: { format: "json-stat2" } }),
    signal: AbortSignal.timeout(SSB_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SSB ${tableId} HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const d = await res.json();

  const dimIds: string[] = d.id;
  const sizes: number[] = d.size;
  const values: (number | null)[] = d.value;

  // Per dimension: position -> code, plus position labels for readability.
  const dimCodesByPos: string[][] = [];
  const labels: Record<string, Record<string, string>> = {};
  for (const dimId of dimIds) {
    const cat = d.dimension[dimId].category;
    const arr: string[] = [];
    for (const [code, pos] of Object.entries(cat.index as Record<string, number>)) {
      arr[pos] = code;
    }
    dimCodesByPos.push(arr);
    labels[dimId] = (cat.label as Record<string, string>) ?? {};
  }

  // Row-major strides for index -> per-dimension position decoding.
  const strides = sizes.map((_, i) =>
    sizes.slice(i + 1).reduce((a, b) => a * b, 1),
  );

  const cells: SsbCell[] = [];
  for (let i = 0; i < values.length; i++) {
    let rem = i;
    const dims: Record<string, string> = {};
    for (let dd = 0; dd < sizes.length; dd++) {
      const pos = Math.floor(rem / strides[dd]);
      rem = rem % strides[dd];
      dims[dimIds[dd]] = dimCodesByPos[dd][pos];
    }
    cells.push({ dims, value: values[i] });
  }

  return { cells, labels, updated: d.updated ?? null };
}

// Convenience selections.
export const item = (code: string, values: string[]): SsbSelection => ({
  code,
  selection: { filter: "item", values },
});
export const top = (code: string, n: number): SsbSelection => ({
  code,
  selection: { filter: "top", values: [String(n)] },
});
export const valueset = (
  code: string,
  valuesetId: string,
  values: string[],
): SsbSelection => ({
  code,
  selection: { filter: `vs:${valuesetId}`, values },
});

// NACE hovedområde (letter) members that are QUERYABLE for Møre og Romsdal in
// 12937 (validated against live SSB 2026-06-04). SSB returns HTTP 400 — not
// null — for a letter code that has no data for the region (e.g. A/K/O at
// fylkesnivå), so we must NOT request those. Callers should still tolerate
// per-year nulls and wrap the fetch in try/catch in case this set shifts.
export const NACE_HOVEDOMRADE = [
  "B", "C", "D", "E", "F", "G", "H", "I",
  "J", "L", "M", "N", "P", "Q", "R", "S",
];
