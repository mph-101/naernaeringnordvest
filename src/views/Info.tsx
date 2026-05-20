import { useEffect } from "react";
import { useLocation, Navigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Header } from "@/components/Header";
import { FOOTER_PAGES, FooterPageSlug } from "@/lib/footer-pages";
import { SiteFooter } from "@/components/SiteFooter";

const Info = () => {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, "").replace(/\/$/, "") as FooterPageSlug;
  const page = FOOTER_PAGES[slug];

  useEffect(() => {
    if (!page) return;
    const fullTitle = `${page.title} – Nær Næring`;
    const url = `${window.location.origin}/${page.slug}`;

    document.title = fullTitle;

    const setMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };

    setMeta('meta[name="description"]', "name", "description", page.description);
    setMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", page.description);
    setMeta('meta[property="og:url"]', "property", "og:url", url);
    setMeta('meta[property="og:type"]', "property", "og:type", "article");

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    // Placeholder pages should not be indexed until real content lands.
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (page.placeholder) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.setAttribute("name", "robots");
        document.head.appendChild(robots);
      }
      robots.setAttribute("content", "noindex, follow");
    } else if (robots) {
      robots.remove();
    }

    return () => {
      // Clean up the noindex tag so it doesn't bleed into other routes.
      const r = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (r && r.getAttribute("content")?.includes("noindex")) r.remove();
    };
  }, [page]);

  if (!page) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showSearch={false} />
      <main className="flex-1">
        <article className="max-w-2xl mx-auto px-6 py-12 md:py-16">
          <Link
            to="/"
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
                <Link to="/kontakt" className="text-primary hover:underline">
                  kontakte oss
                </Link>{" "}
                hvis du har spørsmål.
              </p>
              <Link
                to="/"
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
};

export default Info;