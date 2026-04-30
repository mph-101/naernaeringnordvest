import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Megaphone, Eye, EyeOff } from "lucide-react";
import { ImageUpload } from "./ImageUpload";

interface NativeAd {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  image_url: string | null;
  sponsor_name: string;
  sponsor_logo_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  pinned_position: number;
  active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

const emptyForm: Omit<NativeAd, "id" | "created_at" | "updated_at"> = {
  title: "",
  excerpt: "",
  body: "",
  image_url: null,
  sponsor_name: "",
  sponsor_logo_url: null,
  cta_label: "Les mer",
  cta_url: "",
  pinned_position: 2,
  active: true,
  start_at: null,
  end_at: null,
};

export const NativeAdsManager = () => {
  const { toast } = useToast();
  const [ads, setAds] = useState<NativeAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("native_ads" as any)
      .select("*")
      .order("pinned_position", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    } else {
      setAds((data || []) as unknown as NativeAd[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (ad: NativeAd) => {
    setEditingId(ad.id);
    setForm({
      title: ad.title,
      excerpt: ad.excerpt,
      body: ad.body,
      image_url: ad.image_url,
      sponsor_name: ad.sponsor_name,
      sponsor_logo_url: ad.sponsor_logo_url,
      cta_label: ad.cta_label ?? "",
      cta_url: ad.cta_url ?? "",
      pinned_position: ad.pinned_position,
      active: ad.active,
      start_at: ad.start_at,
      end_at: ad.end_at,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.sponsor_name.trim()) {
      toast({ title: "Mangler felter", description: "Tittel og annonsør er påkrevd.", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      cta_label: form.cta_label?.trim() || null,
      cta_url: form.cta_url?.trim() || null,
      start_at: form.start_at || null,
      end_at: form.end_at || null,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from("native_ads" as any).update(payload).eq("id", editingId));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      ({ error } = await supabase.from("native_ads" as any).insert({ ...payload, created_by: user?.id }));
    }
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "Oppdatert" : "Opprettet", description: "Native-annonsen er lagret." });
    setOpen(false);
    load();
  };

  const toggleActive = async (ad: NativeAd) => {
    const { error } = await supabase.from("native_ads" as any).update({ active: !ad.active }).eq("id", ad.id);
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const remove = async (ad: NativeAd) => {
    if (!confirm(`Slette annonsen «${ad.title}»?`)) return;
    const { error } = await supabase.from("native_ads" as any).delete().eq("id", ad.id);
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Slettet", description: "Annonsen er fjernet." });
    load();
  };

  const toLocalInput = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-headline flex items-center gap-2">
            <Megaphone className="w-6 h-6" />
            Native-annonser
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Sponset innhold som tydelig merkes og festes til en plassering i nyhetsflyten.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Ny native-annonse
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : ads.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-soft">
          <p className="text-muted-foreground font-body mb-4">Ingen native-annonser ennå</p>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Opprett din første
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-soft overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body">Tittel</th>
                <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body">Annonsør</th>
                <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body">Posisjon</th>
                <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body">Status</th>
                <th className="text-right px-6 py-4 font-medium text-muted-foreground font-body">Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ads.map((ad) => (
                <tr key={ad.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-headline font-body">{ad.title}</td>
                  <td className="px-6 py-4 text-muted-foreground font-body">{ad.sponsor_name}</td>
                  <td className="px-6 py-4 text-muted-foreground font-body">#{ad.pinned_position}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      ad.active
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {ad.active ? <><Eye className="w-3 h-3" /> Aktiv</> : <><EyeOff className="w-3 h-3" /> Pauset</>}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleActive(ad)} className="p-2 hover:bg-muted rounded-lg" title={ad.active ? "Pause" : "Aktiver"}>
                        {ad.active ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <button onClick={() => openEdit(ad)} className="p-2 hover:bg-muted rounded-lg" title="Rediger">
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => remove(ad)} className="p-2 hover:bg-destructive/10 rounded-lg" title="Slett">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Rediger native-annonse" : "Ny native-annonse"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tittel</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Ingress</Label>
              <Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            </div>
            <div>
              <Label>Brødtekst (valgfritt)</Label>
              <Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Annonsør</Label>
                <Input value={form.sponsor_name} onChange={(e) => setForm({ ...form, sponsor_name: e.target.value })} />
              </div>
              <div>
                <Label>Plassering i feed (#)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.pinned_position}
                  onChange={(e) => setForm({ ...form, pinned_position: Math.max(1, parseInt(e.target.value || "1", 10)) })}
                />
                <p className="text-xs text-muted-foreground mt-1">1 = øverst, 2 = etter første sak, osv.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CTA-tekst</Label>
                <Input value={form.cta_label ?? ""} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Les mer" />
              </div>
              <div>
                <Label>CTA-lenke</Label>
                <Input value={form.cta_url ?? ""} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="https://…" />
              </div>
            </div>
            <div>
              <Label>Hovedbilde</Label>
              <ImageUpload
                currentUrl={form.image_url ?? undefined}
                onUpload={(url) => setForm({ ...form, image_url: url })}
              />
            </div>
            <div>
              <Label>Annonsør-logo</Label>
              <ImageUpload
                currentUrl={form.sponsor_logo_url ?? undefined}
                onUpload={(url) => setForm({ ...form, sponsor_logo_url: url })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start (valgfritt)</Label>
                <Input
                  type="datetime-local"
                  value={toLocalInput(form.start_at)}
                  onChange={(e) => setForm({ ...form, start_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
              <div>
                <Label>Slutt (valgfritt)</Label>
                <Input
                  type="datetime-local"
                  value={toLocalInput(form.end_at)}
                  onChange={(e) => setForm({ ...form, end_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="font-medium">Aktiv</Label>
                <p className="text-xs text-muted-foreground">Vises i nyhetsflyten når aktiv og innenfor kjøreperiode.</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button onClick={save}>{editingId ? "Lagre endringer" : "Opprett"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};