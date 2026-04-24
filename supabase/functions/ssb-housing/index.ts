// Norwegian housing-market data aggregator (SSB).
// Sources:
//   - 07221: Boligprisindeks (kvartalsvis, brukte boliger), nasjonalt
//   - 10996: Igangsatte boliger (månedlig), nasjonalt
//   - 11597: Husholdningenes innenlandske lånegjeld K2 (månedlig, 12-mnd vekst %)
// 6-hour in-memory cache per cold instance. Region cuts only apply to 07221;
// 10996 and 11597 are national. The "region" parameter is forwarded so the
// frontend can display the user's region label, but other series remain national.

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

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { ts: number; payload: unknown }>();

const ssbPost = async (tableId: string, query: unknown): Promise<any> => {
  try {
    const res = await fetch(`https://data.ssb.no/api/v0/no/table/${tableId}`, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
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

// Walk dim table to find latest non-null value for a given ContentsCode.
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

// 07221: Boligprisindeks (2015=100), brukte boliger, alle boligtyper, hele landet.
// Returns latest index value + YoY change vs same quarter previous year.
async function fetchHousePriceIndex() {
  const raw = await ssbPost("07221", [
    { code: "Region", selection: { filter: "item", values: ["TOTAL"] } },
    { code: "Boligtype", selection: { filter: "item", values: ["00"] } },
    { code: "ContentsCode", selection: { filter: "item", values: ["Boligindeks"] } },
    { code: "Tid", selection: { filter: "top", values: ["5"] } },
  ]);
  if (!raw?.dimension) return { latest: null, yoy: null };

  // Build sorted (period, value) pairs across the time dimension.
  const dimIds: string[] = raw.id;
  const sizes: number[] = raw.size;
  const values: (number | null)[] = raw.value;
  const tdIdx = dimIds.indexOf("Tid");
  const timeCat = raw.dimension.Tid.category;
  const timeKeys = Object.keys(timeCat.index).sort(
    (a, b) => timeCat.index[a] - timeCat.index[b],
  );
  const strides = sizes.map((_, i) =>
    sizes.slice(i + 1).reduce((a, b) => a * b, 1),
  );
  const series: { key: string; label: string; value: number }[] = [];
  for (const tk of timeKeys) {
    const tIdx = timeCat.index[tk];
    const total = sizes.reduce((a, b) => a * b, 1);
    for (let i = 0; i < total; i++) {
      let rem = i;
      let matchTime = true;
      for (let d = 0; d < sizes.length; d++) {
        const idx = Math.floor(rem / strides[d]);
        rem = rem % strides[d];
        if (d === tdIdx && idx !== tIdx) matchTime = false;
      }
      if (matchTime && values[i] != null) {
        series.push({ key: tk, label: timeCat.label[tk], value: values[i] as number });
        break;
      }
    }
  }
  if (series.length === 0) return { latest: null, yoy: null };
  const latest = series[series.length - 1];
  // YoY: 4 quarters back
  const prior = series.length >= 5 ? series[series.length - 5] : null;
  const yoy = prior
    ? { value: ((latest.value - prior.value) / prior.value) * 100, period: latest.label }
    : null;
  return {
    latest: { value: latest.value, period: latest.label },
    yoy,
  };
}

// 10996: Igangsatte boliger, nasjonalt, månedlig (ujustert)
async function fetchHousingStarts() {
  const raw = await ssbPost("10996", [
    { code: "ContentsCode", selection: { filter: "item", values: ["BoligIgang"] } },
    { code: "Tid", selection: { filter: "top", values: ["3"] } },
  ]);
  return pickLatest(raw, "BoligIgang");
}

// 11597: Husholdningenes innenlandske lånegjeld (K2), 12-måneders vekst (%)
async function fetchHouseholdDebt() {
  const raw = await ssbPost("11597", [
    { code: "Valuta", selection: { filter: "item", values: ["00"] } },
    { code: "Lantaker3", selection: { filter: "item", values: ["05"] } },
    { code: "ContentsCode", selection: { filter: "item", values: ["Aarstransprosent"] } },
    { code: "Tid", selection: { filter: "top", values: ["3"] } },
  ]);
  return pickLatest(raw, "Aarstransprosent");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
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
  } catch {
    /* ignore */
  }

  const cacheKey = "national";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return json({ ...(cached.payload as object), region: regionSlug });
  }

  try {
    const [priceIndex, housingStarts, householdDebt] = await Promise.all([
      fetchHousePriceIndex(),
      fetchHousingStarts(),
      fetchHouseholdDebt(),
    ]);

    const payload = {
      region: regionSlug,
      scope: "national",
      updated_at: new Date().toISOString(),
      priceIndex: priceIndex.latest,        // index value, 2015=100
      priceIndexYoy: priceIndex.yoy,        // % year-over-year
      housingStarts,                        // antall boliger igangsatt (måned)
      householdDebt,                        // K2 12-måneders vekst, %
    };

    cache.set(cacheKey, { ts: Date.now(), payload });
    return json(payload);
  } catch (e) {
    console.error("ssb-housing failed:", e);
    return json({ error: "Kunne ikke hente boligmarkedsdata" }, 500);
  }
});