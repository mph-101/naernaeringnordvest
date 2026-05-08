import { User } from "lucide-react";

export interface SourceCardData {
  name: string;
  role?: string;
  image_url?: string | null;
  quote?: string;
}

interface SourceCardProps {
  data: SourceCardData;
  className?: string;
}

/**
 * Editorial source-presentation card — shows a portrait, name and role
 * for a person quoted in the article. Used both inside the CMS editor
 * (via a TipTap node-view) and rendered statically inside published
 * article HTML.
 */
export const SourceCard = ({ data, className = "" }: SourceCardProps) => {
  const { name, role, image_url, quote } = data;
  return (
    <aside
      data-nn-source-card="true"
      className={`not-prose my-6 rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <div className="shrink-0">
          {image_url ? (
            <img
              src={image_url}
              alt={name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover ring-1 ring-border"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <User className="w-7 h-7" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-headline font-bold text-headline text-base sm:text-lg leading-tight">
            {name}
          </p>
          {role && (
            <p className="font-body text-sm sm:text-base text-accent mt-0.5 leading-snug">
              {role}
            </p>
          )}
        </div>
      </div>
      {quote && (
        <blockquote className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1 font-body text-sm sm:text-base text-foreground/80 italic border-l-2 border-accent/40 ml-4 sm:ml-5 pl-3">
          «{quote}»
        </blockquote>
      )}
    </aside>
  );
};

/** Encode a source-card payload for safe embedding inside an HTML attribute */
export const encodeSourceCard = (data: SourceCardData): string => {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
};

/** Decode the base64-encoded payload back into a SourceCardData object */
export const decodeSourceCard = (encoded: string): SourceCardData | null => {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json);
    if (!parsed.name) return null;
    return parsed as SourceCardData;
  } catch {
    return null;
  }
};