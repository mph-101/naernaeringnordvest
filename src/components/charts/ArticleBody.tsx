import { Fragment, useMemo } from "react";
import { ArticleChart, type ChartData } from "./ArticleChart";

interface ArticleBodyProps {
  html: string;
  className?: string;
}

interface Segment {
  type: "html" | "chart";
  content: string;
  chart?: ChartData;
}

const decodeChart = (encoded: string): ChartData | null => {
  try {
    // Stored as base64-encoded JSON to survive HTML attribute escaping
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json);
    if (!parsed.headers || !parsed.rows) return null;
    return parsed as ChartData;
  } catch {
    return null;
  }
};

/**
 * Splits article HTML into segments at every Nær Næring chart figure
 * (`<figure data-nn-chart="true" data-chart="<base64>">…</figure>`)
 * and renders the chart blocks as live React components while leaving
 * the surrounding HTML untouched.
 */
export const ArticleBody = ({ html, className = "" }: ArticleBodyProps) => {
  const segments = useMemo<Segment[]>(() => {
    if (!html) return [];
    // Match a Nær Næring chart figure regardless of attribute order
    const regex = /<figure\b(?=[^>]*\bdata-nn-chart="true")(?=[^>]*\bdata-chart="([^"]+)")[^>]*>[\s\S]*?<\/figure>/gi;
    const result: Segment[] = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null) {
      if (m.index > lastIndex) {
        result.push({ type: "html", content: html.slice(lastIndex, m.index) });
      }
      const chart = decodeChart(m[1]);
      if (chart) {
        result.push({ type: "chart", content: m[0], chart });
      } else {
        // Fall back to original HTML if decoding failed
        result.push({ type: "html", content: m[0] });
      }
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < html.length) {
      result.push({ type: "html", content: html.slice(lastIndex) });
    }
    // Tag the first <p> in the first HTML segment with `article-dropcap` so
    // CSS ::first-letter can render a magazine-style drop cap. We only touch
    // the very first paragraph of the article — never headings or later
    // paragraphs after a chart/figure.
    const firstHtmlIdx = result.findIndex(
      (s) => s.type === "html" && /<p\b/i.test(s.content),
    );
    if (firstHtmlIdx !== -1) {
      const seg = result[firstHtmlIdx];
      let injected = false;
      const updated = seg.content.replace(
        /<p\b([^>]*)>/i,
        (_match, attrs: string) => {
          if (injected) return _match;
          injected = true;
          const classMatch = attrs.match(/\bclass="([^"]*)"/i);
          if (classMatch) {
            const newAttrs = attrs.replace(
              /\bclass="([^"]*)"/i,
              `class="$1 article-dropcap"`,
            );
            return `<p${newAttrs}>`;
          }
          return `<p${attrs} class="article-dropcap">`;
        },
      );
      result[firstHtmlIdx] = { ...seg, content: updated };
    }
    return result;
  }, [html]);

  return (
    <div
      className={[
        "prose prose-lg dark:prose-invert max-w-none font-body",
        // More breathing room: looser line-height, very generous paragraph spacing
        "prose-p:leading-[2.05] prose-p:text-foreground prose-p:my-10 md:prose-p:my-12",
        "prose-p:text-base md:prose-p:text-lg",
        // Subheadings: clear separation, editorial weight
        "prose-h2:font-headline prose-h2:text-headline prose-h2:font-bold",
        "prose-h2:text-2xl md:prose-h2:text-[1.7rem] prose-h2:leading-tight",
        "prose-h2:mt-16 md:prose-h2:mt-20 prose-h2:mb-6",
        "prose-h3:font-headline prose-h3:text-headline prose-h3:font-semibold",
        "prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-5",
        // Lists, quotes, links
        "prose-li:my-3 prose-li:leading-[1.9]",
        "prose-blockquote:border-l-accent prose-blockquote:text-headline prose-blockquote:font-medium prose-blockquote:my-10",
        "prose-a:text-accent prose-a:underline-offset-4 hover:prose-a:opacity-80",
        "prose-strong:text-headline prose-strong:font-semibold",
        className,
      ].join(" ")}
    >
      {segments.map((seg, i) =>
        seg.type === "chart" && seg.chart ? (
          <ArticleChart key={i} data={seg.chart} />
        ) : (
          <Fragment key={i}>
            <div dangerouslySetInnerHTML={{ __html: seg.content }} />
          </Fragment>
        ),
      )}
    </div>
  );
};
