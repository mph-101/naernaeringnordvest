// Deno tests for the pure shaping logic. Run with:
//   deno test --no-check supabase/functions/article-provenance/index.test.ts

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildProvenanceResponse,
  machineNote,
  type ProvArticle,
  type ProvSource,
} from "./index.ts";

const SITE = "https://naernaering.no";

function article(over: Partial<ProvArticle> = {}): ProvArticle {
  return {
    id: "abc-123",
    title: "Konkurs i X AS",
    excerpt: "Selskapet begjærte oppbud onsdag.",
    category: "Næringsliv",
    premium: true,
    published_at: "2026-06-01T08:00:00Z",
    updated_at: "2026-06-02T09:00:00Z",
    key_points: ["Oppbud onsdag", "30 ansatte berørt"],
    agent_exposure: "headline_plus_dek",
    ...over,
  };
}

Deno.test("machineNote is derived from status, in Norwegian", () => {
  assertEquals(machineNote("declined"), "Parten ble kontaktet og avslo å kommentere.");
  assertEquals(machineNote("responded"), "Parten svarte på vår henvendelse.");
  assertEquals(machineNote("no_reply"), "Parten ble kontaktet, men svarte ikke før publisering.");
  assertEquals(machineNote("not_applicable"), "Ingen part hadde krav på tilsvar i denne saken.");
});

Deno.test("article block: url, free flag, and text exposure gating", () => {
  const headlineOnly = buildProvenanceResponse({
    siteUrl: SITE,
    article: article({ agent_exposure: "headline_only" }),
    sources: [],
    responses: [],
    corrections: [],
  }).body.article as Record<string, unknown>;
  assertEquals(headlineOnly.url, `${SITE}/sak/abc-123`);
  assertEquals(headlineOnly.is_accessible_for_free, false);
  assertEquals(headlineOnly.dek, undefined);
  assertEquals(headlineOnly.summary, undefined);

  const dek = buildProvenanceResponse({
    siteUrl: SITE,
    article: article({ agent_exposure: "headline_plus_dek" }),
    sources: [],
    responses: [],
    corrections: [],
  }).body.article as Record<string, unknown>;
  assertEquals(dek.dek, "Selskapet begjærte oppbud onsdag.");
  assertEquals(dek.summary, undefined);

  const summary = buildProvenanceResponse({
    siteUrl: SITE,
    article: article({ agent_exposure: "summary" }),
    sources: [],
    responses: [],
    corrections: [],
  }).body.article as Record<string, unknown>;
  assertEquals(summary.summary, "Oppbud onsdag 30 ansatte berørt");
});

Deno.test("sourcing: splits kinds and counts independent sources", () => {
  const sources: ProvSource[] = [
    { kind: "interviewee", name: "Per Hansen", role: "daglig leder", org: "X AS", org_orgnr: "912345678", doc_type: null },
    { kind: "interviewee", name: "Per Hansen", role: null, org: null, org_orgnr: null, doc_type: null }, // dup name
    { kind: "interviewee", name: "Kari Ås", role: "bostyrer", org: null, org_orgnr: null, doc_type: null },
    { kind: "document", name: "Konkursbegjæring", role: null, org: "Tingretten", org_orgnr: null, doc_type: "rettsdok" },
    { kind: "dataset", name: "Regnskapsregisteret", role: null, org: null, org_orgnr: null, doc_type: null },
  ];
  const { body, sections } = buildProvenanceResponse({
    siteUrl: SITE, article: article(), sources, responses: [], corrections: [],
  });
  const sourcing = body.sourcing as Record<string, unknown>;
  assertEquals(sourcing.independent_source_count, 2); // Per Hansen counted once
  assertEquals(sourcing.document_count, 1);
  assertEquals((sourcing.interviewees as unknown[]).length, 3);
  assertEquals((sourcing.datasets as unknown[]).length, 1);
  assert(sections.includes("sourcing"));
});

Deno.test("right_of_reply: machine_note present, internal note never leaks", () => {
  const { body } = buildProvenanceResponse({
    siteUrl: SITE,
    article: article(),
    sources: [],
    responses: [{ party_name: "X AS", party_role: "saksøkt", status: "declined" }],
    corrections: [],
  });
  const ror = body.right_of_reply as Record<string, unknown>[];
  assertEquals(ror[0].party, "X AS");
  assertEquals(ror[0].status, "declined");
  assertEquals(ror[0].machine_note, "Parten ble kontaktet og avslo å kommentere.");
  // No "note" key anywhere in the serialized payload.
  assert(!JSON.stringify(body).includes('"note"'));
});

Deno.test("editorial_standards resolves absolute policy URLs", () => {
  const { body } = buildProvenanceResponse({
    siteUrl: SITE, article: article(), sources: [], responses: [], corrections: [],
  });
  const std = body.editorial_standards as Record<string, unknown>;
  assertEquals(std.ethics_policy, `${SITE}/redaksjonelle-prinsipper`);
  assertEquals(std.codes, ["Vær Varsom-plakaten", "Redaktørplakaten"]);
});
