import type { Tables } from "@/integrations/supabase/types";
import { getArticleImage } from "@/lib/articles";

type ArticleRow = Tables<"articles">;
type ArticleType = "article" | "video" | "podcast";

export const PUBLISHED_ARTICLE_SELECT = [
  "id",
  "title",
  "title_en",
  "excerpt",
  "excerpt_en",
  "body",
  "body_en",
  "category",
  "author",
  "type",
  "premium",
  "read_time",
  "key_points",
  "key_points_en",
  "published_at",
  "image_url",
].join(", ");

export interface UiArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  sport?: string;
  readTime: string;
  publishedAt: string;
  publishedAtRaw: string | null;
  author: string;
  type: ArticleType;
  premium: boolean;
  keyPoints: string[];
  body: string;
  image?: string;
}

export const stripHtml = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const parseKeyPoints = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
};

const getReadTimeSuffix = (language: "no" | "en", type: string) => {
  if (type === "video") return language === "no" ? "min video" : "min watch";
  if (type === "podcast") return language === "no" ? "min lytting" : "min listen";
  return language === "no" ? "min lesing" : "min read";
};

export const estimateReadTime = (html: string, language: "no" | "en", type: string = "article") => {
  const wordCount = stripHtml(html)
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = Math.max(1, Math.ceil(wordCount / 220));
  return `${minutes} ${getReadTimeSuffix(language, type)}`;
};

export const formatPublishedAt = (publishedAt: string | null, language: "no" | "en") => {
  if (!publishedAt) return language === "no" ? "Nettopp publisert" : "Just published";

  const publishedDate = new Date(publishedAt);
  const diffMs = Date.now() - publishedDate.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

  if (diffHours < 24) {
    if (language === "no") {
      return diffHours === 1 ? "1 time siden" : `${diffHours} timer siden`;
    }
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }

  return publishedDate.toLocaleDateString(language === "no" ? "nb-NO" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const toUiArticle = (article: ArticleRow, language: "no" | "en"): UiArticle => {
  const body = language === "en" && article.body_en ? article.body_en : article.body;
  const excerpt =
    (language === "en" && article.excerpt_en ? article.excerpt_en : article.excerpt) || stripHtml(body).slice(0, 180);
  const keyPoints =
    language === "en" && parseKeyPoints(article.key_points_en).length > 0
      ? parseKeyPoints(article.key_points_en)
      : parseKeyPoints(article.key_points);

  return {
    id: article.id,
    title: language === "en" && article.title_en ? article.title_en : article.title,
    excerpt,
    category: article.category,
    readTime: article.read_time || estimateReadTime(body, language, article.type),
    publishedAt: formatPublishedAt(article.published_at, language),
    publishedAtRaw: article.published_at,
    author: article.author,
    type: (article.type as ArticleType) || "article",
    premium: article.premium,
    keyPoints,
    body,
    image: article.image_url || undefined,
  };
};

export const getArticleVisual = (article: Pick<UiArticle, "id" | "category" | "image">) =>
  article.image ? `url(${article.image})` : getArticleImage(article.id, article.category);