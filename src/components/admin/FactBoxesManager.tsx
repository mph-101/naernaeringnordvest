import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Pencil, Trash2, Loader2, Eye, Sparkles, FileText, Mic, ImageIcon, Link2 } from "lucide-react";
import { FactBoxLibraryDialog } from "@/components/factbox/FactBoxLibraryDialog";
import { FactBox, type FactBoxData, type FactBoxVariant, type FactBoxKeyValueItem } from "@/components/factbox/FactBox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface SourceLite {
  id: string;
  source_type: string;
  title: string;
  content: string | null;
  metadata?: { status?: string } | null;
}

const SRC_ICONS: Record<string, any> = {
  text: FileText, document: FileText, audio: Mic, image: ImageIcon, url: Link2,
};

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
  created_by: string | null;
}

const variantLabel = (v: FactBoxVariant) =>
  v === "rich" ? "Rik tekst" : v === "image" ? "Med bilde" : "Etikett/verdi";

export const FactBoxesManager = () => {
  const { toast } = useToast();
  const [boxes, setBoxes] = useState<FactBoxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<FactBoxData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewing, setPreviewing] = useState<FactBoxData | null>(null);

  // AI generation from sources
  const [genOpen, setGenOpen] = useState(false);
  const [sources, setSources] = useState<SourceLite[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [genHint, setGenHint] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sourceSearch, setSourceSearch] = useState("");

  const loadBoxes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fact_boxes")
      .select("id, title, variant, body, image_url, image_caption, items, tags, updated_at, created_by")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Kunne ikke hente faktabokser", description: error.message, variant: "destructive" });
    } else {
      setBoxes((data || []) as unknown as FactBoxRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadBoxes();
  }, []);

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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Slett denne faktaboksen permanent? Den kan fortsatt være innebygd i artikler.")) return;
    const { error } = await supabase.from("fact_boxes").delete().eq("id", id);
    if (error) {
      toast({ title: "Kunne ikke slette", description: error.message, variant: "destructive" });
      return;
    }
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    toast({ title: "Slettet" });
  };

  const handleEdit = (box: FactBoxRow) => {
    setEditing({
      id: box.id,
      variant: box.variant,
      title: box.title,
      body: box.body || "",
      image_url: box.image_url || "",
      image_caption: box.image_caption || "",
      items: box.items || [{ label: "", value: "" }],
      tags: box.tags || [],
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  // The library dialog calls `onInsert` after save — we just refresh & close.
  const handleAfterSave = () => {
    setDialogOpen(false);
    setEditing(null);
    void loadBoxes();
  };

  // ---- AI generation from sources ----
  const openGenerator = async () => {
    setGenOpen(true);
    setSelectedSources(new Set());
    setGenHint("");
    setSourceSearch("");
    setSourcesLoading(true);
    const { data, error } = await supabase
      .from("article_sources")
      .select("id, source_type, title, content, metadata")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Kunne ikke hente kilder", description: error.message, variant: "destructive" });
    } else {
      setSources((data || []) as SourceLite[]);
    }
    setSourcesLoading(false);
  };

  const toggleSource = (id: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredSources = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase();
    return sources.filter((s) => {
      if (s.metadata?.status === "processing" || s.metadata?.status === "failed") return false;
      if (!q) return true;
      return (s.title + " " + (s.content || "")).toLowerCase().includes(q);
    });
  }, [sources, sourceSearch]);

  const runGeneration = async () => {
    if (selectedSources.size === 0) {
      toast({ title: "Velg minst én kilde", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-fact-box", {
        body: { sourceIds: Array.from(selectedSources), hint: genHint },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const fb = data.factBox;
      setGenOpen(false);
      setEditing({
        variant: (fb.variant as FactBoxVariant) || "rich",
        title: fb.title || "",
        body: fb.body || "",
        image_url: "",
        image_caption: "",
        items: Array.isArray(fb.items) && fb.items.length > 0 ? fb.items : [{ label: "", value: "" }],
        tags: Array.isArray(fb.tags) ? fb.tags : [],
      });
      setDialogOpen(true);
      toast({ title: "Faktaboks generert", description: "Sjekk og rediger før du lagrer." });
    } catch (e: any) {
      toast({ title: "Generering feilet", description: e.message || "Ukjent feil", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-headline">Faktabokser</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Sentralt bibliotek av gjenbrukbare faktabokser for hele redaksjonen.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openGenerator}>
            <Sparkles className="w-4 h-4 mr-1" /> Generer fra kilde
          </Button>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-1" /> Ny faktaboks
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk i tittel, innhold eller emneknagger…"
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} av {boxes.length}
        </span>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setTagFilter(null)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              tagFilter === null
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Alle
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                tagFilter === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Laster…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground bg-card rounded-xl border border-border">
          {boxes.length === 0
            ? "Ingen faktabokser ennå. Klikk «Ny faktaboks» for å opprette den første."
            : "Ingen faktabokser matcher søket."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((box) => (
            <div key={box.id} className="rounded-lg border border-border p-4 bg-card flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-headline text-sm font-semibold leading-tight">{box.title}</h4>
                <Badge variant="outline" className="text-[0.625rem] shrink-0 capitalize">
                  {variantLabel(box.variant)}
                </Badge>
              </div>
              {(box.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {box.tags.map((t) => (
                    <span key={t} className="text-[0.625rem] text-muted-foreground">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">
                {box.variant === "keyvalue"
                  ? (box.items || []).map((i) => `${i.label}: ${i.value}`).join(" • ")
                  : (box.body || "").replace(/<[^>]*>/g, " ").trim() || "—"}
              </p>
              <div className="text-[0.625rem] text-muted-foreground mb-2">
                Oppdatert {new Date(box.updated_at).toLocaleDateString("nb-NO")}
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    setPreviewing({
                      variant: box.variant,
                      title: box.title,
                      body: box.body || "",
                      image_url: box.image_url,
                      image_caption: box.image_caption,
                      items: box.items || [],
                      tags: box.tags || [],
                    })
                  }
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Vis
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleEdit(box)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Rediger
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(box.id)} title="Slett">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reuse the library dialog for create/edit */}
      <FactBoxLibraryDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            void loadBoxes();
          }
        }}
        initial={editing}
        onInsert={handleAfterSave}
      />

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Forhåndsvisning</DialogTitle>
          </DialogHeader>
          {previewing && <FactBox data={previewing} />}
        </DialogContent>
      </Dialog>

      {/* AI generator dialog */}
      <Dialog open={genOpen} onOpenChange={(o) => !generating && setGenOpen(o)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Generer faktaboks fra kilde
            </DialogTitle>
            <DialogDescription>
              Velg én eller flere kilder fra kildebiblioteket. AI velger best egnet faktaboks-variant og forhåndsutfyller redigeringsskjemaet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="hint">Hva skal faktaboksen handle om? (valgfri)</Label>
              <Textarea
                id="hint"
                rows={2}
                value={genHint}
                onChange={(e) => setGenHint(e.target.value)}
                placeholder="F.eks. 'Nøkkeltall for selskapet' eller 'Bakgrunn om saken'"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Velg kilder ({selectedSources.size} valgt)</Label>
                <div className="relative w-48">
                  <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    placeholder="Søk i kilder…"
                    className="pl-7 h-8 text-sm"
                  />
                </div>
              </div>
              <div className="border border-border rounded-lg max-h-72 overflow-y-auto divide-y divide-border">
                {sourcesLoading ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </div>
                ) : filteredSources.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground font-body">
                    {sources.length === 0
                      ? "Ingen kilder ennå. Last opp kilder under Kilder & AI-generering."
                      : "Ingen kilder matcher søket."}
                  </div>
                ) : (
                  filteredSources.map((s) => {
                    const Icon = SRC_ICONS[s.source_type] ?? FileText;
                    const isSel = selectedSources.has(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSource(s.id)}
                        className={`w-full text-left p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors ${isSel ? "bg-primary/5" : ""}`}
                      >
                        <Checkbox checked={isSel} className="mt-0.5 pointer-events-none" />
                        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-body font-medium text-sm text-foreground truncate">{s.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1 font-body">
                            {s.content?.slice(0, 140) || "(ingen tekst)"}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)} disabled={generating}>
              Avbryt
            </Button>
            <Button onClick={runGeneration} disabled={generating || selectedSources.size === 0}>
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Genererer…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generer</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
