import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ProofreadRule {
  id: string;
  from: string;
  to: string;
  reason?: string;
  category: string;
}

const STORAGE_KEY = "proofread_custom_rules_v1";

export function loadProofreadRules(): ProofreadRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProofreadRules(rules: ProofreadRule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

interface Props {
  onRulesChange?: (rules: ProofreadRule[]) => void;
}

export const ProofreadRules = ({ onRulesChange }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<ProofreadRule[]>([]);
  const [draft, setDraft] = useState({ from: "", to: "", reason: "", category: "anglisisme" });

  useEffect(() => {
    setRules(loadProofreadRules());
  }, [open]);

  const persist = (next: ProofreadRule[]) => {
    setRules(next);
    saveProofreadRules(next);
    onRulesChange?.(next);
  };

  const addRule = () => {
    if (!draft.from.trim() || !draft.to.trim()) {
      toast({ title: "Mangler felt", description: "Både 'fra' og 'til' må fylles ut", variant: "destructive" });
      return;
    }
    const next = [
      ...rules,
      { id: crypto.randomUUID(), from: draft.from.trim(), to: draft.to.trim(), reason: draft.reason.trim() || undefined, category: draft.category },
    ];
    persist(next);
    setDraft({ from: "", to: "", reason: "", category: draft.category });
  };

  const removeRule = (id: string) => {
    persist(rules.filter((r) => r.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-2">
          <Settings className="w-3.5 h-3.5" />
          Regler ({rules.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Egendefinerte språkvask-regler</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Reglene anvendes automatisk i tillegg til AI-forslagene. Eksempel: "turnover" → "gjennomstrømming", "folka" → "folkene".
        </p>

        <div className="space-y-2">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">Ingen egne regler ennå</p>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{r.category}</Badge>
                    {r.reason && <span className="text-xs text-muted-foreground truncate">{r.reason}</span>}
                  </div>
                  <div className="text-sm">
                    <span className="line-through text-destructive/70">{r.from}</span>
                    <span className="mx-1.5 text-muted-foreground">→</span>
                    <span className="font-medium text-foreground">{r.to}</span>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeRule(r.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <h4 className="text-sm font-medium">Legg til ny regel</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rule-from" className="text-xs">Fra (original)</Label>
              <Input id="rule-from" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} placeholder="turnover" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="rule-to" className="text-xs">Til (erstatning)</Label>
              <Input id="rule-to" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} placeholder="gjennomstrømming" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="rule-reason" className="text-xs">Begrunnelse (valgfri)</Label>
              <Input id="rule-reason" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="Anglisisme" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="rule-category" className="text-xs">Kategori</Label>
              <select
                id="rule-category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="anglisisme">Anglisisme</option>
                <option value="dialekt">Dialekt</option>
                <option value="grammatikk">Grammatikk</option>
                <option value="forenkling">Forenkling</option>
                <option value="skrivefeil">Skrivefeil</option>
                <option value="stil">Stil</option>
              </select>
            </div>
          </div>
          <Button type="button" onClick={addRule} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Legg til regel
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Lukk</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
