import { useMemo } from "react";
import { diffWords } from "diff";

interface InlineDiffProps {
  original: string;
  improved: string;
  className?: string;
}

/** Strip HTML tags but keep block boundaries as line breaks for readable diffing. */
function htmlToPlain(html: string): string {
  return html
    .replace(/<\s*(p|h[1-6]|li|blockquote|br|div)[^>]*>/gi, "\n")
    .replace(/<\/\s*(p|h[1-6]|li|blockquote|div)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const InlineDiff = ({ original, improved, className = "" }: InlineDiffProps) => {
  const parts = useMemo(() => {
    const a = htmlToPlain(original);
    const b = htmlToPlain(improved);
    return diffWords(a, b);
  }, [original, improved]);

  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert font-body p-3 rounded-lg border border-border bg-background whitespace-pre-wrap leading-relaxed ${className}`}
    >
      {parts.map((part, i) => {
        if (part.added) {
          return (
            <span
              key={i}
              className="bg-accent/25 text-foreground rounded px-0.5"
              title="Lagt til"
            >
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span
              key={i}
              className="bg-destructive/20 text-foreground/70 line-through rounded px-0.5"
              title="Fjernet"
            >
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </div>
  );
};
