import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface ProofreadRule {
  id: string;
  from: string;
  to: string;
  reason?: string;
  category: string;
}

const STORAGE_KEY = "proofread_custom_rules_v1";
const SETTINGS_KEY = "proofread_settings_v1";

export type LanguageProfile = "konservativt" | "moderat" | "radikalt" | "nynorsk";
export type FocusArea = "anglisismer" | "stil" | "grammatikk" | "forenkling" | "idiomatisk";

export interface ProofreadSettings {
  profile: LanguageProfile;
  focusAreas: FocusArea[];
}

const DEFAULT_SETTINGS: ProofreadSettings = {
  profile: "moderat",
  focusAreas: ["anglisismer", "stil", "grammatikk", "forenkling", "idiomatisk"],
};

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

export function loadProofreadSettings(): ProofreadSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveProofreadSettings(s: ProofreadSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/** Load settings from the user's profile (DB) with localStorage fallback. */
export async function loadProofreadSettingsFromDb(): Promise<ProofreadSettings> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return loadProofreadSettings();
    const { data } = await supabase
      .from("profiles")
      .select("proofread_settings")
      .eq("user_id", session.user.id)
      .maybeSingle();
    const dbVal = (data as any)?.proofread_settings;
    if (dbVal && typeof dbVal === "object") {
      const merged: ProofreadSettings = { ...DEFAULT_SETTINGS, ...dbVal };
      // Mirror to localStorage so synchronous calls (e.g. from edge invoke) get fresh values too.
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {
    // ignore — fall back to local
  }
  return loadProofreadSettings();
}

/** Persist settings to both localStorage and the user's profile (best-effort). */
export async function saveProofreadSettingsToDb(s: ProofreadSettings): Promise<void> {
  saveProofreadSettings(s);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("profiles")
      .update({ proofread_settings: s } as any)
      .eq("user_id", session.user.id);
  } catch {
    // best-effort sync; localStorage is the source of truth on failure
  }
}

const PROFILE_LABELS: Record<LanguageProfile, { label: string; desc: string }> = {
  konservativt: { label: "Konservativt bokmål", desc: "Riksmålsnært (boken, regjeringen, frem)" },
  moderat: { label: "Moderat bokmål", desc: "Avisstandard (boken/jenta, kastet)" },
  radikalt: { label: "Radikalt bokmål", desc: "Folkenært (boka, jenta, kasta, fram)" },
  nynorsk: { label: "Nynorsk", desc: "Eg, ikkje, kva, frå" },
};

const FOCUS_LABELS: Record<FocusArea, string> = {
  anglisismer: "Anglisismer",
  stil: "Målform/stil",
  grammatikk: "Grammatikk og skrivefeil",
  forenkling: "Forenkling av tunge formuleringer",
  idiomatisk: "Uidiomatiske uttrykk",
};

interface Props {
  onRulesChange?: (rules: ProofreadRule[]) => void;
}

export const ProofreadRules = ({ onRulesChange }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<ProofreadRule[]>([]);
  const [settings, setSettings] = useState<ProofreadSettings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState({ from: "", to: "", reason: "", category: "anglisisme" });

  useEffect(() => {
    setRules(loadProofreadRules());
    // Hydrate settings from DB (with localStorage fallback) when dialog opens.
    loadProofreadSettingsFromDb().then(setSettings).catch(() => setSettings(loadProofreadSettings()));
  }, [open]);

  const updateSettings = (next: ProofreadSettings) => {
    setSettings(next);
    saveProofreadSettingsToDb(next);
  };

  const toggleFocus = (area: FocusArea) => {
    const has = settings.focusAreas.includes(area);
    const nextAreas = has ? settings.focusAreas.filter((a) => a !== area) : [...settings.focusAreas, area];
    updateSettings({ ...settings, focusAreas: nextAreas });
  };

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
          <DialogTitle>Språkvask-innstillinger</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Tilpass språkprofil, fokusområder og dine egne erstatningsregler.
        </p>

        {/* Språkprofil */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Språkprofil</h4>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PROFILE_LABELS) as LanguageProfile[]).map((p) => {
              const active = settings.profile === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => updateSettings({ ...settings, profile: p })}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="text-sm font-medium">{PROFILE_LABELS[p].label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{PROFILE_LABELS[p].desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fokusområder */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Fokusområder</h4>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FOCUS_LABELS) as FocusArea[]).map((f) => {
              const active = settings.focusAreas.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFocus(f)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted/50"
                  }`}
                >
                  {FOCUS_LABELS[f]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Egne regler */}
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium mb-1">Egne erstatningsregler</h4>
          <p className="text-xs text-muted-foreground">
            Anvendes alltid, uavhengig av språkprofil.
          </p>
        </div>

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
