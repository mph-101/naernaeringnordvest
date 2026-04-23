// SSB Labor market data aggregator. Fetches unemployment, employment,
// vacancies, wages and sick leave from SSB's open PxWebApi (no auth needed).
// Cached in-memory for 6h per cold instance — SSB updates monthly/quarterly.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<string, { ts: number; payload: unknown }>();

// Map editorial_region slug -> list of SSB county codes (fylkesnummer 2024)
const REGION_TO_FYLKE: Record<string, string[]> = {
  nasjonal: [],
  "more-og-romsdal": ["15"],
  vestlandet: ["11", "46"], // Rogaland + Vestland
  "nord-norge": ["18", "55"], // Nordland + Troms+Finnmark (uses "55" if split, fallback)
  trondelag: ["50"],
  ostlandet: ["03", "30", "34", "38"], // Oslo, Viken, Innlandet, Vestfold og Telemark
  sorlandet: ["42"], // Agder
};

const ssbPost = async (tableId: string, body: unknown): Promise<any> => {
  try {
    const res = await fetch(`https://data.ssb.no/api/v0/no/table/${tableId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`SSB ${tableId} HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`SSB ${tableId} fetch failed:`, e);
    return null;
  }
};

// Parse SSB jsonstat2-like response: returns { value[], dimensions }
const parseSsb = (raw: any) => {
  if (!raw || !raw.dataset) return null;
  const ds = raw.dataset;
  return {
    values: ds.value as (number | null)[],
    dimensionIds: ds.dimension?.id as string[],
    dimension: ds.dimension,
  };
};

// Get the latest non-null value with its time label
const latestPoint = (parsed: ReturnType<typeof parseSsb>) => {
  if (!parsed) return null;
  const { values, dimension, dimensionIds } = parsed as any;
  const timeKey = dimensionIds.find((d: string) =>
    d.toLowerCase().includes("tid") || d.toLowerCase() === "tid"
  );
  if (!timeKey) return null;
  const timeDim = dimension[timeKey];
  const timeLabels: Record<string, string> = timeDim.category.label;
  const timeIndex: Record<string, number> = timeDim.category.index;
  const timeKeys = Object.keys(timeIndex).sort((a, b) => timeIndex[a] - timeIndex[b]);

  // sizes & strides
  const sizes = dimensionIds.map((d: string) => Object.keys(dimension[d].category.index).length);
  const strides = sizes.map((_: number, i: number) =>
    sizes.slice(i + 1).reduce((a: number, b: number) => a * b, 1)
  );
  const timeAxis = dimensionIds.indexOf(timeKey);

  // Walk time descending and find first non-null aggregated value
  for (let ti = timeKeys.length - 1; ti >= 0; ti--) {
    const tIdx = timeIndex[timeKeys[ti]];
    // sum across other dims (we expect content/region already aggregated to single)
    let sum = 0;
    let count = 0;
    const total = sizes.reduce((a: number, b: number) => a * b, 1);
    for (let i = 0; i < total; i++) {
      // decode i to indices
      let rem = i;
      let timeIdxAtI = 0;
      for (let d = 0; d < sizes.length; d++) {
        const idx = Math.floor(rem / strides[d]);
        rem = rem % strides[d];
        if (d === timeAxis) timeIdxAtI = idx;
      }
      if (timeIdxAtI === tIdx) {
        const v = values[i];
        if (v != null) {
          sum += v;
          count++;
        }
      }
    }
    if (count > 0) {
      return {
        value: sum / count, // average across remaining dims (regions)
        period: timeLabels[timeKeys[ti]],
      };
    }
  }
  return null;
};

// --- Arbeidsledighet (registrerte helt ledige), tabell 10540 (NAV via SSB)
// Fallback: 13760 (AKU)
async function fetchUnemployment(fylker: string[]) {
  const filter = fylker.length
    ? { filter: "vs:FylkerHist", values: fylker }
    : { filter: "all", values: ["0"] }; // 0 = hele landet
  const body = {
    query: [
      { code: "Region", selection: filter },
      { code: "ContentsCode", selection: { filter: "item", values: ["Arbeidsledige2"] } },
      { code: "Tid", selection: { filter: "top", values: ["3"] } },
    ],
    response: { format: "json-stat2" },
  };
  const raw = await ssbPost("10540", body);
  return latestPoint(parseSsb(raw));
}

// --- Sysselsetting (sysselsatte personer, 15-74), tabell 13536 (kvartalsvis)
async function fetchEmployment(fylker: string[]) {
  const filter = fylker.length
    ? { filter: "vs:FylkerHist", values: fylker }
    : { filter: "all", values: ["0"] };
  const body = {
    query: [
      { code: "Region", selection: filter },
      { code: "Kjonn", selection: { filter: "item", values: ["0"] } },
      { code: "Alder", selection: { filter: "item", values: ["15-74"] } },
      { code: "ContentsCode", selection: { filter: "item", values: ["Sysselsatte"] } },
      { code: "Tid", selection: { filter: "top", values: ["2"] } },
    ],
    response: { format: "json-stat2" },
  };
  const raw = await ssbPost("13536", body);
  return latestPoint(parseSsb(raw));
}

// --- Ledige stillinger (totalt antall), tabell 11414 (kvartalsvis)
async function fetchVacancies() {
  // SSB 11414 is national-only by næring; we just want total
  const body = {
    query: [
      { code: "NACE2007", selection: { filter: "item", values: ["00-99"] } },
      { code: "ContentsCode", selection: { filter: "item", values: ["LedigeStillinger"] } },
      { code: "Tid", selection: { filter: "top", values: ["2"] } },
    ],
    response: { format: "json-stat2" },
  };
  const raw = await ssbPost("11414", body);
  return latestPoint(parseSsb(raw));
}

// --- Lønn (gjennomsnittlig månedslønn, alle), tabell 11418
async function fetchWages() {
  const body = {
    query: [
      { code: "NACE2007", selection: { filter: "item", values: ["A-X"] } },
      { code: "Sektor", selection: { filter: "item", values: ["A"] } },
      { code: "Kjonn", selection: { filter: "item", values: ["0"] } },
      { code: "Yrke", selection: { filter: "item", values: ["00"] } },
      { code: "ContentsCode", selection: { filter: "item", values: ["MndLonnAlle"] } },
      { code: "Tid", selection: { filter: "top", values: ["2"] } },
    ],
    response: { format: "json-stat2" },
  };
  const raw = await ssbPost("11418", body);
  return latestPoint(parseSsb(raw));
}

// --- Sykefravær (sesongjustert prosent, legemeldt), tabell 12442
async function fetchSickLeave() {
  const body = {
    query: [
      { code: "Type", selection: { filter: "item", values: ["E"] } },
      { code: "ContentsCode", selection: { filter: "item", values: ["SesJustProsent"] } },
      { code: "Tid", selection: { filter: "top", values: ["2"] } },
    ],
    response: { format: "json-stat2" },
  };
  const raw = await ssbPost("12442", body);
  return latestPoint(parseSsb(raw));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let regionSlug = "nasjonal";
  try {
    const url = new URL(req.url);
    regionSlug = url.searchParams.get("region") || "nasjonal";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.region) regionSlug = String(body.region);
    }
  } catch { /* ignore */ }

  const fylker = REGION_TO_FYLKE[regionSlug] ?? [];
  const cacheKey = regionSlug;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return json(cached.payload);
  }

  try {
    const [unemployment, employment, vacancies, wages, sickLeave] = await Promise.all([
      fetchUnemployment(fylker),
      fetchEmployment(fylker),
      fetchVacancies(),
      fetchWages(),
      fetchSickLeave(),
    ]);

    const payload = {
      region: regionSlug,
      updated_at: new Date().toISOString(),
      unemployment, // % av arbeidsstyrken
      employment,   // antall sysselsatte (1000 personer)
      vacancies,    // antall ledige stillinger
      wages,        // kr/mnd
      sickLeave,    // %
    };

    cache.set(cacheKey, { ts: Date.now(), payload });
    return json(payload);
  } catch (e) {
    console.error("ssb-labor failed:", e);
    return json({ error: "Kunne ikke hente SSB-data" }, 500);
  }
});