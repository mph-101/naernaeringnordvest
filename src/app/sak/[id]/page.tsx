import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase-next/server";
import { getArticleJsonLd } from "@/lib/agent-provenance/server";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: article } = await supabase
    .from("articles")
    .select("title, excerpt, image_url, category, published_at, premium")
    .eq("id", id)
    .single();

  if (!article) {
    return { title: "Artikkel ikke funnet" };
  }

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      type: "article",
      publishedTime: article.published_at || undefined,
      images: article.image_url ? [{ url: article.image_url }] : undefined,
    },
    twitter: {
      card: article.image_url ? "summary_large_image" : "summary",
      title: article.title,
      description: article.excerpt || undefined,
      images: article.image_url ? [article.image_url] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;

  // Layer 1 — schema.org/NewsArticle JSON-LD, injected SSR so agents and search
  // engines read journalistic provenance even though the body renders client-side.
  const jsonLd = await getArticleJsonLd(id).catch(() => null);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // Server-rendered, no user-controlled HTML — values are JSON-encoded.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PageClient id={id} />
    </>
  );
}
