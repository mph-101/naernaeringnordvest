import { describe, it, expect } from "vitest";
import {
  collectFinancialTargets,
  type BrregResult,
} from "../../../supabase/functions/articles-chat/financial-targets";

// Regression cover for the Spør financial-enrichment (Regnskapsregisteret) wiring.
// The original bug was not in parsing but in scope: `brregPlan` was block-scoped
// inside the retrieval try, so the enrichment block threw `ReferenceError:
// brregPlan is not defined`, which was swallowed and silently disabled ALL
// regnskap lookups. Making brregPlan an explicit argument here prevents that,
// and these tests pin the selection behaviour so it can't regress unnoticed.

describe("collectFinancialTargets", () => {
  it("selects a company referenced by org.nr in the question", () => {
    const brregResults: BrregResult[] = [
      {
        companies: [{ orgnr: "923609016", navn: "EQUINOR ASA" }],
        queryParams: { organisasjonsnummer: "923609016" },
      },
    ];
    const out = collectFinancialTargets(
      "omsetning og driftsresultat for org.nr 923609016",
      brregResults,
      [{ financials: true }],
      3,
    );
    expect(out.map((t) => t.orgnr)).toEqual(["923609016"]);
    expect(out[0].company.navn).toBe("EQUINOR ASA");
  });

  it("does NOT throw when brregPlan is null (the out-of-scope regression)", () => {
    const brregResults: BrregResult[] = [
      { companies: [{ orgnr: "923609016", navn: "X AS" }] },
    ];
    expect(() =>
      collectFinancialTargets("org.nr 923609016", brregResults, null, 3),
    ).not.toThrow();
    const out = collectFinancialTargets("org.nr 923609016", brregResults, null, 3);
    expect(out.map((t) => t.orgnr)).toEqual(["923609016"]);
  });

  it("selects the top-2 companies of a financials-flagged plan query", () => {
    const brregResults: BrregResult[] = [
      {
        companies: [
          { orgnr: "1", navn: "A" },
          { orgnr: "2", navn: "B" },
          { orgnr: "3", navn: "C" },
        ],
      },
    ];
    const out = collectFinancialTargets("hvor lønnsom er bransjen", brregResults, [{ financials: true }], 3);
    expect(out.map((t) => t.orgnr)).toEqual(["1", "2"]);
  });

  it("ignores plan queries not flagged for financials", () => {
    const brregResults: BrregResult[] = [{ companies: [{ orgnr: "1", navn: "A" }] }];
    const out = collectFinancialTargets("siste nytt om kultur", brregResults, [{ financials: false }], 3);
    expect(out).toEqual([]);
  });

  it("dedupes across org.nr and plan selection (org.nr keeps priority)", () => {
    const brregResults: BrregResult[] = [
      {
        companies: [
          { orgnr: "923609016", navn: "EQUINOR ASA" },
          { orgnr: "2", navn: "B" },
        ],
      },
    ];
    const out = collectFinancialTargets("org.nr 923609016 i bransjen", brregResults, [{ financials: true }], 3);
    // org.nr first, then plan top-2 (923609016 is a dup and skipped, 2 added)
    expect(out.map((t) => t.orgnr)).toEqual(["923609016", "2"]);
  });

  it("caps the result at maxFetch", () => {
    const brregResults: BrregResult[] = [
      { companies: [{ orgnr: "1", navn: "A" }, { orgnr: "2", navn: "B" }] },
      { companies: [{ orgnr: "3", navn: "C" }, { orgnr: "4", navn: "D" }] },
    ];
    const out = collectFinancialTargets(
      "lønnsomhet",
      brregResults,
      [{ financials: true }, { financials: true }],
      3,
    );
    expect(out).toHaveLength(3);
    expect(out.map((t) => t.orgnr)).toEqual(["1", "2", "3"]);
  });
});
