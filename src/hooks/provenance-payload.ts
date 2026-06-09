// Dependency-free row types + payload builder for agent-provenance admin editing.
// Kept separate from useArticleProvenance.ts (which imports the Supabase client)
// so unit tests can exercise this logic without instantiating the client — CI
// has no VITE_SUPABASE_URL, and importing the client at module load throws.
// (Same discipline as the edge-function vitest pattern.)

import type {
  ArticleSourceKind,
  ArticleResponseStatus,
} from "@/lib/agent-provenance/types";

export interface SourceRow {
  kind: ArticleSourceKind;
  name: string;
  role: string;
  org: string;
  org_orgnr: string;
  doc_type: string;
}
export interface ResponseRow {
  party_name: string;
  party_role: string;
  status: ArticleResponseStatus;
  note: string;
}
export interface CorrectionRow {
  corrected_at: string;
  summary: string;
}

export const emptySource = (): SourceRow => ({
  kind: "interviewee",
  name: "",
  role: "",
  org: "",
  org_orgnr: "",
  doc_type: "",
});
export const emptyResponse = (): ResponseRow => ({
  party_name: "",
  party_role: "",
  status: "declined",
  note: "",
});
export const emptyCorrection = (): CorrectionRow => ({
  corrected_at: new Date().toISOString().slice(0, 10),
  summary: "",
});

const nullIfBlank = (s: string) => (s.trim() ? s.trim() : null);

// Pure: turn the editable rows into insert payloads for the three tables.
// Filters out rows missing their required field and assigns sort_order.
// Exported for unit testing (note must persist; blanks must drop).
export function buildProvenancePayload(
  id: string,
  sources: SourceRow[],
  responses: ResponseRow[],
  corrections: CorrectionRow[],
) {
  return {
    sources: sources
      .filter((s) => s.name.trim())
      .map((s, i) => ({
        article_id: id,
        kind: s.kind,
        name: s.name.trim(),
        role: nullIfBlank(s.role),
        org: nullIfBlank(s.org),
        org_orgnr: nullIfBlank(s.org_orgnr),
        doc_type: s.kind === "document" ? nullIfBlank(s.doc_type) : null,
        sort_order: i,
      })),
    responses: responses
      .filter((r) => r.party_name.trim())
      .map((r, i) => ({
        article_id: id,
        party_name: r.party_name.trim(),
        party_role: nullIfBlank(r.party_role),
        status: r.status,
        note: nullIfBlank(r.note),
        sort_order: i,
      })),
    corrections: corrections
      .filter((c) => c.summary.trim())
      .map((c) => ({
        article_id: id,
        corrected_at: c.corrected_at
          ? new Date(c.corrected_at).toISOString()
          : new Date().toISOString(),
        summary: c.summary.trim(),
      })),
  };
}
