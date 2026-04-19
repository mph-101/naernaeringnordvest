import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImagePlus, X, ArrowUp, ArrowDown, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MediaAsset {
  id: string;
  public_url: string;
  alt_text: string;
  caption: string;
  photographer: string;
  source: string | null;
}

interface GalleryItem {
  id: string;
  media_id: string;
  sort_order: number;
  asset: MediaAsset;
}

interface Props {
  articleId: string | null;
}

export const ArticleGalleryEditor = ({ articleId }: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allAssets, setAllAssets] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!articleId) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("article_gallery_items")
      .select("id, media_id, sort_order, asset:media_assets(id, public_url, alt_text, caption, photographer, source)")
      .eq("article_id", articleId)
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return;
    }
    setItems((data as any) || []);
  };

  useEffect(() => { load(); }, [articleId]);

  const openPicker = async () => {
    setPickerOpen(true);
    if (allAssets.length === 0) {
      const { data, error } = await (supabase as any)
        .from("media_assets")
        .select("id, public_url, alt_text, caption, photographer, source")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        toast({ title: "Feil", description: error.message, variant: "destructive" });
        return;
      }
      setAllAssets((data as MediaAsset[]) || []);
    }
  };

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const existingIds = new Set(items.map((i) => i.media_id));
    const base = allAssets.filter((a) => !existingIds.has(a.id));
    if (!q) return base;
    return base.filter((a) =>
      a.caption.toLowerCase().includes(q) ||
      a.alt_text.toLowerCase().includes(q) ||
      a.photographer.toLowerCase().includes(q),
    );
  }, [allAssets, items, search]);

  const addAsset = async (asset: MediaAsset) => {
    if (!articleId) {
      toast({ title: "Lagre artikkelen først", description: "Galleri kan kun legges til etter at artikkelen er lagret.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from("article_gallery_items")
      .insert({ article_id: articleId, media_id: asset.id, sort_order: nextOrder, created_by: user?.id })
      .select("id, media_id, sort_order")
      .single();
    setBusy(false);
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => [...prev, { ...(data as any), asset }]);
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("article_gallery_items").delete().eq("id", id);
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[idx];
    const b = items[j];
    const next = [...items];
    next[idx] = { ...b, sort_order: a.sort_order };
    next[j] = { ...a, sort_order: b.sort_order };
    setItems(next);
    await Promise.all([
      (supabase as any).from("article_gallery_items").update({ sort_order: b.sort_order }).eq("id", a.id),
      (supabase as any).from("article_gallery_items").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-soft space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-headline text-lg font-medium text-headline">Bildegalleri</h3>
        <Button size="sm" variant="outline" onClick={openPicker} disabled={!articleId}>
          <ImagePlus className="w-4 h-4 mr-1" /> Legg til fra arkiv
        </Button>
      </div>

      {!articleId ? (
        <p className="text-sm text-muted-foreground">Lagre artikkelen for å legge til galleri.</p>
      ) : loading ? (
        <div className="flex items-center text-muted-foreground"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Laster…</div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen bilder lagt til. Klikk "Legg til fra arkiv" for å bygge galleri.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.id} className="flex items-center gap-3 p-2 border border-border rounded-lg">
              <img src={it.asset.public_url} alt={it.asset.alt_text} className="w-20 h-14 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-1">{it.asset.caption}</p>
                <p className="text-xs text-muted-foreground">Foto: {it.asset.photographer}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><X className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Velg bilde fra arkivet</DialogTitle>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk…" className="pl-9" />
          </div>
          {filteredAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Ingen tilgjengelige bilder.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredAssets.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={busy}
                  onClick={() => addAsset(a)}
                  className="text-left bg-muted/30 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                >
                  <img src={a.public_url} alt={a.alt_text} className="w-full aspect-video object-cover" loading="lazy" />
                  <div className="p-2">
                    <p className="text-xs line-clamp-2">{a.caption}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Foto: {a.photographer}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>Lukk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
