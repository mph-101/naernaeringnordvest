import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryItem {
  id: string;
  asset: {
    id: string;
    public_url: string;
    alt_text: string;
    caption: string;
    photographer: string;
    source: string | null;
  };
}

interface Props {
  articleId: string;
}

export const ArticleGallery = ({ articleId }: Props) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("article_gallery_items")
        .select("id, asset:media_assets(id, public_url, alt_text, caption, photographer, source)")
        .eq("article_id", articleId)
        .order("sort_order", { ascending: true });
      if (!cancelled) {
        setItems((data as any) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [articleId]);

  if (loading || items.length === 0) return null;

  const current = items[active]?.asset;
  if (!current) return null;

  const prev = () => setActive((i) => (i - 1 + items.length) % items.length);
  const next = () => setActive((i) => (i + 1) % items.length);

  return (
    <figure className="my-12 animate-fade-up">
      <div className="relative bg-muted rounded-lg overflow-hidden">
        <img
          src={current.public_url}
          alt={current.alt_text}
          className="w-full max-h-[70vh] object-contain bg-background"
        />
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Forrige bilde"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background shadow"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Neste bilde"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background shadow"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-2 right-3 px-2 py-0.5 rounded-full bg-background/80 text-xs">
              {active + 1} / {items.length}
            </div>
          </>
        )}
      </div>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        <span className="text-foreground">{current.caption}</span>
        <span className="block text-xs mt-1">
          Foto: {current.photographer}
          {current.source ? ` · ${current.source}` : ""}
        </span>
      </figcaption>
      {items.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {items.map((it, idx) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setActive(idx)}
              className={`flex-shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-colors ${
                idx === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Vis bilde ${idx + 1}`}
            >
              <img src={it.asset.public_url} alt={it.asset.alt_text} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
};
