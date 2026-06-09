// Owns the editable agent-provenance child rows for one article (sources,
// right-of-reply responses, corrections) so ArticleEditor doesn't grow more
// state/IO. Mirrors the existing companyTags pattern (load on edit, delete+insert
// on save) but encapsulated.
//
// `note` is write-able by editorial roles (only SELECT was revoked), so saving
// goes through the normal client. Reading note back requires the service-role
// `provenance-admin-notes` function.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildProvenancePayload,
  type CorrectionRow,
  type ResponseRow,
  type SourceRow,
} from "./provenance-payload";

// Re-export the row types + factories so consumers (ArticleProvenancePanel)
// keep importing them from this hook module. The pure payload logic lives in
// ./provenance-payload (no Supabase import) so it stays unit-testable.
export { emptySource, emptyResponse, emptyCorrection } from "./provenance-payload";
export type { SourceRow, ResponseRow, CorrectionRow } from "./provenance-payload";

export function useArticleProvenance(articleId: string | null) {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!articleId) {
      setSources([]);
      setResponses([]);
      setCorrections([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: src }, { data: corr }] = await Promise.all([
        supabase
          .from("article_provenance_sources")
          .select("kind, name, role, org, org_orgnr, doc_type")
          .eq("article_id", articleId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("article_provenance_corrections")
          .select("corrected_at, summary")
          .eq("article_id", articleId)
          .order("corrected_at", { ascending: false }),
      ]);

      // Responses incl. note via the service-role function. Fall back to the
      // note-less public columns if the function is unavailable.
      let resp: ResponseRow[] = [];
      try {
        const { data, error } = await supabase.functions.invoke(
          "provenance-admin-notes",
          { body: { article_id: articleId } },
        );
        if (error) throw error;
        resp = ((data?.responses ?? []) as any[]).map((r) => ({
          party_name: r.party_name ?? "",
          party_role: r.party_role ?? "",
          status: r.status,
          note: r.note ?? "",
        }));
      } catch {
        const { data } = await supabase
          .from("article_provenance_responses")
          .select("party_name, party_role, status")
          .eq("article_id", articleId)
          .order("sort_order", { ascending: true });
        resp = ((data ?? []) as any[]).map((r) => ({
          party_name: r.party_name ?? "",
          party_role: r.party_role ?? "",
          status: r.status,
          note: "",
        }));
      }

      if (cancelled) return;
      setSources(
        ((src ?? []) as any[]).map((s) => ({
          kind: s.kind,
          name: s.name ?? "",
          role: s.role ?? "",
          org: s.org ?? "",
          org_orgnr: s.org_orgnr ?? "",
          doc_type: s.doc_type ?? "",
        })),
      );
      setResponses(resp);
      setCorrections(
        ((corr ?? []) as any[]).map((c) => ({
          corrected_at: (c.corrected_at ?? "").slice(0, 10),
          summary: c.summary ?? "",
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  // Persist all three tables via delete-then-insert (mirrors article_tags).
  const save = useCallback(
    async (id: string) => {
      const payload = buildProvenancePayload(id, sources, responses, corrections);

      await supabase.from("article_provenance_sources").delete().eq("article_id", id);
      if (payload.sources.length) {
        await supabase.from("article_provenance_sources").insert(payload.sources);
      }
      await supabase.from("article_provenance_responses").delete().eq("article_id", id);
      if (payload.responses.length) {
        await supabase.from("article_provenance_responses").insert(payload.responses);
      }
      await supabase.from("article_provenance_corrections").delete().eq("article_id", id);
      if (payload.corrections.length) {
        await supabase.from("article_provenance_corrections").insert(payload.corrections);
      }
    },
    [sources, responses, corrections],
  );

  return {
    sources,
    setSources,
    responses,
    setResponses,
    corrections,
    setCorrections,
    loading,
    save,
    hasAny: sources.length > 0 || responses.length > 0 || corrections.length > 0,
  };
}
