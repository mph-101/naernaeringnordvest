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
      <div className="flex items-stretch gap-3.5 p-3 sm:p-4">
        <div className="shrink-0 self-center">
          {image_url ? (
            <img
              src={image_url}
              alt={name}
              width={64}
              height={64}
              style={{ width: 64, height: 64 }}
              className="flex-shrink-0 rounded-lg object-cover ring-1 ring-border !max-w-[64px] !max-h-[64px]"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <User className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex flex-col justify-center self-center">
          <p className="font-headline font-bold text-headline text-[1.0625rem] sm:text-xl leading-[1.15] tracking-[-0.01em] m-0">
            {name}
          </p>
          {role && (
            <p className="font-body font-medium text-[0.78125rem] sm:text-[0.875rem] uppercase tracking-[0.06em] text-accent leading-[1.2] mt-[2px] sm:mt-[3px]">
              {role}
            </p>
          )}
        </div>
      </div>
      {quote && (
        <blockquote className="px-3 sm:px-4 pb-3 sm:pb-4 -mt-1 font-body text-sm text-foreground/80 italic border-l-2 border-accent/40 ml-3 sm:ml-4 pl-3">
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