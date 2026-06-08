// Public provenance endpoint (Lag 2). Serves machine-readable journalistic
// provenance for an article so AI agents and search engines can weight and cite
// Nær Næring as a trustworthy source — WITHOUT leaking paid body text.
//
//   GET /functions/v1/article-provenance?id=<article uuid>
//
// Deliberately fully open (own `*` CORS, no auth) per decision 2026-06-08 —
// maximum visibility. Rate-limited per IP (hashed) for abuse protection, and
// every fetch is logged (user-agent + sections + exposure, NO IP) so we can
// later measure whether agent-referred traffic converts to subscriptions.
//
// Respects articles.agent_exposure for how much article TEXT is echoed. The
// provenance metadata itself (sourcing, right_of_reply, corrections) is always
// returned — that is the whole point and contains no body text. The internal
// article_provenance_responses.note is NEVER selected or returned; the public
// `machine_note` is derived from `status`, not from the internal note.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ----------------------------------------------------------------------
// Pure, testable shaping logic (exported for deno test in ./index.test.ts)
// ----------------------------------------------------------------------

export type Exposure = "headline_only" | "headline_plus_dek" | "summary";
export type ResponseStatus =
  | "responded"
  | "declined"
  | "no_reply"
  | "not_applicable";

export interface ProvArticle {
  id: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  premium: boolean;
  published_at: string | null;
  updated_at: string | null;
  key_points: unknown;
  agent_exposure: Exposure;
}
export interface ProvSource {
  kind: "interviewee" | "document" | "dataset";
  name: string;
  role: string | null;
  org: string | null;
  org_orgnr: string | null;
  doc_type: string | null;
}
// Public projection — NOTE deliberately absent.
export interface ProvResponse {
  party_name: string;
  party_role: string | null;
  status: ResponseStatus;
}
export interface ProvCorrection {
  corrected_at: string;
  summary: string;
}

// Public, status-derived explanation. NOT the internal free-text note.
export function machineNote(status: ResponseStatus): string {
  switch (status) {
    case "responded":
      return "Parten svarte på vår henvendelse.";
    case "declined":
      return "Parten ble kontaktet og avslo å kommentere.";
    case "no_reply":
      return "Parten ble kontaktet, men svarte ikke før publisering.";
    case "not_applicable":
      return "Ingen part hadde krav på tilsvar i denne saken.";
  }
}

function keyPointsToText(keyPoints: unknown): string | undefined {
  if (!Array.isArray(keyPoints)) return undefined;
  const parts = keyPoints
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

export function buildProvenanceResponse(input: {
  siteUrl: string;
  article: ProvArticle;
  sources: ProvSource[];
  responses: ProvResponse[];
  corrections: ProvCorrection[];
}): { body: Record<string, unknown>; sections: string[] } {
  const { siteUrl, article, sources, responses, corrections } = input;
  const exposure = article.agent_exposure;

  const interviewees = sources
    .filter((s) => s.kind === "interviewee")
    .map((s) => ({
      name: s.name,
      role: s.role ?? undefined,
      org: s.org ?? undefined,
      orgnr: s.org_orgnr ?? undefined,
    }));
  const documents = sources
    .filter((s) => s.kind === "document")
    .map((s) => ({
      name: s.name,
      doc_type: s.doc_type ?? undefined,
      org: s.org ?? undefined,
    }));
  const datasets = sources
    .filter((s) => s.kind === "dataset")
    .map((s) => ({ name: s.name }));

  // "Independent sources" = distinct named interviewees.
  const independentSourceCount = new Set(
    interviewees.map((i) => i.name.trim().toLowerCase()),
  ).size;

  const articleBlock: Record<string, unknown> = {
    id: article.id,
    url: `${siteUrl}/sak/${article.id}`,
    title: article.title,
    category: article.category ?? undefined,
    published_at: article.published_at ?? undefined,
    modified_at: article.updated_at ?? undefined,
    is_accessible_for_free: !article.premium,
    agent_exposure: exposure,
  };
  // Text exposure gate — mirrors the JSON-LD layer.
  if (exposure !== "headline_only" && article.excerpt) {
    articleBlock.dek = article.excerpt;
  }
  if (exposure === "summary") {
    const summary = keyPointsToText(article.key_points);
    if (summary) articleBlock.summary = summary;
  }

  const body: Record<string, unknown> = {
    article: articleBlock,
    sourcing: {
      independent_source_count: independentSourceCount,
      document_count: documents.length,
      interviewees,
      documents,
      datasets,
    },
    right_of_reply: responses.map((r) => ({
      party: r.party_name,
      party_role: r.party_role ?? undefined,
      status: r.status,
      machine_note: machineNote(r.status),
    })),
    corrections: corrections.map((c) => ({
      corrected_at: c.corrected_at,
      summary: c.summary,
    })),
    editorial_standards: {
      publisher: "Nær Næring Nordvest",
      ethics_policy: `${siteUrl}/redaksjonelle-prinsipper`,
      corrections_policy: `${siteUrl}/redaksjonelle-prinsipper`,
      codes: ["Vær Varsom-plakaten", "Redaktørplakaten"],
    },
  };

  const sections: string[] = ["article"];
  if (sources.length) sections.push("sourcing");
  if (responses.length) sections.push("right_of_reply");
  if (corrections.length) sections.push("corrections");

  return { body, sections };
}

// ----------------------------------------------------------------------
// HTTP handler (IO — not unit-tested; logic above is)
// ----------------------------------------------------------------------

const PUBLIC_CORS: Record<string, string> = {
  // Deliberately open: this layer is public and contains no secrets.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 300; // generous; crawlers hit many articles

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(
    ip + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const handler = async (req: Request): Promise<Response> => {
  const json = (b: unknown, status = 200, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...PUBLIC_CORS, "Content-Type": "application/json", ...extra },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: PUBLIC_CORS });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) return json({ error: "Missing required query param: id" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1) Rate limit (mirrors submit-tip)
  const clientIP =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = await hashIP(clientIP);
  const now = new Date();

  const { data: rl } = await supabase
    .from("provenance_rate_limits")
    .select("request_count, window_start")
    .eq("ip_hash", ipHash)
    .maybeSingle();

  if (rl) {
    const elapsed = now.getTime() - new Date(rl.window_start).getTime();
    if (elapsed < RATE_LIMIT_WINDOW_MS) {
      if (rl.request_count >= MAX_REQUESTS_PER_WINDOW) {
        return json(
          { error: "Rate limit exceeded. Try again later." },
          429,
          { "Retry-After": String(Math.ceil((RATE_LIMIT_WINDOW_MS - elapsed) / 1000)) },
        );
      }
      await supabase
        .from("provenance_rate_limits")
        .update({ request_count: rl.request_count + 1 })
        .eq("ip_hash", ipHash);
    } else {
      await supabase
        .from("provenance_rate_limits")
        .update({ request_count: 1, window_start: now.toISOString() })
        .eq("ip_hash", ipHash);
    }
  } else {
    await supabase
      .from("provenance_rate_limits")
      .insert({ ip_hash: ipHash, request_count: 1, window_start: now.toISOString() });
  }

  // 2) Fetch the published article (service role; only expose published ones)
  const { data: article, error: aErr } = await supabase
    .from("articles")
    .select(
      "id, title, excerpt, category, premium, published, published_at, updated_at, key_points, agent_exposure",
    )
    .eq("id", id)
    .maybeSingle();

  if (aErr) {
    console.error("article fetch error", aErr);
    return json({ error: "Lookup failed" }, 500);
  }
  if (!article || !article.published) {
    return json({ error: "Article not found" }, 404);
  }

  // 3) Provenance rows (responses WITHOUT the internal note column)
  const [{ data: sources }, { data: responses }, { data: corrections }] =
    await Promise.all([
      supabase
        .from("article_provenance_sources")
        .select("kind, name, role, org, org_orgnr, doc_type")
        .eq("article_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("article_provenance_responses")
        .select("party_name, party_role, status")
        .eq("article_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("article_provenance_corrections")
        .select("corrected_at, summary")
        .eq("article_id", id)
        .order("corrected_at", { ascending: false }),
    ]);

  const siteUrl = (Deno.env.get("SITE_URL") ?? "https://naernaering.no").replace(
    /\/+$/,
    "",
  );

  const { body, sections } = buildProvenanceResponse({
    siteUrl,
    article: article as unknown as ProvArticle,
    sources: (sources ?? []) as ProvSource[],
    responses: (responses ?? []) as ProvResponse[],
    corrections: (corrections ?? []) as ProvCorrection[],
  });

  // 4) Instrumentation (Trinn 4): best-effort, never blocks the response. No IP.
  try {
    await supabase.from("provenance_access_log").insert({
      article_id: article.id,
      user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      exposure: article.agent_exposure,
      sections,
    });
  } catch (e) {
    console.error("access log insert failed (non-fatal)", e);
  }

  return json(body, 200, { "Cache-Control": "public, max-age=300" });
};

// Guarded so importing this module for tests doesn't start the HTTP listener
// (avoids a port clash with other functions' tests under `deno test`).
if (import.meta.main) {
  Deno.serve(handler);
}
