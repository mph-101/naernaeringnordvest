import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, Loader2, X } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { FactBox, type FactBoxData, type FactBoxVariant, type FactBoxKeyValueItem } from "./FactBox";

interface FactBoxLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when a fact box is selected for insertion into the article */
  onInsert: (data: FactBoxData) => void;
  /** Optional: prefill the editor with an existing box (for inline editing) */
  initial?: FactBoxData | null;
}

interface FactBoxRow {
  id: string;
  title: string;
  variant: FactBoxVariant;
  body: string | null;
  image_url: string | null;
  image_caption: string | null;
  items: FactBoxKeyValueItem[];
  tags: string[];
  updated_at: string;
}

const emptyForm = (variant: FactBoxVariant = "rich"): FactBoxData => ({
  variant,
  title: "",
  body: "",
  image_url: "",
  image_caption: "",
  items: [{ label: "", value: "" }],
  tags: [],
});

export const FactBoxLibraryDialog = ({
  open,
  onOpenChange,
  onInsert,
  initial,
}: FactBoxLibraryDialogProps) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<"library" | "create">(initial ? "create" : "library");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<FactBoxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FactBoxData>(initial || emptyForm());
  const [tagInput, setTagInput] = useState("");

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setTab(initial ? "create" : "library");
      setForm(initial || emptyForm());
      setTagInput("");
      setSearch("");
      setTagFilter(null);
      void loadBoxes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const loadBoxes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fact_boxes")
      .select("id, title, variant, body, image_url, image_caption, items, tags, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Kunne ikke hente faktabokser", description: error.message, variant: "destructive" });
    } else {
      setBoxes((data || []) as FactBoxRow[]);
    }
    setLoading(false);
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    boxes.forEach((b) => b.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [boxes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return boxes.filter((b) => {
      if (tagFilter && !(b.tags || []).includes(tagFilter)) return false;
      if (!q) return true;
      const hay =
        b.title.toLowerCase() +
        " " +
        (b.body || "").toLowerCase() +
        " " +
        (b.items || []).map((i) => `${i.label} ${i.value}`).join(" ").toLowerCase() +
        " " +
        (b.tags || []).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [boxes, search, tagFilter]);

  const handleInsertExisting = (box: FactBoxRow) => {
    onInsert({
      id: box.id,
      variant: box.variant,
      title: box.title,
      body: box.body || "",
      image_url: box.image_url,
      image_caption: box.image_caption,
      items: box.items || [],
      tags: box.tags || [],
    });
    onOpenChange(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Slett denne faktaboksen permanent?")) return;
    const { error } = await supabase.from("fact_boxes").delete().eq("id", id);
    if (error) {
      toast({ title: "Kunne ikke slette", description: error.message, variant: "destructive" });
      return;
    }
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    toast({ title: "Slettet" });
  };

  const handleSave = async (insertAfter = true) => {
    if (!form.title.trim()) {
      toast({ title: "Tittel mangler", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke pålogget");

      const payload = {
        title: form.title.trim(),
        variant: form.variant,
        body: form.variant === "keyvalue" ? null : (form.body || ""),
        image_url: form.variant === "image" ? (form.image_url || null) : null,
        image_caption: form.variant === "image" ? (form.image_caption || null) : null,
        items: form.variant === "keyvalue"
          ? (form.items || []).filter((i) => i.label.trim() || i.value.trim())
          : [],
        tags: form.tags || [],
        created_by: user.id,
      };

      let saved: FactBoxData;
      if (form.id) {
        const { data, error } = await supabase
          .from("fact_boxes")
          .update(payload)
          .eq("id", form.id)
          .select("id, title, variant, body, image_url, image_caption, items, tags")
          .single();
        if (error) throw error;
        saved = { ...(data as any), items: (data as any).items || [] };
      } else {
        const { data, error } = await supabase
          .from("fact_boxes")
          .insert(payload)
          .select("id, title, variant, body, image_url, image_caption, items, tags")
          .single();
        if (error) throw error;
        saved = { ...(data as any), items: (data as any).items || [] };
      }

      toast({ title: form.id ? "Faktaboks oppdatert" : "Faktaboks opprettet" });
      if (insertAfter) {
        onInsert(saved);
        onOpenChange(false);
      } else {
        await loadBoxes();
        setTab("library");
        setForm(emptyForm());
      }
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (!(form.tags || []).includes(t)) {
      setForm({ ...form, tags: [...(form.tags || []), t] });
    }
    setTagInput("");
  };

  const updateItem = (i: number, patch: Partial<FactBoxKeyValueItem>) => {
    const items = [...(form.items || [])];
    items[i] = { ...items[i], ...patch };
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...(form.items || []), { label: "", value: "" }] });
  const removeItem = (i: number) => setForm({ ...form, items: (form.items || []).filter((_, idx) => idx !== i) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Faktabokser</DialogTitle>
          <DialogDescription>
            Velg en eksisterende faktaboks fra biblioteket, eller opprett en ny som blir tilgjengelig for hele redaksjonen.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "library" | "create")} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">Bibliotek</TabsTrigger>
            <TabsTrigger value="create">{form.id ? "Rediger" : "Opprett ny"}</TabsTrigger>
          </TabsList>

          {/* LIBRARY */}
          <TabsContent value="library" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søk i tittel, innhold eller emneknagger…"
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={() => { setForm(emptyForm()); setTab("create"); }}>
                <Plus className="w-4 h-4 mr-1" /> Ny
              </Button>
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  onClick={() => setTagFilter(null)}
                  className={`text-xs px-2 py-0.5 rounded-full border ${tagFilter === null ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  Alle
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTagFilter(t)}
                    className={`text-xs px-2 py-0.5 rounded-full border ${tagFilter === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Laster…
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Ingen faktabokser funnet. Opprett en ny under «Opprett ny»-fanen.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filtered.map((box) => (
                    <div key={box.id} className="rounded-lg border border-border p-3 bg-card flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-headline text-sm font-semibold leading-tight">{box.title}</h4>
                        <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                          {box.variant === "keyvalue" ? "key/value" : box.variant}
                        </Badge>
                      </div>
                      {(box.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {box.tags.map((t) => (
                            <span key={t} className="text-[10px] text-muted-foreground">#{t}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">
                        {box.variant === "keyvalue"
                          ? (box.items || []).map((i) => `${i.label}: ${i.value}`).join(" • ")
                          : (box.body || "").replace(/<[^>]*>/g, " ").trim()}
                      </p>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1" onClick={() => handleInsertExisting(box)}>
                          Sett inn
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setForm({
                              id: box.id,
                              variant: box.variant,
                              title: box.title,
                              body: box.body || "",
                              image_url: box.image_url || "",
                              image_caption: box.image_caption || "",
                              items: box.items || [{ label: "", value: "" }],
                              tags: box.tags || [],
                            });
                            setTab("create");
                          }}
                        >
                          Rediger
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(box.id)} title="Slett">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* CREATE / EDIT */}
          <TabsContent value="create" className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
            <div className="grid grid-cols-3 gap-2">
              {(["rich", "image", "keyvalue"] as FactBoxVariant[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm({ ...form, variant: v })}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                    form.variant === v
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div className="font-medium font-headline mb-0.5">
                    {v === "rich" ? "Tittel + rik tekst" : v === "image" ? "Med bilde" : "Etikett/verdi"}
                  </div>
                  <div className="text-xs">
                    {v === "rich" ? "Avsnitt, lister, lenker" : v === "image" ? "Toppbilde + tekst" : "Strukturerte rader"}
                  </div>
                </button>
              ))}
            </div>

            <div>
              <Label>Tittel</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="F.eks. «Om selskapet»"
              />
            </div>

            {form.variant === "image" && (
              <>
                <div>
                  <Label>Bilde</Label>
                  <ImageUpload
                    currentUrl={form.image_url || ""}
                    onUpload={(url) => setForm({ ...form, image_url: url })}
                  />
                </div>
                <div>
                  <Label>Bildetekst (valgfritt)</Label>
                  <Input
                    value={form.image_caption || ""}
                    onChange={(e) => setForm({ ...form, image_caption: e.target.value })}
                    placeholder="Foto: Navn Navnesen"
                  />
                </div>
              </>
            )}

            {(form.variant === "rich" || form.variant === "image") && (
              <div>
                <Label>Tekst (HTML tillatt)</Label>
                <Textarea
                  value={form.body || ""}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={6}
                  placeholder="<p>Skriv tekst her. Du kan bruke &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;a href=…&gt; osv.</p>"
                  className="font-mono text-xs"
                />
              </div>
            )}

            {form.variant === "keyvalue" && (
              <div>
                <Label>Rader</Label>
                <div className="space-y-2">
                  {(form.items || []).map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={item.label}
                        onChange={(e) => updateItem(i, { label: e.target.value })}
                        placeholder="Etikett (f.eks. Stiftet)"
                        className="flex-1"
                      />
                      <Input
                        value={item.value}
                        onChange={(e) => updateItem(i, { value: e.target.value })}
                        placeholder="Verdi (f.eks. 1985)"
                        className="flex-1"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Legg til rad
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label>Emneknagger (for søk og filtrering)</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Skriv emneknagg og trykk Enter"
                />
                <Button type="button" variant="outline" onClick={addTag}>Legg til</Button>
              </div>
              {(form.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags!.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                      #{t}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, tags: form.tags!.filter((x) => x !== t) })}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Live preview */}
            {form.title && (
              <div>
                <Label className="mb-2 block">Forhåndsvisning</Label>
                <FactBox data={form} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Lagre i bibliotek
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Lagre og sett inn
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
