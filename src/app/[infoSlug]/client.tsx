"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import type { FooterPage } from "@/lib/footer-pages";

export function InfoPageClient({ page }: { page: FooterPage }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showSearch={false} />
      <main className="flex-1">
        <article className="max-w-2xl mx-auto px-6 py-12 md:py-16">
          <Link
            href="/"
            className="inline-block text-sm text-muted-foreground hover:text-foreground font-body mb-6 transition-colors"
          >
            ← Til forsiden
          </Link>
          <h1 className="font-headline text-3xl md:text-4xl font-semibold text-headline mb-6 leading-tight">
            {page.title}
          </h1>
          {page.placeholder ? (
            <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
              <p className="font-body text-base text-foreground/90 mb-2">
                Denne siden kommer snart.
              </p>
              <p className="font-body text-sm text-muted-foreground mb-6">
                Vi jobber med fullstendig innhold. I mellomtiden kan du{" "}
                <Link href="/kontakt" className="text-primary hover:underline">
                  kontakte oss
                </Link>{" "}
                hvis du har spørsmål.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-body hover:opacity-90 transition-opacity"
              >
                Til forsiden
              </Link>
            </div>
          ) : (
            <div className="prose prose-neutral dark:prose-invert max-w-none font-body
              prose-headings:font-headline prose-headings:text-headline
              prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-2
              prose-p:leading-relaxed prose-p:text-foreground/90
              prose-li:text-foreground/90
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground">
              <ReactMarkdown>{page.body}</ReactMarkdown>
            </div>
          )}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
