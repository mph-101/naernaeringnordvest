import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Pencil, Trash2, Loader2, GitMerge } from "lucide-react";

interface Category {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  color: string | null;
}

interface CategoryWithCount extends Category {
  article_count: number;
}

// Mirrors the slug rules used in CategorySelect (keeps Norwegian letters).
function slugifyCategory(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-æøå]/g, "");
}

export const SectionsManager = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState({ name: "", name_en: "", slug: "", color: "" });
  const [saving, setSaving] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const [merging, setMerging] = useState<CategoryWithCount | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string>("");
  const [mergeBusy, setMergeBusy] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("categories")
      .select("id, name, name_en, slug, color")
      .order("name");
    if (error) {
      toast({ title: "Kunne ikke hente seksjoner", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // articles.category is a denormalized text field — count usage by name.
    const { data: articleRows } = await supabase.from("articles").select("category");
    const counts = new Map<string, number>();
    (articleRows || []).forEach((a: any) => {
      if (a.category) counts.set(a.category, (counts.get(a.category) || 0) + 1);
    });

    setCategories(
      (rows || []).map((c) => ({
        ...(c as Category),
        article_count: counts.get((c as any).name) || 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.name_en || "").toLowerCase().includes(q),
    );
  }, [categories, search]);

  const handleStartEdit = (c: Category) => {
    setEditing(c);
    setEditForm({ name: c.name, name_en: c.name_en || "", slug: c.slug, color: c.color || "" });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editForm.name.trim()) {
      toast({ title: "Navn mangler", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = slugifyCategory(editForm.slug || editForm.name);
    // rename_category updates the row AND propagates the new name onto every
    // article that used the old name (articles.category is denormalized text).
    // rename_category / merge_categories are defined in 20260609120000 but are
    // not in the generated types until they are regenerated post-deploy.
    const { error } = await (supabase as any).rpc("rename_category", {
      _id: editing.id,
      _name: editForm.name.trim(),
      _name_en: editForm.name_en.trim() || null,
      _slug: slug,
    });
    if (!error && editForm.color.trim()) {
      // Colour does not need propagation, so it is a plain row update.
      await supabase.from("categories").update({ color: editForm.color.trim() }).eq("id", editing.id);
    }
    setSaving(false);
    if (error) {
      toast({ title: "Kunne ikke lagre", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lagret", description: "Seksjonen og tilhørende artikler er oppdatert." });
    setEditing(null);
    void loadCategories();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("categories").insert({
      name: newName.trim(),
      slug: slugifyCategory(newName),
      created_by: user?.id,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Kunne ikke opprette", description: error.message, variant: "destructive" });
      return;
    }
    setNewName("");
    toast({ title: "Seksjon opprettet" });
    void loadCategories();
  };

  const handleDelete = async (c: CategoryWithCount) => {
    if (c.article_count > 0) {
      toast({
        title: "Kan ikke slette",
        description: `«${c.name}» brukes av ${c.article_count} artikkel${c.article_count === 1 ? "" : "ler"}. Slå den sammen med en annen seksjon i stedet.`,
        variant: "destructive",
      });
      return;
    }
    if (!window.confirm(`Slette seksjonen «${c.name}»?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) {
      toast({ title: "Kunne ikke slette", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Slettet" });
    void loadCategories();
  };

  const handleMerge = async () => {
    if (!merging || !mergeTarget) return;
    setMergeBusy(true);
    const { data, error } = await (supabase as any).rpc("merge_categories", {
      _target_id: mergeTarget,
      _source_ids: [merging.id],
    });
    setMergeBusy(false);
    if (error) {
      toast({ title: "Sammenslåing feilet", description: error.message, variant: "destructive" });
      return;
    }
    const moved = typeof data === "number" ? data : 0;
    toast({
      title: "Seksjoner slått sammen",
      description: `${moved} artikkel${moved === 1 ? "" : "ler"} flyttet over.`,
    });
    setMerging(null);
    setMergeTarget("");
    void loadCategories();
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-headline">Seksjoner</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Gi nytt navn til seksjoner eller slå sammen duplikater. Endringer oppdaterer
            tilhørende artikler automatisk.
          </p>
        </div>
      </div>

      {/* Quick create */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="new_section">Opprett ny seksjon</Label>
          <Input
            id="new_section"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="F.eks. «Samferdsel» eller «Reiseliv»"
            className="mt-1.5"
          />
        </div>
        <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
          {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
          Legg til
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk i seksjoner…"
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} av {categories.length}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Laster…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground bg-card rounded-xl border border-border">
          {categories.length === 0 ? "Ingen seksjoner ennå." : "Ingen seksjoner matcher søket."}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-subhead font-semibold">Navn</th>
                <th className="px-4 py-3 font-subhead font-semibold hidden sm:table-cell">Engelsk</th>
                <th className="px-4 py-3 font-subhead font-semibold hidden md:table-cell">Slug</th>
                <th className="px-4 py-3 font-subhead font-semibold text-right">Bruk</th>
                <th className="px-4 py-3 font-subhead font-semibold text-right">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color || "#6366f1" }}
                      />
                      <span className="font-headline font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-sm text-muted-foreground">
                    {c.name_en || <span className="opacity-40">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="text-xs text-muted-foreground">{c.slug}</code>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant="outline" className="font-mono">{c.article_count}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleStartEdit(c)} title="Rediger">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setMerging(c); setMergeTarget(""); }}
                        title="Slå sammen"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(c)} title="Slett">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">Rediger seksjon</DialogTitle>
            <DialogDescription>
              Nytt navn oppdaterer alle artikler som ligger i seksjonen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Navn (norsk)</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Navn (engelsk, valgfritt)</Label>
              <Input
                value={editForm.name_en}
                onChange={(e) => setEditForm({ ...editForm, name_en: e.target.value })}
                placeholder="Vises når språk er engelsk"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={editForm.slug}
                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                placeholder={slugifyCategory(editForm.name)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Forhåndsvisning: <code>{slugifyCategory(editForm.slug || editForm.name)}</code>
              </p>
            </div>
            <div>
              <Label>Farge</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="color"
                  value={editForm.color || "#6366f1"}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  className="h-9 w-12 rounded border border-border bg-background"
                  aria-label="Seksjonsfarge"
                />
                <code className="text-xs text-muted-foreground">{editForm.color || "#6366f1"}</code>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Avbryt</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Lagre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge dialog */}
      <Dialog open={!!merging} onOpenChange={(o) => !o && setMerging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">Slå sammen seksjoner</DialogTitle>
            <DialogDescription>
              Alle artikler i <strong>«{merging?.name}»</strong> flyttes over til den valgte
              seksjonen, og <strong>«{merging?.name}»</strong> slettes. Operasjonen kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Slå sammen til</Label>
              <Select value={mergeTarget} onValueChange={setMergeTarget}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Velg målseksjon…" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.id !== merging?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.article_count > 0 && `(${c.article_count})`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMerging(null)}>Avbryt</Button>
            <Button onClick={handleMerge} disabled={!mergeTarget || mergeBusy}>
              {mergeBusy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Slå sammen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
