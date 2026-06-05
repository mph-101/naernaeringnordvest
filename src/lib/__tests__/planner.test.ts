import { describe, it, expect } from "vitest";
import { parsePlannerResponse } from "../../../supabase/functions/articles-chat/planner";

describe("parsePlannerResponse", () => {
  it("parses a full planner response into the three fields", () => {
    const raw = JSON.stringify({
      searchTerms: "Linjebygg offshore Molde",
      brreg: [{ label: "Linjebygg", params: { navn: "Linjebygg" }, financials: true }],
      tall: { establishments: false, bankruptcies: true, labor: false, housing: false, kommunenummer: "1506", days: 30 },
    });
    const out = parsePlannerResponse(raw, "fallback");
    expect(out.searchTerms).toBe("Linjebygg offshore Molde");
    expect(out.brreg).toHaveLength(1);
    expect(out.brreg?.[0].financials).toBe(true);
    expect(out.tall?.bankruptcies).toBe(true);
    expect(out.tall?.days).toBe(30);
  });

  it("strips ```json code fences", () => {
    const raw = '```json\n{"searchTerms":"test","brreg":[],"tall":null}\n```';
    const out = parsePlannerResponse(raw, "fallback");
    expect(out.searchTerms).toBe("test");
    expect(out.brreg).toBeNull();
    expect(out.tall).toBeNull();
  });

  it("returns null tall when no category is set", () => {
    const raw = JSON.stringify({
      searchTerms: "x",
      tall: { establishments: false, bankruptcies: false, labor: false, housing: false },
    });
    expect(parsePlannerResponse(raw, "f").tall).toBeNull();
  });

  it("returns null brreg for an empty queries array", () => {
    expect(parsePlannerResponse(JSON.stringify({ searchTerms: "x", brreg: [] }), "f").brreg).toBeNull();
  });

  it("caps BRREG at 3 queries", () => {
    const brreg = [1, 2, 3, 4, 5].map((n) => ({ label: `q${n}`, params: {} }));
    expect(parsePlannerResponse(JSON.stringify({ searchTerms: "x", brreg }), "f").brreg).toHaveLength(3);
  });

  it("clamps days to [7, 365]", () => {
    const mk = (days: number) =>
      parsePlannerResponse(JSON.stringify({ searchTerms: "x", tall: { bankruptcies: true, days } }), "f").tall?.days;
    expect(mk(9999)).toBe(365);
    expect(mk(1)).toBe(7);
    expect(mk(120)).toBe(120);
  });

  it("accepts the legacy {queries:[...]} shape", () => {
    const raw = JSON.stringify({ searchTerms: "x", queries: [{ label: "L", params: {}, financials: false }] });
    expect(parsePlannerResponse(raw, "f").brreg).toHaveLength(1);
  });

  it("falls back to the raw question on malformed JSON", () => {
    const out = parsePlannerResponse("not json at all", "hva skjer i Molde");
    expect(out).toEqual({ searchTerms: "hva skjer i Molde", brreg: null, tall: null });
  });

  it("falls back to the question when searchTerms is missing/empty", () => {
    expect(parsePlannerResponse(JSON.stringify({ brreg: [] }), "min spørring").searchTerms).toBe("min spørring");
  });
});
