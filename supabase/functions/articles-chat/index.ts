// Conversational AI grounded in the published article archive.
// 1. Embeds the latest user question
// 2. Pulls top-N matching published articles via pgvector RPC
// 3. Streams an answer that cites sources inline as [1], [2], ...
// 4. Sends the resolved sources back as a custom JSON line at the end
//    of the SSE stream so the client can render clickable links.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeaders } from "../_shared/cors.ts";
import { aiChatCompletion, aiFetch } from "../_shared/ai-client.ts";
import { collectFinancialTargets } from "./financial-targets.ts";
import { PLANNER_SYSTEM_PROMPT, parsePlannerResponse, decideRankingRoute, type PlannerResult } from "./planner.ts";
import { applyMrKommune, applyRegionScope, MR_KOMMUNE_NUMBERS, kommuneNavnByNummer } from "./mr-kommuner.ts";

const CHAT_MODEL = "google/gemini-3-flash-preview";
const QUERY_REWRITE_MODEL = "google/gemini-2.5-flash-lite";
const MATCH_COUNT = 6;
const TRUSTED_MATCH_COUNT = 4;
const BRREG_BASE = "https://data.brreg.no";
const BRREG_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const BRREG_CACHE_MAX = 500;
const brregCache = new Map<string, { at: number; value: { label: string; total: number; companies: any[] } }>();
const tallCache = new Map<string, { at: number; value: any }>();
const TALL_TTL_MS = 1000 * 60 * 60 * 6;
// Regnskapsregisteret (annual accounts) — enriches NAMED companies with key
// financial figures. Updated once a year per company, so a long TTL is fine.
const REGNSKAP_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const regnskapCache = new Map<string, { at: number; value: CompanyFinancials | null }>();
// Cap how many companies we pull accounts for per request — each is one extra
// upstream call, and the model only needs a handful to answer well.
const MAX_FINANCIAL_FETCH = 3;

interface CompanyFinancials {
  aar: string; // closing year, e.g. "2023"
  periode: string; // "2023-01-01 – 2023-12-31"
  valuta: string;
  driftsinntekter: number | null; // operating revenue
  driftsresultat: number | null; // operating result
  aarsresultat: number | null; // net result for the year
  egenkapital: number | null; // total equity
  sumEiendeler: number | null; // total assets
}

function toNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Single LLM call that plans everything Spør needs from the question: archive
 * search terms, any BRREG (enhetsregisteret) lookups, and a Tall-statistics
 * plan. Replaces three separate round-trips (search-term extraction + BRREG
 * plan + Tall plan). Degrades to a plain archive search on any failure.
 */
async function planQuery(question: string): Promise<PlannerResult> {
  try {
    const json = await aiChatCompletion({
      model: QUERY_REWRITE_MODEL,
      messages: [
        { role: "system", content: PLANNER_SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
    });
    const content = (json?.choices?.[0]?.message?.content as string) || "";
    return parsePlannerResponse(content, question);
  } catch (e) {
    console.error("planQuery failed:", e);
    return { searchTerms: question, brreg: null, tall: null };
  }
}

async function fetchBrreg(queries: Array<{ label: string; params: Record<string, string> }>) {
  return Promise.all(
    queries.map(async (q) => {
      const params = new URLSearchParams();
      if (!q.params.organisasjonsform) params.set("organisasjonsform", "AS,ASA");
      for (const [k, v] of Object.entries(q.params)) {
        if (v) params.set(k, String(v));
      }
      if (!params.has("size")) params.set("size", "5");
      const cacheKey = params.toString();
      const cached = brregCache.get(cacheKey);
      if (cached && Date.now() - cached.at < BRREG_TTL_MS) {
        return { ...cached.value, label: q.label, cached: true, queryParams: q.params };
      }
      try {
        const res = await fetch(`${BRREG_BASE}/enhetsregisteret/api/enheter?${params}`, {
          headers: { Accept: "application/json" },
        });
        const data = await res.json();
        const enheter = data?._embedded?.enheter || [];
        const result = {
          label: q.label,
          total: data?.page?.totalElements || 0,
          companies: enheter.slice(0, 10).map((e: any) => ({
            navn: e.navn,
            orgnr: e.organisasjonsnummer,
            ansatte: e.antallAnsatte || 0,
            kommune: e.forretningsadresse?.kommune || "",
            bransje: e.naeringskode1?.beskrivelse || "",
            stiftet: e.stiftelsesdato || "",
            konkurs: e.konkurs || false,
          })),
        };
        brregCache.set(cacheKey, { at: Date.now(), value: result });
        if (brregCache.size > BRREG_CACHE_MAX) {
          // Evict oldest entry
          const oldestKey = brregCache.keys().next().value;
          if (oldestKey) brregCache.delete(oldestKey);
        }
        return { ...result, queryParams: q.params };
      } catch {
        return { label: q.label, total: 0, companies: [], queryParams: q.params };
      }
    }),
  );
}

/**
 * Look up the most recent annual accounts for a company in Regnskapsregisteret
 * and reduce them to the few key figures a journalist actually quotes. Returns
 * `null` when the company files no accounts (very small AS, newly founded) or
 * the lookup fails — callers treat that as "no financial data available".
 */
async function fetchRegnskap(orgnr: string): Promise<CompanyFinancials | null> {
  const cached = regnskapCache.get(orgnr);
  if (cached && Date.now() - cached.at < REGNSKAP_TTL_MS) return cached.value;
  try {
    const res = await fetch(`${BRREG_BASE}/regnskapsregisteret/regnskap/${orgnr}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      regnskapCache.set(orgnr, { at: Date.now(), value: null });
      return null;
    }
    const data = await res.json();
    const items: any[] = Array.isArray(data) ? data : [];
    if (!items.length) {
      regnskapCache.set(orgnr, { at: Date.now(), value: null });
      return null;
    }
    // Pick the latest filed period (the API does not guarantee ordering).
    items.sort((a, b) =>
      String(b?.regnskapsperiode?.tilDato || "").localeCompare(String(a?.regnskapsperiode?.tilDato || "")),
    );
    const latest = items[0];
    const resultat = latest?.resultatregnskapResultat || {};
    const drift = resultat?.driftsresultat || {};
    const fraDato = latest?.regnskapsperiode?.fraDato || "";
    const tilDato = latest?.regnskapsperiode?.tilDato || "";
    const value: CompanyFinancials = {
      aar: tilDato ? tilDato.slice(0, 4) : "",
      periode: fraDato && tilDato ? `${fraDato} – ${tilDato}` : tilDato || "",
      valuta: latest?.valuta || "NOK",
      driftsinntekter: toNum(drift?.driftsinntekter?.sumDriftsinntekter),
      driftsresultat: toNum(drift?.driftsresultat),
      aarsresultat: toNum(resultat?.aarsresultat),
      egenkapital: toNum(latest?.egenkapitalGjeld?.egenkapital?.sumEgenkapital),
      sumEiendeler: toNum(latest?.eiendeler?.sumEiendeler),
    };
    regnskapCache.set(orgnr, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.error(`fetchRegnskap ${orgnr} failed:`, e);
    return null;
  }
}

/**
 * Resolve a single company by org.nr from Enhetsregisteret. Used when the user
 * pastes an org.nr directly so we can show the company card alongside its
 * accounts even if it never surfaced in a name/industry search.
 */
async function fetchEnhet(orgnr: string): Promise<any | null> {
  try {
    const res = await fetch(`${BRREG_BASE}/enhetsregisteret/api/enheter/${orgnr}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const e = await res.json();
    if (!e?.organisasjonsnummer) return null;
    return {
      navn: e.navn,
      orgnr: e.organisasjonsnummer,
      ansatte: e.antallAnsatte || 0,
      kommune: e.forretningsadresse?.kommune || "",
      bransje: e.naeringskode1?.beskrivelse || "",
      stiftet: e.stiftelsesdato || "",
      konkurs: e.konkurs || false,
    };
  } catch (e) {
    console.error(`fetchEnhet ${orgnr} failed:`, e);
    return null;
  }
}

async function fetchTallProxy(action: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const cacheKey = qs;
  const cached = tallCache.get(cacheKey);
  if (cached && Date.now() - cached.at < TALL_TTL_MS) return cached.value;
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/brreg-proxy?${qs}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") || ""}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    tallCache.set(cacheKey, { at: Date.now(), value: data });
    if (tallCache.size > 200) {
      const k = tallCache.keys().next().value;
      if (k) tallCache.delete(k);
    }
    return data;
  } catch (e) {
    console.error(`fetchTallProxy ${action} failed:`, e);
    return null;
  }
}

async function fetchSsb(fn: "ssb-labor" | "ssb-housing"): Promise<any> {
  const cacheKey = fn;
  const cached = tallCache.get(cacheKey);
  if (cached && Date.now() - cached.at < TALL_TTL_MS) return cached.value;
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const data = await res.json();
    tallCache.set(cacheKey, { at: Date.now(), value: data });
    return data;
  } catch (e) {
    console.error(`fetchSsb ${fn} failed:`, e);
    return null;
  }
}

function formatTallBlock(tall: {
  establishments?: any;
  bankruptcies?: any;
  labor?: any;
  housing?: any;
  days?: number;
  kommunenummer?: string;
}): string {
  const parts: string[] = [];
  const geo = !tall.kommunenummer
    ? " (hele landet)"
    : tall.kommunenummer.includes(",")
      ? " (Møre og Romsdal)"
      : ` (kommune ${tall.kommunenummer})`;
  if (tall.establishments?.companies?.length) {
    const list = tall.establishments.companies.slice(0, 10).map((c: any) =>
      `   - ${c.navn} (org.nr ${c.orgnr}) — stiftet ${c.stiftelsesdato || "?"}, ${c.kommune || "?"}${c.naeringsbeskriv ? `, ${c.naeringsbeskriv}` : ""}`,
    ).join("\n");
    parts.push(`• Nyetableringer siste ${tall.days || 90} dager${geo} — ${tall.establishments.total || 0} totalt:\n${list}`);
  }
  if (tall.bankruptcies?.companies?.length) {
    const list = tall.bankruptcies.companies.slice(0, 10).map((c: any) =>
      `   - ${c.navn} (org.nr ${c.orgnr}) — konkurs ${c.registreringsdato || "?"}, ${c.kommune || "?"}${c.naeringsbeskriv ? `, ${c.naeringsbeskriv}` : ""}, ${c.antallAnsatte || 0} ansatte`,
    ).join("\n");
    parts.push(`• Konkurser siste ${tall.days || 90} dager${geo} — ${tall.bankruptcies.total || 0} totalt:\n${list}`);
  }
  if (tall.labor) {
    const l = tall.labor;
    const bits: string[] = [];
    if (l.unemployment) bits.push(`Arbeidsledighet (AKU): ${l.unemployment.value}% (${l.unemployment.period})`);
    if (l.employed) bits.push(`Sysselsatte: ${l.employed.value?.toLocaleString?.("nb-NO") || l.employed.value} (${l.employed.period})`);
    if (l.laborForce) bits.push(`Arbeidsstyrken: ${l.laborForce.value?.toLocaleString?.("nb-NO") || l.laborForce.value} (${l.laborForce.period})`);
    if (l.sickLeave) bits.push(`Sykefravær: ${l.sickLeave.value}% (${l.sickLeave.period})`);
    if (l.wage) bits.push(`Gjennomsnittlig månedslønn: ${l.wage.value?.toLocaleString?.("nb-NO") || l.wage.value} kr (${l.wage.period})`);
    if (bits.length) parts.push(`• Arbeidsmarked (SSB, nasjonalt):\n   - ${bits.join("\n   - ")}`);
  }
  if (tall.housing) {
    const h = tall.housing;
    const bits: string[] = [];
    if (h.priceIndex) bits.push(`Boligprisindeks: ${h.priceIndex.value} (${h.priceIndex.period})`);
    if (h.priceChange) bits.push(`Prisendring: ${h.priceChange.value}% (${h.priceChange.period})`);
    if (h.startedDwellings) bits.push(`Igangsatte boliger: ${h.startedDwellings.value?.toLocaleString?.("nb-NO") || h.startedDwellings.value} (${h.startedDwellings.period})`);
    if (h.householdDebt) bits.push(`Husholdningenes lånegjeld (12-mnd vekst): ${h.householdDebt.value}% (${h.householdDebt.period})`);
    if (bits.length) parts.push(`• Boligmarked (SSB):\n   - ${bits.join("\n   - ")}`);
  }
  return parts.join("\n\n");
}

/**
 * Largest employers from our own database (mr_companies, refreshed weekly from
 * Brønnøysund). Returns up to 10, shaped like brreg-proxy `top` so the ranking
 * formatting is identical. Empty array on cold start / error so the caller can
 * fall back to a live BRREG lookup.
 */
async function fetchLocalTopEmployers(
  supabase: ReturnType<typeof createClient>,
  kommunenummer: string | null,
): Promise<any[]> {
  try {
    let q = supabase
      .from("mr_companies")
      .select("orgnr, navn, kommunenummer, antall_ansatte, naeringsbeskriv")
      .order("antall_ansatte", { ascending: false })
      .limit(10);
    if (kommunenummer) q = q.eq("kommunenummer", kommunenummer);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map((r: any) => ({
      navn: r.navn,
      orgnr: r.orgnr,
      antallAnsatte: r.antall_ansatte,
      kommune: kommuneNavnByNummer(r.kommunenummer) || r.kommunenummer || "",
      naeringsbeskriv: r.naeringsbeskriv || "",
    }));
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages mangler" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing required env vars");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Use the most recent user message as the search query
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
    const queryText: string = lastUser?.content?.slice(0, 1500) || "";

    let sources: Array<{
      n: number;
      id: string;
      title: string;
      excerpt: string;
      author: string;
      published_at: string | null;
      rank: number;
    }> = [];
    let trustedSources: Array<{
      n: number;
      source_name: string;
      source_type: string;
      title: string | null;
      content: string;
      source_url: string | null;
      published_at: string | null;
    }> = [];
    let contextBlock = "";
    let trustedBlock = "";
    let brregBlock = "";
    let brregResults: any[] = [];
    let tallBlock = "";
    let tallResults: any = null;
    let rankingBlock = "";
    let rankingInstruction = "";
    // Declared out here so the financial-enrichment block below can read it.
    // (It used to be block-scoped inside the retrieval try, which made the
    // enrichment block throw ReferenceError and silently fetch no accounts.)
    let brregPlan: Array<{ label: string; params: Record<string, string>; financials?: boolean }> | null = null;

    if (queryText.trim().length > 2) {
      try {
        const plan = await planQuery(queryText);
        const searchTerms = plan.searchTerms;
        brregPlan = plan.brreg;
        const tallPlan = plan.tall;
        // Deterministic Møre og Romsdal kommune-targeting: full 27-kommune
        // coverage with correct current codes (incl. Ålesund 1508). Fills in the
        // kommunenummer the planner was told to leave blank for MR places.
        const mr = applyMrKommune(brregPlan, tallPlan, queryText);
        // No specific kommune, but the question is region-relative ("lokale",
        // "i regionen", "på Nordvestlandet") → scope to all of Møre og Romsdal.
        const regionScoped = !mr && applyRegionScope(brregPlan, tallPlan, queryText);
        console.log(
          "articles-chat: planner =",
          JSON.stringify({ searchTerms, brreg: brregPlan?.length ?? 0, tall: !!tallPlan, mr: mr?.navn ?? null, region: regionScoped }),
        );

        const [
          { data: matches, error: matchErr },
          { data: trusted, error: trustedErr },
        ] = await Promise.all([
          supabase.rpc("search_articles", { query_text: searchTerms, match_count: MATCH_COUNT }),
          supabase.rpc("search_trusted_sources", { query_text: searchTerms, match_count: TRUSTED_MATCH_COUNT }),
        ]);
        if (matchErr) console.error("search_articles error:", matchErr);
        if (trustedErr) console.error("search_trusted_sources error:", trustedErr);

        if (brregPlan && brregPlan.length) {
          brregResults = await fetchBrreg(brregPlan);
          brregBlock = brregResults
            .map((r) => {
              if (!r.companies.length) return `• ${r.label}: ingen treff`;
              const rows = r.companies
                .map(
                  (c: any) =>
                    `   - ${c.navn} (org.nr ${c.orgnr}) — ${c.ansatte} ansatte, ${c.kommune}${c.bransje ? `, ${c.bransje}` : ""}${c.konkurs ? " [KONKURS]" : ""}${c.stiftet ? `, stiftet ${c.stiftet}` : ""}`,
                )
                .join("\n");
              return `• ${r.label} (totalt ${r.total} treff):\n${rows}`;
            })
            .join("\n\n");
        }

        if (tallPlan) {
          const days = tallPlan.days || 90;
          const tilDate = new Date().toISOString().slice(0, 10);
          const fraDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
          const geoParams: Record<string, string> = { fra: fraDate, til: tilDate };
          if (tallPlan.kommunenummer) geoParams.kommune = tallPlan.kommunenummer;

          const [estab, bank, labor, housing] = await Promise.all([
            tallPlan.establishments ? fetchTallProxy("new_establishments", geoParams) : Promise.resolve(null),
            tallPlan.bankruptcies ? fetchTallProxy("bankruptcies", geoParams) : Promise.resolve(null),
            tallPlan.labor ? fetchSsb("ssb-labor") : Promise.resolve(null),
            tallPlan.housing ? fetchSsb("ssb-housing") : Promise.resolve(null),
          ]);
          tallResults = {
            establishments: estab,
            bankruptcies: bank,
            labor,
            housing,
            days,
            kommunenummer: tallPlan.kommunenummer || "",
          };
          tallBlock = formatTallBlock(tallResults);
        }

        // Ranking / superlative questions ("largest companies in the region").
        // Ground them honestly: an authoritative register ranking where one
        // exists (by employees over MR/kommune), otherwise an explicitly
        // non-exhaustive archive answer that offers the answerable variant.
        // See docs/spor-populasjonssvar-design.md.
        const rankingRoute = decideRankingRoute(plan.ranking);
        if (rankingRoute === "top") {
          const byKommune = plan.ranking!.omfang === "kommune" && mr;
          const geo = byKommune ? mr!.navn : "Møre og Romsdal";
          // Rank from our own database (mr_companies, refreshed weekly). Fall
          // back to live BRREG on cold start / empty table so it always answers.
          let companies = await fetchLocalTopEmployers(supabase, byKommune ? mr!.nummer : null);
          if (!companies.length) {
            const kommune = byKommune ? mr!.nummer : MR_KOMMUNE_NUMBERS.join(",");
            const top = await fetchTallProxy("top", { kommune, sort: "antallAnsatte", order: "desc", size: "10" });
            companies = Array.isArray(top?.companies) ? top.companies : [];
          }
          if (companies.length) {
            rankingBlock = companies
              .slice(0, 10)
              .map(
                (c: any, i: number) =>
                  `${i + 1}. ${c.navn} (org.nr ${c.orgnr}) — ${c.antallAnsatte} ansatte, ${c.kommune}${c.naeringsbeskriv ? `, ${c.naeringsbeskriv}` : ""}`,
              )
              .join("\n");
            rankingInstruction = `Dette er et RANGERINGSSPØRSMÅL. Lista under RANGERING er de største selskapene i ${geo} etter ANTALL ANSATTE (kilde: Brønnøysund). Svar med denne, og si tydelig at den er etter antall ansatte — ikke omsetning. Ikke antyd at den er etter omsetning.`;
          }
        } else if (rankingRoute === "articles") {
          const metricTxt = plan.ranking!.metric === "omsetning" ? "omsetning" : "dette";
          rankingInstruction = `Dette er et RANGERINGSSPØRSMÅL som IKKE kan rangeres uttømmende fra registrene (en rangering etter ${metricTxt} for hele regionen finnes ikke som ett oppslag). Hvis du rangerer ut fra artiklene, LED svaret med at det kun gjelder selskaper Nær Næring har omtalt — ikke en fullstendig oversikt. Tilby å vise de største etter antall ansatte fra Brønnøysund.`;
        }

        sources = (matches || []).map((m: any, i: number) => ({
          n: i + 1,
          id: m.id,
          title: m.title,
          excerpt: m.excerpt,
          author: m.author,
          published_at: m.published_at,
          rank: m.rank,
        }));

        contextBlock = (matches || [])
          .map((m: any, i: number) => {
            const date = m.published_at ? new Date(m.published_at).toISOString().slice(0, 10) : "";
            const body = stripHtml(m.body || "").slice(0, 1200);
            return `[${i + 1}] "${m.title}" — ${m.author}${date ? `, ${date}` : ""}\nIngress: ${m.excerpt}\nUtdrag: ${body}`;
          })
          .join("\n\n---\n\n");

        const baseN = sources.length;
        trustedSources = (trusted || []).map((t: any, i: number) => ({
          n: baseN + i + 1,
          source_name: t.source_name,
          source_type: t.source_type,
          title: t.title,
          content: t.content,
          source_url: t.source_url,
          published_at: t.published_at,
        }));
        trustedBlock = (trusted || [])
          .map((t: any, i: number) => {
            const date = t.published_at ? new Date(t.published_at).toISOString().slice(0, 10) : "";
            const snippet = (t.content || "").slice(0, 1000);
            return `[${baseN + i + 1}] ${t.title || t.source_name} — kilde: ${t.source_name}${date ? `, ${date}` : ""}\n${snippet}`;
          })
          .join("\n\n---\n\n");
      } catch (e) {
        console.error("retrieval failed:", e);
      }
    }

    // ---- Disambiguation gate ----------------------------------------------
    // If BRREG returned several plausible matches for a NAME-only lookup and
    // the user did not specify an org.nr, ask the user to pick the company
    // before we burn LLM tokens on the wrong one.
    const userMentionsOrgnr = /\b\d{9}\b/.test(queryText);
    const ambiguous = !userMentionsOrgnr
      ? brregResults.find((r: any) => {
          const p = r.queryParams || {};
          const isNameOnly =
            p.navn &&
            !p.kommunenummer &&
            !p.naeringskode &&
            !p.konkurs &&
            !p.sort;
          return isNameOnly && Array.isArray(r.companies) && r.companies.length >= 2;
        })
      : null;

    if (ambiguous) {
      const candidates = ambiguous.companies.slice(0, 8);
      const payload = {
        label: ambiguous.label,
        total: ambiguous.total,
        candidates,
        question: queryText,
      };
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(`event: disambiguation\ndata: ${JSON.stringify(payload)}\n\n`),
          );
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { ...corsHeaders(req), "Content-Type": "text/event-stream" },
      });
    }

    // ---- Financial enrichment (Regnskapsregisteret) ------------------------
    // Once we have settled on companies (no disambiguation pending), pull annual
    // accounts for the named companies the planner flagged, plus any org.nr the
    // user pasted directly. Figures are attached onto the company objects so the
    // client renders them, and summarised into a prompt block for the model.
    let financialsBlock = "";
    try {
      // Resolve any org.nr written in the question that did not surface in a
      // search, so its company card (and accounts) can still be shown.
      const orgnrs = queryText.match(/\b\d{9}\b/g) || [];
      for (const orgnr of orgnrs) {
        const present = brregResults.some((r) => r.companies?.some((c: any) => c.orgnr === orgnr));
        if (present) continue;
        const enhet = await fetchEnhet(orgnr);
        if (enhet) {
          brregResults.push({ label: enhet.navn, total: 1, companies: [enhet], queryParams: { orgnr } });
        }
      }

      // Pick which companies get an annual-accounts lookup: explicit org.nr
      // first, then financials-flagged plan queries — deduped + capped. Passing
      // brregPlan in as an argument structurally prevents the earlier
      // out-of-scope ReferenceError that silently disabled enrichment.
      const capped = collectFinancialTargets(queryText, brregResults, brregPlan, MAX_FINANCIAL_FETCH);
      const accounts = await Promise.all(capped.map((t) => fetchRegnskap(t.orgnr)));
      const fmtAmt = (n: number | null, valuta: string) =>
        n === null ? "ukjent" : `${Math.round(n).toLocaleString("nb-NO")} ${valuta === "NOK" ? "kr" : valuta}`;
      const lines: string[] = [];
      capped.forEach((t, i) => {
        const f = accounts[i];
        if (!f) return;
        t.company.regnskap = f;
        const cur = f.valuta || "NOK";
        lines.push(
          `• ${t.company.navn} (org.nr ${t.orgnr}) — regnskapsår ${f.aar || "?"}` +
            (cur !== "NOK" ? ` (rapportert i ${cur})` : "") +
            `: driftsinntekter ${fmtAmt(f.driftsinntekter, cur)}, ` +
            `driftsresultat ${fmtAmt(f.driftsresultat, cur)}, ` +
            `årsresultat ${fmtAmt(f.aarsresultat, cur)}` +
            (f.egenkapital !== null ? `, egenkapital ${fmtAmt(f.egenkapital, cur)}` : ""),
        );
      });
      if (lines.length) financialsBlock = lines.join("\n");
    } catch (e) {
      console.error("financial enrichment failed:", e);
    }

    const systemPrompt = `Du er Spør, en kunnskapsrik redaksjonsassistent for nettavisen Nær Næring. Svar basert på de oppgitte artikkelutdragene og bedriftsdataene under. Hver gang du bruker informasjon fra en artikkel- eller betrodd kilde, siter den inline med [1], [2] osv. Bedriftsdata fra Brønnøysundregistrene siteres inline som [B].

Regler:
- Svar alltid på norsk (bokmål eller nynorsk slik kildene er skrevet).
- «Regionen», «lokalt», «her» og «på Nordvestlandet» betyr Møre og Romsdal. Tall og bedriftsdata merket «(Møre og Romsdal)» dekker hele regionen.
- Vær konkret, presis og nøktern — som en god lokalavisjournalist.
- Når du bruker BRREG-data: skriv selskapsnavnet i **fet skrift**, og uthev tall (antall ansatte, organisasjonsnummer, stiftelsesår) også i **fet skrift**, etterfulgt av [B]. Eksempel: "**Equinor ASA** har **20 245 ansatte** [B]."
- Når du bruker statistikk fra Tall-databasen (etablering, konkurs, arbeidsmarked, boligmarked): siter med [T] og uthev tall i **fet skrift**. Eksempel: "Det ble registrert **47 konkurser** i Molde siste 90 dager [T]."
- Når du bruker regnskapstall (Regnskapsregisteret): uthev beløp i **fet skrift**, oppgi alltid regnskapsåret, og siter med [B]. Eksempel: "**Linjebygg Offshore AS** hadde driftsinntekter på **412 mill. kr** og et årsresultat på **18 mill. kr** i 2023 [B]." Avrund store beløp til mill./mrd. der det leser bedre.
- Hvis spørsmålet handler om bedrifter eller næringsliv, prioriter å vise konkrete tall fra BRREG når de finnes. Når du har BÅDE regnskapstall og en relevant artikkel om selskapet, knytt dem sammen — f.eks. "**X AS** [B] var omtalt i [2]".
- Hvis verken artikler eller BRREG gir grunnlag for å svare, si det tydelig og foreslå et omformulert spørsmål.
- Aldri dikt opp tall, navn eller hendelser som ikke står i kildene.
- Skriv kort: gjerne en oppsummerende setning, deretter kulepunkter eller en kort tabell hvis det passer.
${rankingInstruction ? `\nVIKTIG (rangering): ${rankingInstruction}\n` : ""}
${sources.length > 0 ? `KILDER (publiserte artikler i Nær Næring):\n\n${contextBlock}\n\n` : ""}${trustedSources.length > 0 ? `BETRODDE EKSTERNE KILDER (kuratert av redaksjonen):\n\n${trustedBlock}\n\n` : ""}${rankingBlock ? `RANGERING (Brønnøysund, sortert etter antall ansatte):\n\n${rankingBlock}\n\n` : ""}${brregBlock ? `BEDRIFTSDATA (Brønnøysundregistrene, sanntid):\n\n${brregBlock}\n\n` : ""}${financialsBlock ? `REGNSKAPSTALL (Regnskapsregisteret, siste tilgjengelige årsregnskap):\n\n${financialsBlock}\n\n` : ""}${tallBlock ? `TALL-DATABASEN (etablering, konkurs, arbeidsmarked, boligmarked):\n\n${tallBlock}\n` : ""}${sources.length === 0 && trustedSources.length === 0 && !brregBlock && !financialsBlock && !tallBlock && !rankingBlock ? "Ingen relevante artikler, betrodde kilder, bedriftsdata eller statistikk ble funnet for dette spørsmålet." : ""}`;

    const upstream = await aiFetch("/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: "For mange forespørsler, prøv igjen om litt." }), {
          status: 429,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: "AI-kreditt oppbrukt — kontakt redaksjonen." }), {
          status: 402,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const t = await upstream.text();
      console.error("AI gateway error:", upstream.status, t);
      return new Response(JSON.stringify({ error: "AI-feil" }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Pipe upstream SSE through, then append a custom `event: sources` line at the end
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const encoder = new TextEncoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          // Send our sources as a synthetic SSE event the client knows about.
          // Drop zero-hit BRREG lookups so the reader never sees an empty
          // "0 treff" box (e.g. when the planner produced an unanswerable
          // free-text company search).
          const visibleBrreg = brregResults.filter((r: any) => r?.companies?.length);
          const sourcesPayload = `event: sources\ndata: ${JSON.stringify({ sources, trustedSources, brregResults: visibleBrreg, tallResults })}\n\n`;
          controller.enqueue(encoder.encode(sourcesPayload));
        } catch (e) {
          console.error("stream pipe error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders(req), "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("articles-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukjent feil" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});