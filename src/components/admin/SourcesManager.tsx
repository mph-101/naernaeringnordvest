import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Mic, ImageIcon, Link2, Trash2, Sparkles, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SourceUploader } from "./SourceUploader";

interface Source {
  id: string;
  source_type: string;
  title: string;
  content: string | null;
  source_url: string | null;
  file_url: string | null;
  used_in_article: string | null;
  used_in_article_title?: string | null;
  created_at: string;
  metadata?: { status?: string; error?: string; [k: string]: unknown } | null;
}

interface Guideline {
  id: string;
  article_type: string;
  display_name: string;
  rules: string;
  min_paragraphs: number;
  max_words: number;
}

const TYPE_ICONS: Record<string, any> = {
  text: FileText,
  document: FileText,
  audio: Mic,
  image: ImageIcon,
  url: Link2,
};

const TYPE_LABELS: Record<string, string> = {
  text: "Tekst",
  document: "Dokument",
  audio: "Lyd",
  image: "Bilde",
  url: "URL",
};

export const SourcesManager = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [articleType, setArticleType] = useState<string>("news");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draftDialog, setDraftDialog] = useState<{ open: boolean; draft: any }>({ open: false, draft: null });
  const [previewSource, setPreviewSource] = useState<Source | null>(null);
  const [editGuideline, setEditGuideline] = useState<Guideline | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: srcs }, { data: gls }] = await Promise.all([
      supabase.from("article_sources").select("*").order("created_at", { ascending: false }),
      supabase.from("editorial_guidelines").select("*").order("display_name"),
    ]);
    const baseSources = (srcs ?? []) as Source[];
    const articleIds = Array.from(
      new Set(baseSources.map((s) => s.used_in_article).filter((v): v is string => Boolean(v))),
    );
    let titleMap = new Map<string, string>();
    if (articleIds.length > 0) {
      const { data: arts } = await supabase
        .from("articles")
        .select("id, title")
        .in("id", articleIds);
      titleMap = new Map(((arts ?? []) as { id: string; title: string }[]).map((a) => [a.id, a.title]));
    }
    setSources(
      baseSources.map((s) => ({
        ...s,
        used_in_article_title: s.used_in_article ? titleMap.get(s.used_in_article) ?? null : null,
      })),
    );
    setGuidelines((gls ?? []) as Guideline[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const removeSource = async (id: string) => {
    if (!confirm("Slette denne kilden?")) return;
    const src = sources.find(s => s.id === id);
    if (src?.file_url) {
      await supabase.storage.from("article-sources").remove([src.file_url]);
    }
    const { error } = await supabase.from("article_sources").delete().eq("id", id);
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return;
    }
    setSources(prev => prev.filter(s => s.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const generateDraft = async () => {
    if (selected.size === 0) {
      toast({ title: "Velg minst én kilde", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-article-draft", {
        body: { sourceIds: Array.from(selected), articleType, extraInstructions },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraftDialog({ open: true, draft: data.draft });
    } catch (err) {
      toast({
        title: "Generering feilet",
        description: err instanceof Error ? err.message : "Ukjent feil",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const createArticleFromDraft = async () => {
    const { draft } = draftDialog;
    if (!draft) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const guideline = guidelines.find(g => g.article_type === articleType);
    const { data, error } = await supabase
      .from("articles")
      .insert({
        title: draft.title,
        excerpt: draft.excerpt,
        body: draft.body,
        key_points: draft.key_points,
        author: user.email?.split("@")[0] ?? "Redaksjonen",
        category: "Næringsliv",
        type: "article",
        status: "draft",
        published: false,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) {
      toast({ title: "Kunne ikke opprette artikkel", description: error.message, variant: "destructive" });
      return;
    }
    // Mark sources as used
    await supabase
      .from("article_sources")
      .update({ used_in_article: data.id })
      .in("id", Array.from(selected));
    toast({ title: "Artikkel opprettet som kladd" });
    setDraftDialog({ open: false, draft: null });
    setSelected(new Set());
    fetchAll();
  };

  const saveGuideline = async () => {
    if (!editGuideline) return;
    const { error } = await supabase
      .from("editorial_guidelines")
      .update({
        rules: editGuideline.rules,
        min_paragraphs: editGuideline.min_paragraphs,
        max_words: editGuideline.max_words,
      })
      .eq("id", editGuideline.id);
    if (error) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Retningslinjer oppdatert" });
    setEditGuideline(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl font-semibold text-headline">Kilder & AI-generering</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SourceUploader onUploaded={() => fetchAll()} />

        <div className="bg-card rounded-xl p-6 border border-border space-y-4">
          <h3 className="font-headline text-lg font-medium text-headline">Generer artikkelutkast</h3>
          <div>
            <Label>Artikkeltype</Label>
            <div className="flex gap-2">
              <Select value={articleType} onValueChange={setArticleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {guidelines.map(g => (
                    <SelectItem key={g.id} value={g.article_type}>{g.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditGuideline(guidelines.find(g => g.article_type === articleType) ?? null)}
              >
                Rediger regler
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="extra-instr">Ekstra instruksjoner (valgfri)</Label>
            <Textarea
              id="extra-instr"
              rows={3}
              value={extraInstructions}
              onChange={e => setExtraInstructions(e.target.value)}
              placeholder="F.eks. 'Fokuser på bærekraftaspektet' eller 'Skriv som notis'"
            />
          </div>
          <p className="text-sm text-muted-foreground font-body">
            {selected.size} {selected.size === 1 ? "kilde" : "kilder"} valgt
          </p>
          <Button onClick={generateDraft} disabled={generating || selected.size === 0} className="w-full">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Genererer…</> : <><Sparkles className="w-4 h-4 mr-2" />Generer utkast</>}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="font-headline text-lg font-medium text-headline">Kildebibliotek</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : sources.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-body">Ingen kilder enda. Last opp en for å komme i gang.</div>
        ) : (
          <ul className="divide-y divide-border">
            {sources.map(s => {
              const Icon = TYPE_ICONS[s.source_type] ?? FileText;
              const isSelected = selected.has(s.id);
              return (
                <li key={s.id} className="p-4 flex items-start gap-3 hover:bg-muted/50">
                  <Checkbox checked={isSelected} onCheckedChange={() => toggle(s.id)} className="mt-1" />
                  <Icon className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body font-medium text-foreground truncate">{s.title}</span>
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[s.source_type]}</Badge>
                      {s.used_in_article && (
                        <a
                          href={`/article/${s.used_in_article}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center"
                          title={s.used_in_article_title ?? "Åpne artikkel"}
                        >
                          <Badge
                            variant="secondary"
                            className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer max-w-[200px] truncate"
                          >
                            Brukt i: {s.used_in_article_title ?? "artikkel"}
                          </Badge>
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1 font-body">
                      {s.content?.slice(0, 200) ?? "(ingen ekstrahert tekst)"}
                    </p>
                    {s.source_url && (
                      <a href={s.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                        {s.source_url}
                      </a>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setPreviewSource(s)} aria-label="Forhåndsvis">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeSource(s.id)} aria-label="Slett">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Draft preview */}
      <Dialog open={draftDialog.open} onOpenChange={(open) => setDraftDialog(d => ({ ...d, open }))}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI-generert utkast</DialogTitle>
          </DialogHeader>
          {draftDialog.draft && (
            <div className="space-y-4">
              <div>
                <Label>Tittel</Label>
                <p className="font-headline text-xl text-headline">{draftDialog.draft.title}</p>
              </div>
              <div>
                <Label>Ingress</Label>
                <p className="font-body text-foreground">{draftDialog.draft.excerpt}</p>
              </div>
              <div>
                <Label>Nøkkelpunkter</Label>
                <ul className="list-disc list-inside font-body text-foreground">
                  {draftDialog.draft.key_points?.map((kp: string, i: number) => <li key={i}>{kp}</li>)}
                </ul>
              </div>
              <div>
                <Label>Brødtekst</Label>
                <div className="prose prose-sm max-w-none dark:prose-invert font-body" dangerouslySetInnerHTML={{ __html: draftDialog.draft.body }} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftDialog({ open: false, draft: null })}>Avbryt</Button>
            <Button onClick={createArticleFromDraft}>Opprett som kladd</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Source preview */}
      <Dialog open={!!previewSource} onOpenChange={(open) => !open && setPreviewSource(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewSource?.title}</DialogTitle>
          </DialogHeader>
          <div className="font-body whitespace-pre-wrap text-sm">{previewSource?.content || "(ingen ekstrahert tekst)"}</div>
        </DialogContent>
      </Dialog>

      {/* Guideline editor */}
      <Dialog open={!!editGuideline} onOpenChange={(open) => !open && setEditGuideline(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Retningslinjer: {editGuideline?.display_name}</DialogTitle>
          </DialogHeader>
          {editGuideline && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min. avsnitt</Label>
                  <input
                    type="number"
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                    value={editGuideline.min_paragraphs}
                    onChange={e => setEditGuideline({ ...editGuideline, min_paragraphs: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Maks ord</Label>
                  <input
                    type="number"
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                    value={editGuideline.max_words}
                    onChange={e => setEditGuideline({ ...editGuideline, max_words: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Regler</Label>
                <Textarea
                  rows={12}
                  value={editGuideline.rules}
                  onChange={e => setEditGuideline({ ...editGuideline, rules: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGuideline(null)}>Avbryt</Button>
            <Button onClick={saveGuideline}>Lagre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
