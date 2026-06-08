// Shared types for the agent-provenance layer (JSON-LD + /provenance endpoint).
// Mirrors the columns in migration 20260608120000_agent_provenance_schema.sql
// (tables article_provenance_sources / _responses / _corrections).

export type AgentExposure = "headline_only" | "headline_plus_dek" | "summary";
export type ArticleSourceKind = "interviewee" | "document" | "dataset";
export type ArticleResponseStatus =
  | "responded"
  | "declined"
  | "no_reply"
  | "not_applicable";

export interface ArticleSource {
  kind: ArticleSourceKind;
  name: string;
  role?: string | null;
  org?: string | null;
  org_orgnr?: string | null;
  doc_type?: string | null;
}

// Public projection of article_responses — NOTE: the internal `note` column is
// deliberately absent here and must never be added to this type.
export interface ArticleResponsePublic {
  party_name: string;
  party_role?: string | null;
  status: ArticleResponseStatus;
}

export interface ArticleCorrection {
  corrected_at: string;
  summary: string;
}

// The subset of `articles` the provenance layer reads.
export interface ProvenanceArticle {
  id: string;
  title: string;
  excerpt?: string | null;
  category?: string | null;
  author: string;
  image_url?: string | null;
  premium: boolean;
  published_at?: string | null;
  updated_at?: string | null;
  key_points?: unknown; // Json — usually string[]
  agent_exposure: AgentExposure;
}

// Optional enrichment when the free-text `articles.author` matches a profile.
export interface AuthorProfile {
  name: string;
  jobTitle?: string | null;
  url?: string | null; // /journalist/{username}
  worksForName?: string | null;
}
