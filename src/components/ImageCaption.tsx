import { useState } from "react";

interface ImageCaptionProps {
  caption?: string | null;
  credit?: string | null;
  source?: string | null;
  className?: string;
}

/**
 * Image caption + photo byline shown under article images (hero and inline).
 *
 * Default state is "partial": the caption is truncated to a single line with a
 * "vis mer" toggle that expands to the full caption plus the photo byline
 * ("Foto: …"). If there is no caption (credit only), the byline is shown
 * directly without a toggle.
 */
export const ImageCaption = ({ caption, credit, source, className = "" }: ImageCaptionProps) => {
  const [expanded, setExpanded] = useState(false);

  const cap = caption?.trim() || "";
  // Some stored credits already include a "Foto:" prefix — strip it so we don't
  // render "Foto: Foto: …" when we prepend our own label below.
  const cred = (credit?.trim() || "").replace(/^foto:\s*/i, "");
  const src = source?.trim() || "";

  // Nothing to show
  if (!cap && !cred) return null;

  const byline = cred ? `Foto: ${cred}${src ? ` · ${src}` : ""}` : "";

  // Credit only — no caption to truncate, just show the byline.
  if (!cap) {
    return (
      <figcaption className={`mt-2 text-xs text-muted-foreground ${className}`}>
        {byline}
      </figcaption>
    );
  }

  return (
    <figcaption className={`mt-2 text-sm text-muted-foreground ${className}`}>
      {expanded ? (
        <>
          <span className="text-foreground">{cap}</span>
          {byline && <span className="block text-xs mt-1">{byline}</span>}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="block text-xs mt-1 text-accent hover:underline"
          >
            Vis mindre
          </button>
        </>
      ) : (
        <span className="flex items-baseline gap-2">
          <span className="text-foreground truncate min-w-0">{cap}</span>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-xs text-accent hover:underline whitespace-nowrap flex-shrink-0"
          >
            Vis mer
          </button>
        </span>
      )}
    </figcaption>
  );
};
