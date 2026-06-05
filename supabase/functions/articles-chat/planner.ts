// Single-call query planner for Spør. Replaces three separate LLM round-trips
// (search-term extraction + BRREG plan + Tall plan) with one request whose
// response is parsed here. Pure + dependency-free so the parsing — the part
// most likely to regress — is unit-testable under vitest.

export interface BrregQuery {
  label: string;
  params: Record<string, string>;
  financials?: boolean;
}

export interface TallPlan {
  establishments: boolean;
  bankruptcies: boolean;
  labor: boolean;
  housing: boolean;
  kommunenummer?: string;
  days?: number;
}

export interface Ranking {
  metric: "ansatte" | "omsetning" | "annet";
  omfang: "region" | "kommune" | "nasjonalt" | "bransje";
}

export interface PlannerResult {
  searchTerms: string;
  brreg: BrregQuery[] | null;
  tall: TallPlan | null;
  // Non-null when the question is a superlative/ranking over a GROUP (e.g.
  // "largest companies in the region") rather than a named entity. Drives both
  // routing and the honest-framing rules — see decideRankingRoute.
  ranking: Ranking | null;
}

export type RankingRoute = "top" | "articles";

/**
 * Where to ground a ranking question.
 *   "top"      — authoritative: enhetsregisteret sorted by employees over the
 *                region/kommune (brreg-proxy `top`). Used for ansatte/generic.
 *   "articles" — no register can rank the whole population on this metric/scope
 *                (revenue region-wide, national, industry). Answer from the
 *                archive but framed as non-exhaustive, offering the answerable
 *                (by-employees) variant.
 * Returns null for non-ranking questions (unchanged behaviour).
 */
export function decideRankingRoute(ranking: Ranking | null): RankingRoute | null {
  if (!ranking) return null;
  const obtainableByEmployees =
    (ranking.metric === "ansatte" || ranking.metric === "annet") &&
    (ranking.omfang === "region" || ranking.omfang === "kommune");
  return obtainableByEmployees ? "top" : "articles";
}

export const PLANNER_SYSTEM_PROMPT = `Du er planleggeren for «Spør», AI-assistenten til lokalavisen Nær Næring (Møre og Romsdal). Analyser brukerens spørsmål og returner ETT JSON-objekt med tre felt:

{
  "searchTerms": "3–8 nøkkelord for fulltekstsøk i avisarkivet (egennavn, bransjer, steder, selskaper). Ingen tegnsetting, ingen anførselstegn.",
  "brreg": [ 0–3 oppslag i Brønnøysund (enhetsregisteret) ],
  "tall": { statistikk-plan } eller null,
  "ranking": { "metric": "ansatte"|"omsetning"|"annet", "omfang": "region"|"kommune"|"nasjonalt"|"bransje" } eller null
}

BRREG — hver query er {"label":"...","params":{...},"financials":bool}.
Parametere: navn, kommunenummer, organisasjonsform (default AS,ASA), naeringskode, sort (f.eks "antallAnsatte,desc"), size (maks 10), konkurs.
Nasjonale kommunenumre du kan bruke: Oslo 0301, Bergen 4601, Trondheim 5001, Stavanger 1103, Tromsø 5501, Bodø 1804.
VIKTIG: For steder i Møre og Romsdal skal du IKKE gjette kommunenummer — utelat "kommunenummer"; systemet fyller det inn automatisk.
Sett "financials":true når spørsmålet handler om økonomi for et NAVNGITT selskap (omsetning, driftsresultat, årsresultat, lønnsomhet, overskudd, underskudd, regnskap, inntekter).
Lag brreg-queries kun når spørsmålet handler om et navngitt selskap, en bransje, eller "største/nyeste/konkurs" et sted. Ellers "brreg": [].

TALL — {"establishments":bool,"bankruptcies":bool,"labor":bool,"housing":bool,"kommunenummer":"","days":N}, eller null hvis ingen kategori passer.
- establishments: nye selskaper/etableringer/oppstart.
- bankruptcies: konkurser.
- labor: arbeidsledighet, sysselsetting, sykefravær, lønn, arbeidsmarked.
- housing: boligpriser, boligbygging, boliglån, boligmarked.
- kommunenummer: samme regel som over (nasjonale byer kan fylles, MR-steder utelates).
- days: dager tilbake for etablering/konkurs (default 90, maks 365).

RANKING — sett "ranking" når spørsmålet ber om en rangering eller superlativ over en GRUPPE (størst/flest/mest/topp/største arbeidsgivere/«hvilke … i regionen/bransjen/kommunen»), IKKE om et navngitt selskap.
- metric: "ansatte" (flest ansatte / største arbeidsgivere / størst arbeidsplass), "omsetning" (størst omsetning/inntekter/lønnsomhet), ellers "annet".
- omfang: "region" (Møre og Romsdal / regionen), "kommune" (én bestemt kommune), "nasjonalt", eller "bransje".
Ellers "ranking": null.

Returner BARE JSON, ingen forklaring.`;

/**
 * Parse the planner LLM's JSON reply into a typed PlannerResult. Tolerant of
 * ```json fences and of the legacy {"queries":[...]} shape. On any malformed
 * input it degrades gracefully: raw question as search terms, no enrichment.
 */
export function parsePlannerResponse(raw: string, fallbackQuery: string): PlannerResult {
  try {
    const cleaned = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const searchTerms =
      typeof parsed?.searchTerms === "string" && parsed.searchTerms.trim()
        ? parsed.searchTerms.trim()
        : fallbackQuery;

    const rawQueries = Array.isArray(parsed?.brreg)
      ? parsed.brreg
      : Array.isArray(parsed?.queries)
        ? parsed.queries
        : [];
    const brreg: BrregQuery[] | null = rawQueries.length
      ? rawQueries.slice(0, 3).map((q: any) => ({
          label: String(q?.label ?? ""),
          params: q && typeof q.params === "object" && q.params ? q.params : {},
          financials: !!q?.financials,
        }))
      : null;

    const t = parsed?.tall && typeof parsed.tall === "object" ? parsed.tall : null;
    let tall: TallPlan | null = null;
    if (t && (t.establishments || t.bankruptcies || t.labor || t.housing)) {
      tall = {
        establishments: !!t.establishments,
        bankruptcies: !!t.bankruptcies,
        labor: !!t.labor,
        housing: !!t.housing,
        kommunenummer: typeof t.kommunenummer === "string" ? t.kommunenummer : "",
        days: Math.min(365, Math.max(7, Number(t.days) || 90)),
      };
    }

    const r = parsed?.ranking && typeof parsed.ranking === "object" ? parsed.ranking : null;
    let ranking: Ranking | null = null;
    if (r && (r.metric || r.omfang)) {
      ranking = {
        metric: r.metric === "ansatte" || r.metric === "omsetning" ? r.metric : "annet",
        omfang: ["region", "kommune", "nasjonalt", "bransje"].includes(r.omfang) ? r.omfang : "region",
      };
    }

    return { searchTerms, brreg, tall, ranking };
  } catch {
    return { searchTerms: fallbackQuery, brreg: null, tall: null, ranking: null };
  }
}
