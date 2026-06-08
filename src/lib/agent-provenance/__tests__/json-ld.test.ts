import { describe, it, expect } from "vitest";
import { buildNewsArticleJsonLd, ARTICLE_BODY_SELECTOR } from "../json-ld";
import type { ProvenanceArticle, ArticleSource } from "../types";

const SITE = "https://naernaering.no";

function baseArticle(over: Partial<ProvenanceArticle> = {}): ProvenanceArticle {
  return {
    id: "abc-123",
    title: "Konkurs i X AS",
    excerpt: "Selskapet begjærte oppbud onsdag.",
    category: "Næringsliv",
    author: "Kari Nordmann",
    image_url: "https://cdn.example.co/x.jpg",
    premium: false,
    published_at: "2026-06-01T08:00:00Z",
    updated_at: "2026-06-02T09:00:00Z",
    key_points: ["Oppbud onsdag", "30 ansatte berørt"],
    agent_exposure: "headline_plus_dek",
    ...over,
  };
}

describe("buildNewsArticleJsonLd", () => {
  it("emits core NewsArticle fields with canonical url", () => {
    const ld = buildNewsArticleJsonLd({ siteUrl: SITE, article: baseArticle() });
    expect(ld["@type"]).toBe("NewsArticle");
    expect(ld.headline).toBe("Konkurs i X AS");
    expect(ld.url).toBe(`${SITE}/sak/abc-123`);
    expect(ld.datePublished).toBe("2026-06-01T08:00:00Z");
    expect(ld.dateModified).toBe("2026-06-02T09:00:00Z");
    expect(ld.inLanguage).toBe("nb-NO");
  });

  it("marks free articles accessible and omits the paywall pointer", () => {
    const ld = buildNewsArticleJsonLd({ siteUrl: SITE, article: baseArticle({ premium: false }) });
    expect(ld.isAccessibleForFree).toBe(true);
    expect(ld.hasPart).toBeUndefined();
  });

  it("signals the hard paywall for premium articles", () => {
    const ld = buildNewsArticleJsonLd({ siteUrl: SITE, article: baseArticle({ premium: true }) });
    expect(ld.isAccessibleForFree).toBe(false);
    expect(ld.hasPart).toEqual({
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: ARTICLE_BODY_SELECTOR,
    });
  });

  it("gates text by agent_exposure", () => {
    const headlineOnly = buildNewsArticleJsonLd({
      siteUrl: SITE,
      article: baseArticle({ agent_exposure: "headline_only" }),
    });
    expect(headlineOnly.description).toBeUndefined();
    expect(headlineOnly.abstract).toBeUndefined();

    const dek = buildNewsArticleJsonLd({
      siteUrl: SITE,
      article: baseArticle({ agent_exposure: "headline_plus_dek" }),
    });
    expect(dek.description).toBe("Selskapet begjærte oppbud onsdag.");
    expect(dek.abstract).toBeUndefined();

    const summary = buildNewsArticleJsonLd({
      siteUrl: SITE,
      article: baseArticle({ agent_exposure: "summary" }),
    });
    expect(summary.description).toBe("Selskapet begjærte oppbud onsdag.");
    expect(summary.abstract).toBe("Oppbud onsdag 30 ansatte berørt");
  });

  it("maps interviewees to mentions with orgnr identifier", () => {
    const sources: ArticleSource[] = [
      { kind: "interviewee", name: "Per Hansen", role: "daglig leder", org: "X AS", org_orgnr: "912345678" },
    ];
    const ld = buildNewsArticleJsonLd({ siteUrl: SITE, article: baseArticle(), sources });
    expect(ld.mentions).toEqual([
      {
        "@type": "Person",
        name: "Per Hansen",
        jobTitle: "daglig leder",
        affiliation: {
          "@type": "Organization",
          name: "X AS",
          identifier: { "@type": "PropertyValue", propertyID: "orgnr", value: "912345678" },
        },
      },
    ]);
  });

  it("maps documents and datasets to citation, not mentions", () => {
    const sources: ArticleSource[] = [
      { kind: "document", name: "Årsregnskap 2025", doc_type: "årsregnskap", org: "Brønnøysund" },
      { kind: "dataset", name: "SSB tabell 08551" },
    ];
    const ld = buildNewsArticleJsonLd({ siteUrl: SITE, article: baseArticle(), sources });
    expect(ld.mentions).toBeUndefined();
    expect(ld.citation).toEqual([
      {
        "@type": "CreativeWork",
        name: "Årsregnskap 2025",
        genre: "årsregnskap",
        publisher: { "@type": "Organization", name: "Brønnøysund" },
      },
      { "@type": "Dataset", name: "SSB tabell 08551" },
    ]);
  });

  it("emits corrections as CorrectionComment", () => {
    const ld = buildNewsArticleJsonLd({
      siteUrl: SITE,
      article: baseArticle(),
      corrections: [{ corrected_at: "2026-06-03T10:00:00Z", summary: "Rettet omsetningstall." }],
    });
    expect(ld.correction).toEqual([
      { "@type": "CorrectionComment", text: "Rettet omsetningstall.", datePublished: "2026-06-03T10:00:00Z" },
    ]);
  });

  it("sets publisher with ethics policy and never leaks affiliation for unknown authors", () => {
    const ld = buildNewsArticleJsonLd({ siteUrl: SITE, article: baseArticle() });
    const publisher = ld.publisher as Record<string, unknown>;
    expect(publisher.ethicsPolicy).toBe(`${SITE}/redaksjonelle-prinsipper`);
    const author = ld.author as Record<string, unknown>;
    expect(author.name).toBe("Kari Nordmann");
    // No matching profile passed → no fabricated worksFor.
    expect(author.worksFor).toBeUndefined();
  });
});
