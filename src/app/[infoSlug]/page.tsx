import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FOOTER_PAGES, FooterPageSlug } from "@/lib/footer-pages";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ infoSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { infoSlug } = await params;
  const page = FOOTER_PAGES[infoSlug as FooterPageSlug];
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: `${page.title} – Nær Næring`,
      description: page.description,
      type: "article",
    },
    robots: page.placeholder ? { index: false, follow: true } : undefined,
  };
}

export default async function InfoPage({ params }: Props) {
  const { infoSlug } = await params;
  const page = FOOTER_PAGES[infoSlug as FooterPageSlug];
  if (!page) notFound();

  return <PageClient page={page} />;
}
