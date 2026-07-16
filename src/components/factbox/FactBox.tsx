import logoImg from "@/assets/logo.png";

export type FactBoxVariant = "rich" | "image" | "keyvalue";

export interface FactBoxKeyValueItem {
  label: string;
  value: string;
}

export interface FactBoxData {
  /** Database id — present for boxes loaded from the library */
  id?: string;
  variant: FactBoxVariant;
  title: string;
  /** HTML — used by 'rich' and 'image' variants */
  body?: string;
  /** Image URL — used by 'image' variant */
  image_url?: string | null;
  image_caption?: string | null;
  /** Used by 'keyvalue' variant */
  items?: FactBoxKeyValueItem[];
  tags?: string[];
}

interface FactBoxProps {
  data: FactBoxData;
  className?: string;
}

/**
 * Editorial fact box — used both inside the CMS preview and in the published
 * article. Three layout variants share a common Nær Næring-branded chrome.
 */
export const FactBox = ({ data, className = "" }: FactBoxProps) => {
  const { variant, title, body, image_url, image_caption, items } = data;

  return (
    <aside
      className={`my-6 rounded-xl border border-border bg-card overflow-hidden not-prose ${className}`}
      data-nn-factbox="true"
    >
      {variant === "image" && image_url && (
        <figure className="relative">
          <img
            src={image_url}
            alt={image_caption || title}
            className="w-full h-48 sm:h-56 object-cover"
            loading="lazy"
          />
          {image_caption && (
            <figcaption className="px-4 sm:px-5 pt-2 text-xs text-muted-foreground italic font-body">
              {image_caption}
            </figcaption>
          )}
        </figure>
      )}

      <div className="p-4 sm:p-5">
        <header className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.625rem] font-headline font-semibold text-primary-ink">
            Faktaboks
          </span>
        </header>

        <h3 className="font-headline text-lg sm:text-xl font-semibold text-headline leading-tight mb-2">
          {title}
        </h3>

        {(variant === "rich" || variant === "image") && body && (
          <div
            className="font-body text-sm sm:text-base text-foreground/90 prose prose-sm dark:prose-invert max-w-none [&>p]:my-1.5 [&>ul]:my-1.5 [&>ol]:my-1.5"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        )}

        {variant === "keyvalue" && items && items.length > 0 && (
          <dl className="divide-y divide-border/60 font-body text-sm">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between gap-3 py-2">
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="text-foreground font-medium text-right">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/60">
          <img
            src={logoImg as unknown as string}
            alt="Nær Næring"
            className="w-4 h-4 object-contain dark:bg-white dark:rounded-full dark:p-0.5"
            width={16}
            height={16}
          />
          <span className="font-headline text-xs font-semibold text-foreground/70">Nær Næring</span>
        </div>
      </div>
    </aside>
  );
};

/** Encode a fact box payload for safe embedding inside an HTML attribute */
export const encodeFactBox = (data: FactBoxData): string => {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
};

/** Decode the base64-encoded payload back into a FactBoxData object */
export const decodeFactBox = (encoded: string): FactBoxData | null => {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json);
    if (!parsed.title || !parsed.variant) return null;
    return parsed as FactBoxData;
  } catch {
    return null;
  }
};
