import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Search, Trash2, Pencil, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "./ImageUpload";

interface MediaAsset {
  id: string;
  public_url: string;
  storage_path: string;
  bucket: string;
  alt_text: string;
  caption: string;
  photographer: string;
  source: string | null;
  created_at: string;
  uploaded_by: string;
}

export const MediaArchive = () => {
  const { toast } = useToast();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    } else {
      setAssets((data as MediaAsset[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) =>
      a.caption.toLowerCase().includes(q) ||
      a.alt_text.toLowerCase().includes(q) ||
      a.photographer.toLowerCase().includes(q) ||
      (a.source ?? "").toLowerCase().includes(q),
    );
  }, [assets, search]);

  const handleDelete = async (asset: MediaAsset) => {
    if (!confirm(`Slette bildet "${asset.caption}"? Dette fjerner det fra arkivet og koblede gallerier.`)) return;
    const { error: dbErr } = await (supabase as any).from("media_assets").delete().eq("id", asset.id);
    if (dbErr) {
      toast({ title: "Feil", description: dbErr.message, variant: "destructive" });
      return;
    }
    // Best-effort storage cleanup
    await supabase.storage.from(asset.bucket).remove([asset.storage_path]).catch(() => {});
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    toast({ title: "Slettet" });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const altOk = editing.alt_text.trim().length > 0;
    const capOk = editing.caption.trim().length > 0;
    const photoOk = editing.photographer.trim().length > 0;
    if (!altOk || !capOk || !photoOk) {
      toast({ title: "Manglende felter", description: "Alt-tekst, bildetekst og fotograf er påkrevd.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("media_assets")
      .update({
        alt_text: editing.alt_text.trim(),
        caption: editing.caption.trim(),
        photographer: editing.photographer.trim(),
        source: editing.source?.trim() || null,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lagret" });
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-headline text-2xl font-medium text-headline">Mediearkiv</h2>
          <p className="text-sm text-muted-foreground mt-1">Sentralt arkiv over alle bilder med kreditering og metadata.</p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 border border-border space-y-4">
        <h3 className="font-headline text-lg font-medium">Last opp nytt bilde</h3>
        <ImageUpload onUpload={() => {}} onUploadWithMeta={() => load()} />
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Søk i bildetekst, fotograf eller kilde…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Laster…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
          <p>Ingen bilder funnet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="bg-card rounded-lg border border-border overflow-hidden group">
              <div className="aspect-video bg-muted overflow-hidden">
                <img src={a.public_url} alt={a.alt_text} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm line-clamp-2 text-foreground">{a.caption}</p>
                <p className="text-xs text-muted-foreground">Foto: {a.photographer}{a.source ? ` · ${a.source}` : ""}</p>
                <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" onClick={() => setEditing({ ...a })}>
                    <Pencil className="w-3 h-3 mr-1" /> Rediger
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(a)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Slett
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rediger bildemetadata</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <img src={editing.public_url} alt={editing.alt_text} className="w-full h-40 object-cover rounded" />
              <div>
                <Label>Alt-tekst *</Label>
                <Input value={editing.alt_text} onChange={(e) => setEditing({ ...editing, alt_text: e.target.value })} />
              </div>
              <div>
                <Label>Bildetekst *</Label>
                <Textarea value={editing.caption} onChange={(e) => setEditing({ ...editing, caption: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Fotograf *</Label>
                <Input value={editing.photographer} onChange={(e) => setEditing({ ...editing, photographer: e.target.value })} />
              </div>
              <div>
                <Label>Kilde / lisens</Label>
                <Input value={editing.source ?? ""} onChange={(e) => setEditing({ ...editing, source: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Avbryt</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Lagrer…</> : "Lagre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
