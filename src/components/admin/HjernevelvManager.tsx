import { useEffect, useState } from "react";
import { Plus, Loader2, Trash2, Pencil, Save, X, Calendar, Users, MessageSquare, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { fetchRegions, type EditorialRegion } from "@/lib/regions";
import { toast } from "sonner";
import {
  type HjernevelvWriter,
  type HjernevelvPanel,
  type PanelQuestion,
  FORMAT_LABEL,
  STATUS_LABEL,
  formatPanelDate,
} from "@/lib/hjernevelv";

type Tab = "writers" | "panels" | "questions";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const HjernevelvManager = () => {
  const { language } = useTheme();
  const isNo = language === "no";
  const [tab, setTab] = useState<Tab>("writers");
  const [regions, setRegions] = useState<EditorialRegion[]>([]);

  useEffect(() => { fetchRegions().then(setRegions).catch(() => {}); }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-headline text-2xl font-semibold text-headline">Hjernevelvet</h2>
        <p className="text-sm text-muted-foreground font-body">
          {isNo ? "Skribenter, kvartalsvise paneler og leserspørsmål" : "Writers, quarterly panels and reader questions"}
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border">
        {([
          { id: "writers" as Tab, label: isNo ? "Skribenter" : "Writers", icon: Users },
          { id: "panels" as Tab, label: isNo ? "Paneler" : "Panels", icon: Calendar },
          { id: "questions" as Tab, label: isNo ? "Spørsmål" : "Questions", icon: MessageSquare },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-subhead transition border-b-2 -mb-px ${
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "writers" && <WritersTab regions={regions} isNo={isNo} />}
      {tab === "panels" && <PanelsTab regions={regions} isNo={isNo} />}
      {tab === "questions" && <QuestionsTab isNo={isNo} />}
    </div>
  );
};

// ----------- WRITERS -----------
const WritersTab = ({ regions, isNo }: { regions: EditorialRegion[]; isNo: boolean }) => {
  const [items, setItems] = useState<HjernevelvWriter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<HjernevelvWriter> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("hjernevelv_writers" as any).select("*").order("created_at", { ascending: false });
    setItems(((data as unknown as HjernevelvWriter[]) || []));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name) { toast.error(isNo ? "Navn mangler" : "Name required"); return; }
    const payload: any = {
      name: editing.name,
      slug: editing.slug || slugify(editing.name),
      bio: editing.bio || null,
      avatar_url: editing.avatar_url || null,
      expertise: editing.expertise || [],
      region_slug: editing.region_slug || null,
      website_url: editing.website_url || null,
      linkedin_url: editing.linkedin_url || null,
      twitter_url: editing.twitter_url || null,
      active: editing.active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("hjernevelv_writers" as any).update(payload).eq("id", editing.id)
      : await supabase.from("hjernevelv_writers" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(isNo ? "Lagret" : "Saved");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm(isNo ? "Slette skribent?" : "Delete writer?")) return;
    const { error } = await supabase.from("hjernevelv_writers" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(isNo ? "Slettet" : "Deleted");
    load();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditing({ active: true, expertise: [] })}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-subhead font-medium hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" /> {isNo ? "Ny skribent" : "New writer"}
        </button>
      </div>

      {editing && (
        <WriterForm
          value={editing}
          onChange={setEditing}
          onSave={save}
          onCancel={() => setEditing(null)}
          regions={regions}
          isNo={isNo}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body text-center py-8">{isNo ? "Ingen skribenter" : "No writers"}</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
          {items.map((w) => (
            <li key={w.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-headline text-muted-foreground shrink-0 overflow-hidden">
                {w.avatar_url ? <img src={w.avatar_url} alt="" className="w-full h-full object-cover" /> : w.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-body text-foreground truncate">{w.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {w.region_slug ?? (isNo ? "Uten region" : "No region")} · {w.expertise.slice(0, 2).join(", ")}
                  {!w.active && <span className="ml-2 text-destructive">{isNo ? "Inaktiv" : "Inactive"}</span>}
                </div>
              </div>
              <button onClick={() => setEditing(w)} className="p-2 rounded-md hover:bg-secondary text-muted-foreground"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => del(w.id)} className="p-2 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const WriterForm = ({
  value, onChange, onSave, onCancel, regions, isNo,
}: {
  value: Partial<HjernevelvWriter>;
  onChange: (v: Partial<HjernevelvWriter>) => void;
  onSave: () => void; onCancel: () => void;
  regions: EditorialRegion[]; isNo: boolean;
}) => (
  <div className="bg-card border border-border rounded-xl p-5 mb-4 space-y-3">
    <div className="grid sm:grid-cols-2 gap-3">
      <input value={value.name ?? ""} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder={isNo ? "Navn" : "Name"} className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
      <input value={value.slug ?? ""} onChange={(e) => onChange({ ...value, slug: e.target.value })} placeholder="slug (auto)" className="px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono" />
    </div>
    <textarea value={value.bio ?? ""} onChange={(e) => onChange({ ...value, bio: e.target.value })} placeholder="Bio" rows={3} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
    <div className="grid sm:grid-cols-2 gap-3">
      <input value={value.avatar_url ?? ""} onChange={(e) => onChange({ ...value, avatar_url: e.target.value })} placeholder="Avatar URL" className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
      <select value={value.region_slug ?? ""} onChange={(e) => onChange({ ...value, region_slug: e.target.value || null })} className="px-3 py-2 rounded-lg bg-background border border-border text-sm">
        <option value="">{isNo ? "— Region —" : "— Region —"}</option>
        {regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
      </select>
    </div>
    <input
      value={(value.expertise ?? []).join(", ")}
      onChange={(e) => onChange({ ...value, expertise: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
      placeholder={isNo ? "Fagfelt (komma-separert)" : "Expertise (comma-separated)"}
      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
    />
    <div className="grid sm:grid-cols-3 gap-3">
      <input value={value.website_url ?? ""} onChange={(e) => onChange({ ...value, website_url: e.target.value })} placeholder="Website" className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
      <input value={value.linkedin_url ?? ""} onChange={(e) => onChange({ ...value, linkedin_url: e.target.value })} placeholder="LinkedIn" className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
      <input value={value.twitter_url ?? ""} onChange={(e) => onChange({ ...value, twitter_url: e.target.value })} placeholder="Twitter" className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
    </div>
    <label className="inline-flex items-center gap-2 text-xs font-body text-muted-foreground">
      <input type="checkbox" checked={value.active ?? true} onChange={(e) => onChange({ ...value, active: e.target.checked })} />
      {isNo ? "Aktiv" : "Active"}
    </label>
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onCancel} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-sm font-subhead hover:bg-secondary"><X className="w-4 h-4" /> {isNo ? "Avbryt" : "Cancel"}</button>
      <button onClick={onSave} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-subhead hover:opacity-90"><Save className="w-4 h-4" /> {isNo ? "Lagre" : "Save"}</button>
    </div>
  </div>
);

// ----------- PANELS -----------
const PanelsTab = ({ regions, isNo }: { regions: EditorialRegion[]; isNo: boolean }) => {
  const [items, setItems] = useState<HjernevelvPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<HjernevelvPanel> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("hjernevelv_panels" as any).select("*").order("scheduled_at", { ascending: false });
    setItems(((data as unknown as HjernevelvPanel[]) || []));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title || !editing?.scheduled_at) { toast.error(isNo ? "Tittel og dato kreves" : "Title and date required"); return; }
    const payload: any = {
      title: editing.title,
      description: editing.description || null,
      topic: editing.topic || null,
      region_slug: editing.region_slug || null,
      format: editing.format ?? "digital",
      status: editing.status ?? "planned",
      scheduled_at: editing.scheduled_at,
      duration_minutes: editing.duration_minutes ?? 60,
      location: editing.location || null,
      meeting_url: editing.meeting_url || null,
      max_attendees: editing.max_attendees ?? null,
      cover_image_url: editing.cover_image_url || null,
    };
    const { error } = editing.id
      ? await supabase.from("hjernevelv_panels" as any).update(payload).eq("id", editing.id)
      : await supabase.from("hjernevelv_panels" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(isNo ? "Lagret" : "Saved");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm(isNo ? "Slette panel?" : "Delete panel?")) return;
    const { error } = await supabase.from("hjernevelv_panels" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setEditing({ format: "digital", status: "planned", duration_minutes: 60, scheduled_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16) })} className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-subhead font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> {isNo ? "Nytt panel" : "New panel"}
        </button>
      </div>

      {editing && (
        <div className="bg-card border border-border rounded-xl p-5 mb-4 space-y-3">
          <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder={isNo ? "Tittel" : "Title"} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
          <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder={isNo ? "Beskrivelse" : "Description"} rows={3} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={editing.topic ?? ""} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} placeholder={isNo ? "Tema" : "Topic"} className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            <select value={editing.region_slug ?? ""} onChange={(e) => setEditing({ ...editing, region_slug: e.target.value || null })} className="px-3 py-2 rounded-lg bg-background border border-border text-sm">
              <option value="">— Region —</option>
              {regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <select value={editing.format ?? "digital"} onChange={(e) => setEditing({ ...editing, format: e.target.value as any })} className="px-3 py-2 rounded-lg bg-background border border-border text-sm">
              {(["digital", "physical", "hybrid"] as const).map((f) => <option key={f} value={f}>{FORMAT_LABEL[f][isNo ? "no" : "en"]}</option>)}
            </select>
            <select value={editing.status ?? "planned"} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })} className="px-3 py-2 rounded-lg bg-background border border-border text-sm">
              {(["planned", "open", "live", "completed", "cancelled"] as const).map((s) => <option key={s} value={s}>{STATUS_LABEL[s][isNo ? "no" : "en"]}</option>)}
            </select>
            <input type="datetime-local" value={typeof editing.scheduled_at === "string" ? editing.scheduled_at.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, scheduled_at: new Date(e.target.value).toISOString() })} className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <input type="number" min={15} step={15} value={editing.duration_minutes ?? 60} onChange={(e) => setEditing({ ...editing, duration_minutes: parseInt(e.target.value, 10) || 60 })} placeholder="Min" className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            <input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder={isNo ? "Sted" : "Location"} className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            <input value={editing.meeting_url ?? ""} onChange={(e) => setEditing({ ...editing, meeting_url: e.target.value })} placeholder="Meeting URL" className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
          </div>
          <input type="number" min={0} value={editing.max_attendees ?? ""} onChange={(e) => setEditing({ ...editing, max_attendees: e.target.value ? parseInt(e.target.value, 10) : null })} placeholder={isNo ? "Maks deltakere (valgfritt)" : "Max attendees (optional)"} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditing(null)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-sm font-subhead hover:bg-secondary"><X className="w-4 h-4" /> {isNo ? "Avbryt" : "Cancel"}</button>
            <button onClick={save} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-subhead hover:opacity-90"><Save className="w-4 h-4" /> {isNo ? "Lagre" : "Save"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body text-center py-8">{isNo ? "Ingen paneler" : "No panels"}</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-body text-foreground truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {formatPanelDate(p.scheduled_at, isNo ? "no" : "en")} · {STATUS_LABEL[p.status][isNo ? "no" : "en"]} · {p.region_slug ?? "—"}
                </div>
              </div>
              <button onClick={() => setEditing({ ...p, scheduled_at: p.scheduled_at })} className="p-2 rounded-md hover:bg-secondary text-muted-foreground"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => del(p.id)} className="p-2 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ----------- QUESTIONS -----------
const QuestionsTab = ({ isNo }: { isNo: boolean }) => {
  const [items, setItems] = useState<(PanelQuestion & { panel_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("hjernevelv_panel_questions" as any)
      .select("*, panel:hjernevelv_panels(title)")
      .order("created_at", { ascending: false });
    if (statusFilter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    setItems(((data as any[]) || []).map((row) => ({ ...row, panel_title: row.panel?.title })) as any);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const setStatus = async (id: string, status: PanelQuestion["status"]) => {
    const { error } = await supabase.from("hjernevelv_panel_questions" as any).update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["pending", "all"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-subhead transition border ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground/80"}`}>
            {s === "pending" ? (isNo ? "Venter på godkjenning" : "Pending") : (isNo ? "Alle" : "All")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body text-center py-8">{isNo ? "Ingen spørsmål" : "No questions"}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <li key={q.id} className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground font-body mb-1">
                {q.panel_title} · {new Date(q.created_at).toLocaleDateString("nb-NO")}
                {q.is_anonymous && <span className="ml-2">{isNo ? "(anonym)" : "(anonymous)"}</span>}
                <span className="ml-2 px-2 py-0.5 rounded-full bg-secondary">{q.status}</span>
              </div>
              <p className="text-sm text-foreground font-body whitespace-pre-wrap mb-3">{q.question}</p>
              <div className="flex gap-2">
                {q.status !== "approved" && (
                  <button onClick={() => setStatus(q.id, "approved")} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent/15 text-accent text-xs font-subhead hover:bg-accent/25 transition">
                    <Check className="w-3 h-3" /> {isNo ? "Godkjenn" : "Approve"}
                  </button>
                )}
                {q.status !== "answered" && (
                  <button onClick={() => setStatus(q.id, "answered")} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary/15 text-primary text-xs font-subhead hover:bg-primary/25 transition">
                    <Check className="w-3 h-3" /> {isNo ? "Marker besvart" : "Mark answered"}
                  </button>
                )}
                {q.status !== "rejected" && (
                  <button onClick={() => setStatus(q.id, "rejected")} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-subhead hover:bg-destructive/20 transition">
                    <X className="w-3 h-3" /> {isNo ? "Avvis" : "Reject"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
