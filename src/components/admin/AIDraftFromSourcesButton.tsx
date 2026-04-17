import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Loader2, FileText, Mic, Image as ImageIcon, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SourceRow {
  id: string;
  source_type: string;
  title: string;
  used_in_article: string | null;
}

interface Guideline { id: string; article_type: string; display_name: string; }

interface Props {
  onApply: (draft: { title: string; excerpt: string; body: string; key_points: string[] }) => void;
}

const ICONS: Record<string, any> = { text: FileText, document: FileText, audio: Mic, image: ImageIcon, url: Link2 };

export const AIDraftFromSourcesButton = ({ onApply }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [articleType, setArticleType] = useState("news");
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: srcs }, { data: gls }] = await Promise.all([
        supabase.from("article_sources").select("id, source_type, title, used_in_article").order("created_at", { ascending: false }).limit(50),
        supabase.from("editorial_guidelines").select("id, article_type, display_name"),
      ]);
      setSources((srcs ?? []) as SourceRow[]);
      setGuidelines((gls ?? []) as Guideline[]);
    })();
  }, [open]);

  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const generate = async () => {
    if (selected.size === 0) {
      toast({ title: "Velg minst én kilde", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-article-draft", {
        body: { sourceIds: Array.from(selected), articleType, extraInstructions: extra },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onApply(data.draft);
      toast({ title: "Utkast satt inn" });
      setOpen(false);
      setSelected(new Set());
      setExtra("");
    } catch (err) {
      toast({ title: "Feil", description: err instanceof Error ? err.message : "Ukjent", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          AI-utkast fra kilder
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generer utkast fra kilder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Artikkeltype</Label>
            <Select value={articleType} onValueChange={setArticleType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {guidelines.map(g => <SelectItem key={g.id} value={g.article_type}>{g.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Velg kilder ({selected.size} valgt)</Label>
            <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
              {sources.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Ingen kilder. Last opp kilder under "Kilder & AI" først.</p>
              ) : sources.map(s => {
                const Icon = ICONS[s.source_type] ?? FileText;
                return (
                  <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0">
                    <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-body truncate">{s.title}</span>
                    {s.used_in_article && <Badge variant="secondary" className="text-xs">Brukt</Badge>}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Ekstra instruksjoner (valgfri)</Label>
            <Textarea rows={3} value={extra} onChange={e => setExtra(e.target.value)} placeholder="F.eks. 'Fokuser på lokal vinkling'" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
          <Button onClick={generate} disabled={busy || selected.size === 0}>
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Genererer…</> : "Generer & sett inn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
