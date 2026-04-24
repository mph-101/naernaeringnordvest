import { useEffect, useState } from "react";
import {
  Plus, Trash2, RefreshCw, Loader2, Globe, Rss, FileText, Database,
  CheckCircle2, AlertCircle, Edit3, X, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SourceType = "url" | "rss" | "document" | "api";

interface TrustedSource {
  id: string;
  name: string;
  description: string | null;
  source_type: SourceType;
  url: string | null;
  storage_path: string | null;
  tags: string[];
  priority: number;
  active: boolean;
  index_strategy: "periodic" | "live" | "hybrid";
  refresh_interval_hours: number;
  last_indexed_at: string | null;
  last_index_error: string | null;
  created_at: string;
}

const TYPE_META: Record<SourceType, { label: string; icon: any; hint: string }> = {
  url: { label: "Nettside", icon: Globe, hint: "Én konkret URL som hentes og indekseres" },
  rss: { label: "RSS-feed", icon: Rss, hint: "Feed med nyhetssaker som indekseres jevnlig" },
  document: { label: "Dokument", icon: FileText, hint: "Last opp tekstdokument (kun .txt for nå)" },
  api: { label: "API/datakilde", icon: Database, hint: "Live oppslag, ikke indeksert" },
};

const empty = (): Partial<TrustedSource> => ({
  name: "",
  description: "",
  source_type: "url",
  url: "",
  tags: [],
  priority: 50,
  active: true,
  index_strategy: "periodic",
  refresh_interval_hours: 24,
});

export const TrustedSourcesManager = () => {
  const [sources, setSources] = useState<TrustedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<TrustedSource> | null>(null);
  const [saving, setSaving] = useState(false);
  const [indexing, setIndexing] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trusted_sources")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setSources((data || []) as TrustedSource[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (s?: TrustedSource) => {
    if (s) {
      setEditing({ ...s });
      setTagsInput(s.tags.join(", "));
    } else {
      setEditing(empty());
      setTagsInput("");
    }
    setDocFile(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setTagsInput("");
    setDocFile(null);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) return toast.error("Navn er påkrevd");
    if ((editing.source_type === "url" || editing.source_type === "rss") && !editing.url?.trim()) {
      return toast.error("URL er påkrevd for denne typen");
    }
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      let storage_path = editing.storage_path || null;

      if (editing.source_type === "document" && docFile) {
        const path = `${Date.now()}-${docFile.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("trusted-sources")
          .upload(path, docFile, { upsert: false });
        if (upErr) throw upErr;
        storage_path = path;
      }

      const payload = {
        name: editing.name!.trim(),
        description: editing.description || null,
        source_type: editing.source_type!,
        url: editing.url || null,
        storage_path,
        tags,
        priority: editing.priority ?? 50,
        active: editing.active ?? true,
        index_strategy: editing.index_strategy ?? "periodic",
        refresh_interval_hours: editing.refresh_interval_hours ?? 24,
      };

      let savedId = editing.id;
      if (editing.id) {
        const { error } = await supabase.from("trusted_sources").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("trusted_sources")
          .insert({ ...payload, created_by: user?.id })
          .select("id")
          .single();
        if (error) throw error;
        savedId = data!.id;
      }

      toast.success("Lagret");
      cancelEdit();
      await load();

      // Auto-index after save (except for API type)
      if (savedId && payload.source_type !== "api") {
        await runIndex(savedId);
      }
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke lagre");
    } finally {
      setSaving(false);
    }
  };

  const runIndex = async (id: string) => {
    setIndexing(id);
    try {
      const { data, error } = await supabase.functions.invoke("index-trusted-source", {
        body: { source_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Indeksert: ${data?.inserted ?? 0} biter`);
      await load();
    } catch (e: any) {
      toast.error(`Indeksering feilet: ${e.message}`);
    } finally {
      setIndexing(null);
    }
  };

  const remove = async (s: TrustedSource) => {
    if (!confirm(`Slett kilden "${s.name}"? Indeksert innhold blir også fjernet.`)) return;
    const { error } = await supabase.from("trusted_sources").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    if (s.storage_path) {
      await supabase.storage.from("trusted-sources").remove([s.storage_path]);
    }
    toast.success("Slettet");
    await load();
  };

  const toggleActive = async (s: TrustedSource) => {
    const { error } = await supabase.from("trusted_sources").update({ active: !s.active }).eq("id", s.id);
    if (error) return toast.error(error.message);
    await load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-headline">Betrodde kilder</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Eksterne kilder som chatboten kan bruke i tillegg til artikkelarkivet og databasene.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => startEdit()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-subhead hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Ny kilde
          </button>
        )}
      </div>

      {editing && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline text-lg font-semibold text-headline">
              {editing.id ? "Rediger kilde" : "Ny kilde"}
            </h3>
            <button onClick={cancelEdit} className="p-2 hover:bg-muted rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-subhead font-medium mb-1">Navn *</label>
              <input
                type="text"
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="f.eks. SSB pressemeldinger"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-subhead font-medium mb-1">Beskrivelse</label>
              <textarea
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-subhead font-medium mb-1">Type *</label>
              <select
                value={editing.source_type}
                onChange={(e) => setEditing({ ...editing, source_type: e.target.value as SourceType })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body"
              >
                {Object.entries(TYPE_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">{TYPE_META[editing.source_type as SourceType].hint}</p>
            </div>

            <div>
              <label className="block text-sm font-subhead font-medium mb-1">Strategi</label>
              <select
                value={editing.index_strategy}
                onChange={(e) => setEditing({ ...editing, index_strategy: e.target.value as any })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body"
              >
                <option value="periodic">Periodisk indeksering</option>
                <option value="live">Live henting</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {(editing.source_type === "url" || editing.source_type === "rss" || editing.source_type === "api") && (
              <div className="md:col-span-2">
                <label className="block text-sm font-subhead font-medium mb-1">URL *</label>
                <input
                  type="url"
                  value={editing.url || ""}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body"
                />
              </div>
            )}

            {editing.source_type === "document" && (
              <div className="md:col-span-2">
                <label className="block text-sm font-subhead font-medium mb-1">Dokument (.txt)</label>
                <input
                  type="file"
                  accept=".txt,.md,text/plain"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body"
                />
                {editing.storage_path && !docFile && (
                  <p className="text-xs text-muted-foreground mt-1">Eksisterende: {editing.storage_path}</p>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-subhead font-medium mb-1">Tagger (kommaseparert)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="ssb, statistikk, økonomi"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-sm font-subhead font-medium mb-1">Prioritet (0–100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={editing.priority ?? 50}
                onChange={(e) => setEditing({ ...editing, priority: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-sm font-subhead font-medium mb-1">Oppdater (timer)</label>
              <input
                type="number"
                min={1}
                value={editing.refresh_interval_hours ?? 24}
                onChange={(e) => setEditing({ ...editing, refresh_interval_hours: parseInt(e.target.value, 10) || 24 })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={editing.active ?? true}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              <label htmlFor="active" className="text-sm font-body">Aktiv (tilgjengelig for chatbot)</label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-subhead disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lagre {editing.source_type !== "api" && "& indekser"}
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-border rounded-lg font-subhead hover:bg-muted"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sources.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground font-body">Ingen betrodde kilder lagt til ennå.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((s) => {
            const Icon = TYPE_META[s.source_type].icon;
            return (
              <div
                key={s.id}
                className={`bg-card border border-border rounded-xl p-4 ${!s.active ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-subhead font-semibold text-headline">{s.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                          {TYPE_META[s.source_type].label}
                        </span>
                        <span className="text-xs text-muted-foreground">prioritet {s.priority}</span>
                      </div>
                      {s.description && (
                        <p className="text-sm text-muted-foreground font-body mt-1">{s.description}</p>
                      )}
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline break-all"
                        >
                          {s.url}
                        </a>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {s.last_indexed_at ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            Indeksert {new Date(s.last_indexed_at).toLocaleString("no-NO")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Ikke indeksert
                          </span>
                        )}
                        {s.last_index_error && (
                          <span className="text-destructive">Feil: {s.last_index_error}</span>
                        )}
                        {s.tags.length > 0 && <span>· {s.tags.join(", ")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(s)}
                      className="px-2 py-1 text-xs border border-border rounded-lg hover:bg-muted"
                    >
                      {s.active ? "Deaktiver" : "Aktiver"}
                    </button>
                    {s.source_type !== "api" && (
                      <button
                        onClick={() => runIndex(s.id)}
                        disabled={indexing === s.id}
                        className="p-2 hover:bg-muted rounded-lg disabled:opacity-50"
                        title="Re-indekser"
                      >
                        {indexing === s.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button onClick={() => startEdit(s)} className="p-2 hover:bg-muted rounded-lg">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(s)} className="p-2 hover:bg-muted rounded-lg text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
