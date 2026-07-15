import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, AlertTriangle, Check, X } from "lucide-react";
import { toast } from "sonner";

interface PollOption { id: string; label: string }
interface PollRow {
  id: string;
  question: string;
  description: string | null;
  options: PollOption[];
  active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

function uid() { return Math.random().toString(36).slice(2, 9); }
function toLocal(ts: string | null) { if (!ts) return ""; const d = new Date(ts); const off = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - off).toISOString().slice(0, 16); }
function fromLocal(ts: string) { return ts ? new Date(ts).toISOString() : null; }

export function PollsManager() {
  const [rows, setRows] = useState<PollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PollRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []).map((r: any) => ({ ...r, options: Array.isArray(r.options) ? r.options : [] })));
  };
  useEffect(() => { load(); }, []);

  const hasActiveThisWeek = useMemo(() => {
    const inAWeek = Date.now() + 7 * 24 * 3600_000;
    return rows.some((r) => r.active && new Date(r.starts_at).getTime() <= Date.now() && (!r.ends_at || new Date(r.ends_at).getTime() > Date.now()) && (!r.ends_at || new Date(r.ends_at).getTime() < inAWeek + 1));
  }, [rows]);

  const startNew = () => {
    const now = new Date();
    const ends = new Date(now.getTime() + 7 * 24 * 3600_000);
    setEditing({
      id: "",
      question: "",
      description: "",
      options: [{ id: uid(), label: "" }, { id: uid(), label: "" }],
      active: true,
      starts_at: now.toISOString(),
      ends_at: ends.toISOString(),
      created_at: now.toISOString(),
    });
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-headline">Meningsmåling</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">Aktuelt spørsmål fra nyhetsbildet — minst én aktiv per uke.</p>
        </div>
        <button onClick={startNew} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full font-subhead text-sm font-semibold">
          <Plus className="w-4 h-4" /> Ny måling
        </button>
      </div>

      {!loading && !hasActiveThisWeek && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800/40 dark:text-amber-100">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm font-body">
            <strong className="font-semibold">Ingen aktiv meningsmåling de neste 7 dagene.</strong> Opprett en ny for å holde forsiden levende.
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : (
        <div className="space-y-3">
          {rows.length === 0 && <p className="text-muted-foreground font-body">Ingen målinger ennå.</p>}
          {rows.map((r) => {
            const active = r.active && new Date(r.starts_at).getTime() <= Date.now() && (!r.ends_at || new Date(r.ends_at).getTime() > Date.now());
            return (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {active ? (
                      <span className="inline-flex items-center gap-1 text-[0.625rem] uppercase tracking-wider font-subhead font-semibold px-2 py-0.5 bg-accent/15 text-accent rounded-full"><Check className="w-3 h-3" /> Aktiv</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[0.625rem] uppercase tracking-wider font-subhead font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded-full">Inaktiv</span>
                    )}
                    <span className="text-xs text-muted-foreground font-body">
                      {new Date(r.starts_at).toLocaleDateString("nb-NO")}
                      {r.ends_at && ` – ${new Date(r.ends_at).toLocaleDateString("nb-NO")}`}
                    </span>
                  </div>
                  <h3 className="font-headline font-semibold text-headline truncate">{r.question}</h3>
                  <p className="text-xs text-muted-foreground font-body mt-1">{r.options.length} svaralternativ</p>
                </div>
                <button onClick={() => setEditing(r)} className="text-sm px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 font-subhead">Rediger</button>
              </div>
            );
          })}
        </div>
      )}

      {editing && <PollEditor poll={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function PollEditor({ poll, onClose, onSaved }: { poll: PollRow; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<PollRow>(poll);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.question.trim()) { toast.error("Spørsmål er påkrevd"); return; }
    const cleanOpts = draft.options.filter((o) => o.label.trim()).map((o) => ({ id: o.id, label: o.label.trim() }));
    if (cleanOpts.length < 2) { toast.error("Minst to svaralternativ"); return; }
    setSaving(true);
    const payload: any = {
      question: draft.question.trim(),
      description: draft.description?.trim() || null,
      options: cleanOpts,
      active: draft.active,
      starts_at: draft.starts_at,
      ends_at: draft.ends_at,
    };
    let error;
    if (draft.id) {
      ({ error } = await supabase.from("polls").update(payload).eq("id", draft.id));
    } else {
      const { data: u } = await supabase.auth.getUser();
      payload.created_by = u.user?.id;
      ({ error } = await supabase.from("polls").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lagret");
    onSaved();
  };

  const remove = async () => {
    if (!draft.id) { onClose(); return; }
    if (!confirm("Slette denne meningsmålingen?")) return;
    const { error } = await supabase.from("polls").delete().eq("id", draft.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Slettet");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl shadow-elevated w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-headline text-xl font-bold text-headline">{draft.id ? "Rediger" : "Ny meningsmåling"}</h3>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-subhead font-semibold text-muted-foreground uppercase tracking-wider">Spørsmål</label>
            <input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} className="mt-1 w-full bg-surface-subtle border border-border rounded-lg px-3 py-2 font-body" />
          </div>
          <div>
            <label className="text-xs font-subhead font-semibold text-muted-foreground uppercase tracking-wider">Beskrivelse (valgfri)</label>
            <textarea value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} className="mt-1 w-full bg-surface-subtle border border-border rounded-lg px-3 py-2 font-body resize-none" />
          </div>

          <div>
            <label className="text-xs font-subhead font-semibold text-muted-foreground uppercase tracking-wider">Svaralternativ</label>
            <div className="space-y-2 mt-1">
              {draft.options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    value={opt.label}
                    onChange={(e) => {
                      const next = [...draft.options];
                      next[i] = { ...opt, label: e.target.value };
                      setDraft({ ...draft, options: next });
                    }}
                    placeholder={`Alternativ ${i + 1}`}
                    className="flex-1 bg-surface-subtle border border-border rounded-lg px-3 py-2 font-body"
                  />
                  {draft.options.length > 2 && (
                    <button onClick={() => setDraft({ ...draft, options: draft.options.filter((_, idx) => idx !== i) })} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
              {draft.options.length < 5 && (
                <button onClick={() => setDraft({ ...draft, options: [...draft.options, { id: uid(), label: "" }] })} className="text-sm text-accent font-subhead font-semibold inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Legg til alternativ</button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-subhead font-semibold text-muted-foreground uppercase tracking-wider">Starter</label>
              <input type="datetime-local" value={toLocal(draft.starts_at)} onChange={(e) => setDraft({ ...draft, starts_at: fromLocal(e.target.value) || draft.starts_at })} className="mt-1 w-full bg-surface-subtle border border-border rounded-lg px-3 py-2 font-body" />
            </div>
            <div>
              <label className="text-xs font-subhead font-semibold text-muted-foreground uppercase tracking-wider">Slutter</label>
              <input type="datetime-local" value={toLocal(draft.ends_at)} onChange={(e) => setDraft({ ...draft, ends_at: fromLocal(e.target.value) })} className="mt-1 w-full bg-surface-subtle border border-border rounded-lg px-3 py-2 font-body" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-body">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Aktiv
          </label>
        </div>

        <div className="flex items-center justify-between mt-6">
          {draft.id ? (
            <button onClick={remove} className="text-sm text-destructive hover:underline">Slett</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-subhead text-muted-foreground hover:text-foreground">Avbryt</button>
            <button onClick={save} disabled={saving} className="px-5 py-2 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Lagre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}