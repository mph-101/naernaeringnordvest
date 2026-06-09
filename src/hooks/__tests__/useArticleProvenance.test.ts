import { describe, it, expect } from "vitest";
import { buildProvenancePayload } from "../provenance-payload";
import type { SourceRow, ResponseRow, CorrectionRow } from "../provenance-payload";

const ID = "art-1";

describe("buildProvenancePayload", () => {
  it("drops rows missing their required field and assigns sort_order", () => {
    const sources: SourceRow[] = [
      { kind: "interviewee", name: "Per", role: "", org: "", org_orgnr: "", doc_type: "" },
      { kind: "interviewee", name: "  ", role: "x", org: "", org_orgnr: "", doc_type: "" }, // blank name → dropped
      { kind: "document", name: "Rapport", role: "", org: "", org_orgnr: "", doc_type: "pdf" },
    ];
    const { sources: out } = buildProvenancePayload(ID, sources, [], []);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ article_id: ID, name: "Per", sort_order: 0 });
    expect(out[1]).toMatchObject({ name: "Rapport", sort_order: 1, doc_type: "pdf" });
  });

  it("nulls blank optional fields and only keeps doc_type for documents", () => {
    const sources: SourceRow[] = [
      { kind: "interviewee", name: "Kari", role: " bostyrer ", org: "", org_orgnr: "", doc_type: "irrelevant" },
    ];
    const { sources: out } = buildProvenancePayload(ID, sources, [], []);
    expect(out[0].role).toBe("bostyrer"); // trimmed
    expect(out[0].org).toBeNull();
    expect(out[0].org_orgnr).toBeNull();
    expect(out[0].doc_type).toBeNull(); // not a document → dropped
  });

  it("persists the internal note on responses", () => {
    const responses: ResponseRow[] = [
      { party_name: "X AS", party_role: "saksøkt", status: "declined", note: "ringte 3x" },
      { party_name: "", party_role: "", status: "no_reply", note: "skal droppes" }, // blank party → dropped
    ];
    const { responses: out } = buildProvenancePayload(ID, [], responses, []);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      party_name: "X AS",
      status: "declined",
      note: "ringte 3x",
      sort_order: 0,
    });
  });

  it("nulls a blank note rather than sending empty string", () => {
    const responses: ResponseRow[] = [
      { party_name: "Y", party_role: "", status: "responded", note: "   " },
    ];
    const { responses: out } = buildProvenancePayload(ID, [], responses, []);
    expect(out[0].note).toBeNull();
  });

  it("normalizes correction dates to ISO and drops empty summaries", () => {
    const corrections: CorrectionRow[] = [
      { corrected_at: "2026-06-03", summary: "Rettet tall" },
      { corrected_at: "2026-06-04", summary: "   " }, // dropped
    ];
    const { corrections: out } = buildProvenancePayload(ID, [], [], corrections);
    expect(out).toHaveLength(1);
    expect(out[0].summary).toBe("Rettet tall");
    expect(out[0].corrected_at).toMatch(/^2026-06-03T/);
  });
});
