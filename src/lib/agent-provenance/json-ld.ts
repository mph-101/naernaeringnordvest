// Pure builder for schema.org/NewsArticle JSON-LD (Layer 1 of agent-provenance).
//
// Framework-free and side-effect-free so it can be unit-tested in CI (vitest
// runs over src/**). The server wiring lives in ./server.ts; the SSR injection
// in src/app/sak/[id]/page.tsx.
//
// Principles enforced here:
//   - Never echo body text. `description` is the dek (excerpt), already public
//     in OG tags. `agent_exposure` gates how much text we emit.
//   - Hard paywall: premium articles get isAccessibleForFree:false + hasPart
//     cssSelector against the body element, signalling paid content to Google
//     without cloaking.
//   - Only factual, verifiable fields. No self-reported scores.

import type {
  ArticleCorrection,
  ArticleSource,
  AuthorProfile,
  ProvenanceArticle,
} from "./types";

// The article body element (ArticleBody.tsx) already carries a stable
// `.article-body` class — the paywall hasPart pointer targets it directly rather
// than Tailwind's generic `prose` class.
export const ARTICLE_BODY_SELECTOR = ".article-body";

export const PUBLISHER_NAME = "Nær Næring Nordvest";

export function buildPublisher(siteUrl: string): Record<string, unknown> {
  return {
    "@type": "NewsMediaOrganization",
    name: PUBLISHER_NAME,
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/logo.png`,
    },
    // Editorial standards: Vær Varsom-plakaten + Redaktørplakaten, described on
    // the public principles page.
    ethicsPolicy: `${siteUrl}/redaksjonelle-prinsipper`,
    correctionsPolicy: `${siteUrl}/redaksjonelle-prinsipper`,
  };
}

function keyPointsToText(keyPoints: unknown): string | undefined {
  if (!Array.isArray(keyPoints)) return undefined;
  const parts = keyPoints
    .map((p) => (typeof p === "string" ? p : ""))
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

function buildAuthor(
  authorName: string,
  profile: AuthorProfile | undefined,
  publisher: Record<string, unknown>,
): Record<string, unknown> {
  const author: Record<string, unknown> = {
    "@type": "Person",
    name: profile?.name || authorName,
  };
  if (profile?.jobTitle) author.jobTitle = profile.jobTitle;
  if (profile?.url) author.url = profile.url;
  // Staff with a matching profile work for the publisher. External contributors
  // (no profile) get name only — we don't fabricate an affiliation.
  if (profile) {
    author.worksFor = profile.worksForName
      ? { "@type": "NewsMediaOrganization", name: profile.worksForName }
      : publisher;
  }
  return author;
}

// document/dataset sources → citation; interviewees → mentions.
function buildCitations(sources: ArticleSource[]): unknown[] {
  return sources
    .filter((s) => s.kind === "document" || s.kind === "dataset")
    .map((s) => {
      if (s.kind === "dataset") {
        return { "@type": "Dataset", name: s.name };
      }
      const work: Record<string, unknown> = {
        "@type": "CreativeWork",
        name: s.name,
      };
      if (s.doc_type) work.genre = s.doc_type;
      if (s.org) work.publisher = { "@type": "Organization", name: s.org };
      return work;
    });
}

function buildMentions(sources: ArticleSource[]): unknown[] {
  return sources
    .filter((s) => s.kind === "interviewee")
    .map((s) => {
      const person: Record<string, unknown> = {
        "@type": "Person",
        name: s.name,
      };
      if (s.role) person.jobTitle = s.role;
      if (s.org) {
        const org: Record<string, unknown> = {
          "@type": "Organization",
          name: s.org,
        };
        if (s.org_orgnr) {
          // Norwegian org number, machine-linkable to Brønnøysund/mr_companies.
          org.identifier = {
            "@type": "PropertyValue",
            propertyID: "orgnr",
            value: s.org_orgnr,
          };
        }
        person.affiliation = org;
      }
      return person;
    });
}

function buildCorrections(corrections: ArticleCorrection[]): unknown[] {
  return corrections.map((c) => ({
    "@type": "CorrectionComment",
    text: c.summary,
    datePublished: c.corrected_at,
  }));
}

export interface BuildJsonLdInput {
  siteUrl: string;
  article: ProvenanceArticle;
  sources?: ArticleSource[];
  corrections?: ArticleCorrection[];
  author?: AuthorProfile;
}

export function buildNewsArticleJsonLd(
  input: BuildJsonLdInput,
): Record<string, unknown> {
  const { siteUrl, article, sources = [], corrections = [], author } = input;
  const url = `${siteUrl}/sak/${article.id}`;
  const publisher = buildPublisher(siteUrl);
  const exposure = article.agent_exposure;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "nb-NO",
    isAccessibleForFree: !article.premium,
    author: buildAuthor(article.author, author, publisher),
    publisher,
  };

  if (article.category) jsonLd.articleSection = article.category;
  if (article.published_at) jsonLd.datePublished = article.published_at;
  if (article.updated_at) jsonLd.dateModified = article.updated_at;
  if (article.image_url) jsonLd.image = [article.image_url];

  // Text exposure gate. headline_only emits no dek/summary.
  if (exposure !== "headline_only" && article.excerpt) {
    jsonLd.description = article.excerpt;
  }
  if (exposure === "summary") {
    const abstract = keyPointsToText(article.key_points);
    if (abstract) jsonLd.abstract = abstract;
  }

  // Paywall signal: point Google at the body element it should treat as paid.
  if (article.premium) {
    jsonLd.hasPart = {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: ARTICLE_BODY_SELECTOR,
    };
  }

  const citation = buildCitations(sources);
  if (citation.length) jsonLd.citation = citation;

  const mentions = buildMentions(sources);
  if (mentions.length) jsonLd.mentions = mentions;

  const correction = buildCorrections(corrections);
  if (correction.length) jsonLd.correction = correction;

  return jsonLd;
}
