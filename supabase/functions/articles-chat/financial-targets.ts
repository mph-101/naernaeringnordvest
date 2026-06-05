// Pure, dependency-free selection logic deciding which companies in a Spør
// answer get an annual-accounts (Regnskapsregisteret) lookup. Deliberately free
// of Deno/Supabase imports so it can be unit-tested under vitest (see
// src/lib/__tests__/financial-targets.test.ts), even though the edge function
// that consumes it runs on Deno.

export interface FinancialPlanQuery {
  financials?: boolean;
  // Other planner fields (label, params, …) are irrelevant to selection.
  [key: string]: unknown;
}

export interface BrregCompany {
  orgnr: string;
  [key: string]: unknown;
}

export interface BrregResult {
  companies?: BrregCompany[];
  [key: string]: unknown;
}

export interface FinancialTarget {
  orgnr: string;
  company: BrregCompany;
}

/**
 * Decide which companies should get an annual-accounts lookup.
 *
 * Priority order, de-duplicated by org.nr and capped at `maxFetch`:
 *   a) Any 9-digit org.nr written in the question (the caller is expected to
 *      have already resolved these into `brregResults` via Enhetsregisteret).
 *   b) The top-2 companies of each plan query the planner flagged with
 *      `financials: true`.
 *
 * `brregPlan` is an explicit parameter on purpose: passing it in is what keeps
 * it in scope at the call site. A prior version referenced a block-scoped
 * `brregPlan` from the enrichment block, which threw `ReferenceError` at
 * runtime and silently disabled all financial enrichment.
 */
export function collectFinancialTargets(
  queryText: string,
  brregResults: BrregResult[],
  brregPlan: FinancialPlanQuery[] | null,
  maxFetch: number,
): FinancialTarget[] {
  const targets: FinancialTarget[] = [];
  const seen = new Set<string>();

  const enqueue = (company: BrregCompany | undefined) => {
    if (company?.orgnr && !seen.has(company.orgnr)) {
      seen.add(company.orgnr);
      targets.push({ orgnr: company.orgnr, company });
    }
  };

  // a) Explicit org.nr in the question — highest priority.
  const orgnrs = queryText.match(/\b\d{9}\b/g) || [];
  for (const orgnr of orgnrs) {
    if (seen.has(orgnr)) continue;
    for (const r of brregResults) {
      const hit = r.companies?.find((c) => c.orgnr === orgnr);
      if (hit) {
        enqueue(hit);
        break;
      }
    }
  }

  // b) Companies from financial-flagged plan queries (top 2 per query).
  if (brregPlan) {
    brregPlan.forEach((q, i) => {
      if (!q.financials) return;
      const r = brregResults[i];
      if (r?.companies?.length) r.companies.slice(0, 2).forEach(enqueue);
    });
  }

  return targets.slice(0, maxFetch);
}
