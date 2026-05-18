// Norwegian labor-market data aggregator.
// Sources:
//   - SSB AKU (table 13760): unemployment rate + employed (national, monthly)
//   - SSB sick leave (table 12442): seasonally adjusted % (national, quarterly)
//   - SSB wages (table 11418): average monthly wage (national, yearly)
//   - NAV labor-force snapshot via SSB AKU (Arbeidsstyrken from 13760)
// All series are NATIONAL ("hele landet"). Regional cuts are not exposed
// through these tables on a fresh monthly basis, so we present the same
// national figures regardless of region selection (the regional UI selector
// is kept for future extension). 6-hour in-memory cache per cold instance.

import { corsHeaders } from "../_shared/cors.ts";

const json = (body: unknown, status = 200, req?: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { ts: number; payload: unknown }>();

const ssbPost = async (tableId: string, query: unknown): Promise<any> => {
  try {
    const res = await fetch(`https://data.ssb.no/api/v0/no/table/${tableId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, response: { format: "json-stat2" } }),
    });
    if (!res.ok) {
      console.warn(`SSB ${tableId} HTTP ${res.status}: ${await res.text()}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`SSB ${tableId} fetch failed:`, e);
    return null;
  }
};

// Pick the latest non-null value for a given ContentsCode key.
// jsonstat2 stores values in row-major order across dimensions — we walk
// time descending and inspect the slice that matches the wanted contents key.
const pickLatest = (raw: any, contentsKey: string) => {
  if (!raw?.dimension) return null;
  const dimIds: string[] = raw.id;
  const sizes: number[] = raw.size;
  const values: (number | null)[] = raw.value;
  const tdIdx = dimIds.indexOf("Tid");
  const ccIdx = dimIds.indexOf("ContentsCode");
  if (tdIdx < 0) return null;

  const timeCat = raw.dimension.Tid.category;
  const timeKeys = Object.keys(timeCat.index).sort(
    (a, b) => timeCat.index[a] - timeCat.index[b],
  );
  const timeLabels: Record<string, string> = timeCat.label;

  const ccCat = ccIdx >= 0 ? raw.dimension.ContentsCode.category : null;
  const wantedCcIdx = ccCat ? ccCat.index[contentsKey] : 0;

  const strides = sizes.map((_, i) =>
    sizes.slice(i + 1).reduce((a, b) => a * b, 1),
  );

  for (let ti = timeKeys.length - 1; ti >= 0; ti--) {
    const timeIndex = timeCat.index[timeKeys[ti]];
    // walk all combinations of OTHER dimensions to find non-null
    const total = sizes.reduce((a, b) => a * b, 1);
    for (let i = 0; i < total; i++) {
      let rem = i;
      let matchTime = true;
      let matchCc = ccIdx < 0;
      for (let d = 0; d < sizes.length; d++) {
        const idx = Math.floor(rem / strides[d]);
        rem = rem % strides[d];
        if (d === tdIdx && idx !== timeIndex) matchTime = false;
        if (d === ccIdx && idx === wantedCcIdx) matchCc = true;
      }
      if (matchTime && matchCc && values[i] != null) {
        return { value: values[i] as number, period: timeLabels[timeKeys[ti]] };
      }
    }
  }
  return null;
};

// 13760: AKU sesongjustert (national) — unemployment % + employed (1000 pers) + workforce
async function fetchAku() {
  return ssbPost("13760", [
    { code: "Justering", selection: { filter: "item", values: ["S"] } },
    {
      code: "ContentsCode",
      selection: {
        filter: "item",
        values: ["ArbledProsArbstyrk", "Sysselsatte", "Arbeidsstyrken"],
      },
    },
    { code: "Tid", selection: { filter: "top", values: ["3"] } },
  ]);
}

// 12442: sykefravær sesongjustert
async function fetchSickLeave() {
  return ssbPost("12442", [
    { code: "Kjonn", selection: { filter: "item", values: ["0"] } },
    { code: "NACE2007", selection: { filter: "item", values: ["00-99"] } },
    { code: "Sektor", selection: { filter: "item", values: ["ALLE"] } },
    {
      code: "ContentsCode",
      selection: { filter: "item", values: ["SykefravProsent"] },
    },
    { code: "Tid", selection: { filter: "top", values: ["2"] } },
  ]);
}

// 11418: månedslønn alle ansatte
async function fetchWages() {
  return ssbPost("11418", [
    { code: "MaaleMetode", selection: { filter: "item", values: ["02"] } },
    { code: "Yrke", selection: { filter: "item", values: ["0-9"] } },
    { code: "Sektor", selection: { filter: "item", values: ["ALLE"] } },
    { code: "Kjonn", selection: { filter: "item", values: ["0"] } },
    { code: "AvtaltVanlig", selection: { filter: "item", values: ["0"] } },
    {
      code: "ContentsCode",
      selection: { filter: "item", values: ["Manedslonn"] },
    },
    { code: "Tid", selection: { filter: "top", values: ["2"] } },
  ]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, req);
  }

  let regionSlug = "nasjonal";
  try {
    const url = new URL(req.url);
    regionSlug = url.searchParams.get("region") || "nasjonal";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.region) regionSlug = String(body.region);
    }
  } catch {
    /* ignore */
  }

  // National-only data — same payload for every region for now.
  const cacheKey = "national";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return json({ ...(cached.payload as object), region: regionSlug }, 200, req);
  }

  try {
    const [aku, sickLeaveRaw, wagesRaw] = await Promise.all([
      fetchAku(),
      fetchSickLeave(),
      fetchWages(),
    ]);

    const unemployment = pickLatest(aku, "ArbledProsArbstyrk");
    const employmentK = pickLatest(aku, "Sysselsatte"); // 1000 personer
    const workforceK = pickLatest(aku, "Arbeidsstyrken"); // 1000 personer
    const sickLeave = pickLatest(sickLeaveRaw, "SykefravProsent");
    const wages = pickLatest(wagesRaw, "Manedslonn");

    // Derive NAV-equivalent: estimated unemployed persons (1000 pers).
    const navEquivalent =
      unemployment && workforceK
        ? {
            value: Math.round((unemployment.value / 100) * workforceK.value),
            period: unemployment.period,
          }
        : null;

    const payload = {
      region: regionSlug,
      scope: "national",
      updated_at: new Date().toISOString(),
      unemployment, // % of workforce
      employment: employmentK, // 1000 persons
      navUnemployed: navEquivalent, // 1000 persons (estimated)
      wages, // kr/month
      sickLeave, // %
    };

    cache.set(cacheKey, { ts: Date.now(), payload });
    return json(payload, 200, req);
  } catch (e) {
    console.error("ssb-labor failed:", e);
    return json({ error: "Kunne ikke hente arbeidsmarkedsdata" }, 500, req);
  }
});
