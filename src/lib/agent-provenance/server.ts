// Server-only wiring for the JSON-LD layer: fetch the article + provenance rows
// and hand them to the pure builder. Resilient to the window before the
// provenance migration is applied — provenance is additive, never required.

import { createSupabaseServer } from "@/lib/supabase-next/server";
import { getSiteUrl } from "@/lib/site-url";
import { buildNewsArticleJsonLd } from "./json-ld";
import type {
  ArticleCorrection,
  ArticleSource,
  AuthorProfile,
  ProvenanceArticle,
} from "./types";

type Supabase = Awaited<ReturnType<typeof createSupabaseServer>>;

// The provenance tables and articles.agent_exposure aren't in the generated
// Database types until the migration is applied and `supabase gen types` is
// re-run. Read them through an untyped view of the client until then. Every
// access is shape-tolerant (defaults on missing data), so an un-migrated DB
// degrades to a valid JSON-LD with core fields only.
type UntypedQuery = {
  select: (cols: string) => {
    eq: (col: string, val: string) => UntypedQuery & {
      order: (col: string, opts?: { ascending?: boolean }) => Promise<{ data: unknown[] | null; error: unknown }>;
      limit: (n: number) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
    };
  };
};
function db(supabase: Supabase, table: string): UntypedQuery {
  return (supabase as unknown as { from: (t: string) => UntypedQuery }).from(table);
}

const CORE_COLS =
  "id, title, excerpt, category, author, image_url, premium, published_at, updated_at, key_points, agent_exposure";

async function fetchArticleCore(
  supabase: Supabase,
  id: string,
): Promise<ProvenanceArticle | null> {
  const { data } = await db(supabase, "articles")
    .select(CORE_COLS)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const a = data as Record<string, unknown>;
  return {
    ...(a as unknown as ProvenanceArticle),
    // Pre-migration the column is absent → conservative default.
    agent_exposure:
      (a.agent_exposure as ProvenanceArticle["agent_exposure"]) ??
      "headline_plus_dek",
  };
}

async function fetchSources(
  supabase: Supabase,
  id: string,
): Promise<ArticleSource[]> {
  const { data } = await db(supabase, "article_provenance_sources")
    .select("kind, name, role, org, org_orgnr, doc_type")
    .eq("article_id", id)
    .order("sort_order", { ascending: true });
  return (data as ArticleSource[] | null) ?? [];
}

async function fetchCorrections(
  supabase: Supabase,
  id: string,
): Promise<ArticleCorrection[]> {
  const { data } = await db(supabase, "article_provenance_corrections")
    .select("corrected_at, summary")
    .eq("article_id", id)
    .order("corrected_at", { ascending: false });
  return (data as ArticleCorrection[] | null) ?? [];
}

// Best-effort enrichment: articles.author is free text, not an FK. Match it to a
// profile by display_name to add jobTitle + a link to the journalist page.
async function fetchAuthorProfile(
  supabase: Supabase,
  authorName: string | undefined,
  siteUrl: string,
): Promise<AuthorProfile | undefined> {
  if (!authorName) return undefined;
  const { data } = await db(supabase, "profiles")
    .select("display_name, title, username")
    .eq("display_name", authorName)
    .limit(1)
    .maybeSingle();
  if (!data) return undefined;
  const p = data as {
    display_name: string | null;
    title: string | null;
    username: string | null;
  };
  return {
    name: p.display_name ?? authorName,
    jobTitle: p.title ?? undefined,
    url: p.username ? `${siteUrl}/journalist/${p.username}` : undefined,
  };
}

// Returns the schema.org/NewsArticle JSON-LD object for an article, or null if
// the article doesn't exist.
export async function getArticleJsonLd(
  id: string,
): Promise<Record<string, unknown> | null> {
  const siteUrl = getSiteUrl();
  const supabase = await createSupabaseServer();

  const article = await fetchArticleCore(supabase, id);
  if (!article) return null;

  const [sources, corrections, author] = await Promise.all([
    fetchSources(supabase, id),
    fetchCorrections(supabase, id),
    fetchAuthorProfile(supabase, article.author, siteUrl),
  ]);

  return buildNewsArticleJsonLd({ siteUrl, article, sources, corrections, author });
}
