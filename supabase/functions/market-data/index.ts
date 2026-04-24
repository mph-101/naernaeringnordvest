// Public market data aggregator. Fetches Norwegian electricity spot price,
// Brent crude oil, NOK FX rates, Norges Bank policy rate and BTC price from
// free open APIs. Cached in-memory for 5 minutes per instance to limit
// upstream load. No authentication required (verify_jwt is off via default).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// 5 minute cache (per cold instance)
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { ts: number; payload: unknown } | null = null;

const safeFetch = async (url: string, init?: RequestInit) => {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "naer-naering/1.0 (market-ticker)",
        Accept: "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("safeFetch failed:", url, e);
    return null;
  }
};

// --- Strøm: hvakosterstrommen.no, gratis, ingen nøkkel ---
// https://www.hvakosterstrommen.no/strompris-api
async function fetchPower() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const zones = ["NO1", "NO2", "NO3", "NO4", "NO5"] as const;
  const currentHour = now.getUTCHours(); // API uses local Europe/Oslo, but UTC works as approx

  const results = await Promise.all(
    zones.map(async (z) => {
      const url =
        `https://www.hvakosterstrommen.no/api/v1/prices/${yyyy}/${mm}-${dd}_${z}.json`;
      const data = await safeFetch(url);
      if (!Array.isArray(data) || data.length === 0) return null;
      // Find the entry covering "now"
      const hour = data.find((d: any) => {
        const start = new Date(d.time_start).getTime();
        const end = new Date(d.time_end).getTime();
        return Date.now() >= start && Date.now() < end;
      }) ?? data[Math.min(currentHour, data.length - 1)];
      if (!hour) return null;
      return {
        zone: z,
        // NOK per kWh (excluding VAT/grid). Convert to øre for display.
        ore_per_kwh: Math.round(Number(hour.NOK_per_kWh) * 100 * 10) / 10,
      };
    }),
  );

  return results.filter(Boolean);
}

// --- Valuta: Norges Bank åpne data ---
// https://data.norges-bank.no/api/data/EXR/B.{CCY}.NOK.SP?lastNObservations=1&format=sdmx-json
async function fetchFx() {
  const codes = ["USD", "EUR", "SEK"];
  const results = await Promise.all(
    codes.map(async (code) => {
      const url =
        `https://data.norges-bank.no/api/data/EXR/B.${code}.NOK.SP?lastNObservations=1&format=sdmx-json&locale=no`;
      const data: any = await safeFetch(url);
      try {
        const series = data?.data?.dataSets?.[0]?.series;
        const firstKey = series && Object.keys(series)[0];
        const obs = firstKey && series[firstKey]?.observations;
        const obsKey = obs && Object.keys(obs)[0];
        const value = obs && obsKey != null ? Number(obs[obsKey][0]) : null;
        // SEK is quoted per 100 in Norges Bank's API
        const unitMult = code === "SEK" ? 1 / 100 : 1;
        if (value == null || isNaN(value)) return null;
        return { code, nok: Math.round(value * unitMult * 10000) / 10000 };
      } catch {
        return null;
      }
    }),
  );
  return results.filter(Boolean);
}

// --- Styringsrente: Norges Bank IR-flow ---
async function fetchPolicyRate() {
  const url =
    "https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?lastNObservations=1&format=sdmx-json&locale=no";
  const data: any = await safeFetch(url);
  try {
    const series = data?.data?.dataSets?.[0]?.series;
    const firstKey = series && Object.keys(series)[0];
    const obs = firstKey && series[firstKey]?.observations;
    const obsKey = obs && Object.keys(obs)[0];
    const value = obs && obsKey != null ? Number(obs[obsKey][0]) : null;
    if (value == null || isNaN(value)) return null;
    return { rate: Math.round(value * 100) / 100 };
  } catch {
    return null;
  }
}

// --- Olje (Brent) i USD via Stooq CSV (gratis, ingen nøkkel) ---
async function fetchBrent() {
  try {
    const res = await fetch("https://stooq.com/q/l/?s=cb.f&f=sd2t2ohlcv&h&e=csv", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const csv = await res.text();
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return null;
    const headers = lines[0].split(",");
    const cols = lines[1].split(",");
    const closeIdx = headers.indexOf("Close");
    const value = closeIdx >= 0 ? Number(cols[closeIdx]) : NaN;
    if (!isFinite(value)) return null;
    return { usd: Math.round(value * 100) / 100 };
  } catch (e) {
    console.error("brent fetch failed", e);
    return null;
  }
}

// --- BTC i NOK via CoinGecko (gratis, ingen nøkkel) ---
async function fetchBtc() {
  const data: any = await safeFetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=nok&include_24hr_change=true",
  );
  const nok = data?.bitcoin?.nok;
  const change = data?.bitcoin?.nok_24h_change;
  if (typeof nok !== "number") return null;
  return {
    nok: Math.round(nok),
    change_24h: typeof change === "number" ? Math.round(change * 100) / 100 : null,
  };
}

// --- KPI (inflasjon) via SSB tabell 03013, 12-mnd endring totalindeks ---
async function fetchCpi() {
  try {
    const res = await fetch("https://data.ssb.no/api/v0/no/table/03013", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: [
          { code: "Konsumgrp", selection: { filter: "item", values: ["TOTAL"] } },
          {
            code: "ContentsCode",
            selection: { filter: "item", values: ["Tolvmanedersendring"] },
          },
          { code: "Tid", selection: { filter: "top", values: ["1"] } },
        ],
        response: { format: "json-stat2" },
      }),
    });
    if (!res.ok) return null;
    const raw: any = await res.json();
    const values: (number | null)[] = raw?.value || [];
    const timeCat = raw?.dimension?.Tid?.category;
    if (!values.length || !timeCat) return null;
    // Last non-null value
    let lastIdx = -1;
    for (let i = values.length - 1; i >= 0; i--) {
      if (values[i] != null) { lastIdx = i; break; }
    }
    if (lastIdx < 0) return null;
    const timeKeys = Object.keys(timeCat.index).sort(
      (a, b) => timeCat.index[a] - timeCat.index[b],
    );
    // The time index of lastIdx within Tid dimension — single content/group, so
    // the index in `value` corresponds directly to the time order.
    const timeKey = timeKeys[lastIdx] ?? timeKeys[timeKeys.length - 1];
    const period = timeCat.label?.[timeKey] ?? timeKey;
    return {
      pct: Math.round((values[lastIdx] as number) * 10) / 10,
      period,
    };
  } catch (e) {
    console.error("cpi fetch failed", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Serve from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return json({ ...cache.payload, cached: true });
  }

  const [power, fx, policyRate, brent, btc, cpi] = await Promise.all([
    fetchPower(),
    fetchFx(),
    fetchPolicyRate(),
    fetchBrent(),
    fetchBtc(),
    fetchCpi(),
  ]);

  const payload = {
    updated_at: new Date().toISOString(),
    power,
    fx,
    policy_rate: policyRate,
    brent,
    btc,
    cpi,
    cached: false,
  };

  cache = { ts: Date.now(), payload };
  return json(payload);
});