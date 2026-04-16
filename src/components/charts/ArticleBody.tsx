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
    return result;
  }, [html]);

  return (
    <div className={`prose prose-lg dark:prose-invert max-w-none font-body ${className}`}>
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
