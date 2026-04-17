import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Search, Plus, Pencil, Trash2, Loader2, GitMerge, Tag as TagIcon } from "lucide-react";
import { slugifyTag, type Tag } from "@/lib/tag-utils";

interface TagWithCount extends Tag {
  article_count: number;
}

export const TagsManager = () => {
  const { toast } = useToast();
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<Tag | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", description: "" });
  const [saving, setSaving] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const [merging, setMerging] = useState<Tag | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string>("");
  const [mergeBusy, setMergeBusy] = useState(false);

  const loadTags = async () => {
    setLoading(true);
    const { data: tagRows, error } = await supabase
      .from("tags")
      .select("id, name, slug, description")
      .order("name");
    if (error) {
      toast({ title: "Kunne ikke hente tags", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Count articles per tag (single round-trip)
    const { data: links } = await supabase.from("article_tags").select("tag_id");
    const counts = new Map<string, number>();
    (links || []).forEach((l: any) => counts.set(l.tag_id, (counts.get(l.tag_id) || 0) + 1));

    setTags(
      (tagRows || []).map((t) => ({
        ...(t as Tag),
        article_count: counts.get((t as any).id) || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadTags();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [tags, search]);

  const handleStartEdit = (t: Tag) => {
    setEditing(t);
    setEditForm({ name: t.name, slug: t.slug, description: t.description || "" });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editForm.name.trim()) {
      toast({ title: "Navn mangler", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = slugifyTag(editForm.slug || editForm.name);
    const { error } = await supabase
      .from("tags")
      .update({
        name: editForm.name.trim(),
        slug,
        description: editForm.description.trim() || null,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast({ title: "Kunne ikke lagre", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lagret" });
    setEditing(null);
    void loadTags();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("tags").insert({
      name: newName.trim(),
      slug: slugifyTag(newName),
      created_by: user?.id,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Kunne ikke opprette", description: error.message, variant: "destructive" });
      return;
    }
    setNewName("");
    toast({ title: "Tag opprettet" });
    void loadTags();
  };

  const handleDelete = async (t: TagWithCount) => {
    const msg = t.article_count > 0
      ? `Slette taggen «${t.name}»? Den er brukt på ${t.article_count} artikkel${t.article_count === 1 ? "" : "ler"} og koblingene fjernes.`
      : `Slette taggen «${t.name}»?`;
    if (!window.confirm(msg)) return;
    const { error } = await supabase.from("tags").delete().eq("id", t.id);
    if (error) {
      toast({ title: "Kunne ikke slette", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Slettet" });
    void loadTags();
  };

  const handleMerge = async () => {
    if (!merging || !mergeTarget) return;
    setMergeBusy(true);
    const { error } = await supabase.rpc("merge_tags", {
      _source_id: merging.id,
      _target_id: mergeTarget,
    });
    setMergeBusy(false);
    if (error) {
      toast({ title: "Sammenslåing feilet", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tags slått sammen" });
    setMerging(null);
    setMergeTarget("");
    void loadTags();
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-headline">Tags</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Administrer nøkkelord, rediger eller slå sammen duplikater.
          </p>
        </div>
      </div>

      {/* Quick create */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="new_tag">Opprett ny tag</Label>
          <Input
            id="new_tag"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="F.eks. «Oppdrett» eller «Bærekraft»"
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
            placeholder="Søk i tags…"
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} av {tags.length}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Laster…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground bg-card rounded-xl border border-border">
          {tags.length === 0 ? "Ingen tags ennå." : "Ingen tags matcher søket."}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-subhead font-semibold">Navn</th>
                <th className="px-4 py-3 font-subhead font-semibold hidden sm:table-cell">Slug</th>
                <th className="px-4 py-3 font-subhead font-semibold text-right">Bruk</th>
                <th className="px-4 py-3 font-subhead font-semibold text-right">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TagIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-headline font-medium">{t.name}</span>
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <code className="text-xs text-muted-foreground">{t.slug}</code>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant="outline" className="font-mono">{t.article_count}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleStartEdit(t)} title="Rediger">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setMerging(t); setMergeTarget(""); }}
                        title="Slå sammen"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(t)} title="Slett">
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
            <DialogTitle className="font-headline">Rediger tag</DialogTitle>
            <DialogDescription>
              Endring av slug påvirker eksisterende lenker som /tag/{editing?.slug}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Navn</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={editForm.slug}
                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                placeholder={slugifyTag(editForm.name)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Forhåndsvisning: <code>/tag/{slugifyTag(editForm.slug || editForm.name)}</code>
              </p>
            </div>
            <div>
              <Label>Beskrivelse (valgfritt)</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                className="mt-1.5"
                placeholder="Vises på tag-siden"
              />
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
            <DialogTitle className="font-headline">Slå sammen tags</DialogTitle>
            <DialogDescription>
              Alle artikler som er tagget med <strong>«{merging?.name}»</strong> blir flyttet over til
              den valgte målet-taggen, og <strong>«{merging?.name}»</strong> blir slettet.
              Operasjonen kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Slå sammen til</Label>
              <Select value={mergeTarget} onValueChange={setMergeTarget}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Velg målet-tag…" />
                </SelectTrigger>
                <SelectContent>
                  {tags
                    .filter((t) => t.id !== merging?.id)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.article_count > 0 && `(${t.article_count})`}
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
