import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, MapPin, ExternalLink, Check, X, Loader2, Trash2, ChevronDown } from "lucide-react";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  url: string | null;
  organizer: string | null;
  category: string | null;
  region_slug: string | null;
  status: string;
  moderation_note: string | null;
  submitted_by: string;
  created_at: string;
}

type Filter = "pending" | "approved" | "rejected" | "all";

export const EventsReview = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("events").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setEvents((data ?? []) as EventRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const moderate = async (id: string, status: "approved" | "rejected", note?: string) => {
    setBusyId(id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("events").update({
      status,
      moderation_note: note ?? null,
      moderated_by: user?.id ?? null,
      moderated_at: new Date().toISOString(),
    }).eq("id", id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Godkjent" : "Avvist");
    setNoteFor(null);
    setNoteText("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Slette arrangement?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Slettet");
    load();
  };

  const fmt = (s: string) =>
    new Date(s).toLocaleString("nb-NO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-headline text-2xl text-headline">Arrangementer</h2>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["pending", "approved", "rejected", "all"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-md ${filter === f ? "bg-card shadow-soft font-medium" : "text-muted-foreground"}`}>
              {f === "pending" ? "Venter" : f === "approved" ? "Godkjent" : f === "rejected" ? "Avvist" : "Alle"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <p className="text-center text-muted-foreground py-16 bg-card rounded-xl border border-border">Ingen arrangementer.</p>
      ) : (
        <div className="space-y-4">
          {events.map((e) => (
            <article key={e.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      e.status === "pending" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                      e.status === "approved" ? "bg-emerald-500/15 text-emerald-600" :
                      "bg-destructive/15 text-destructive"
                    }`}>{e.status}</span>
                    {e.category && <span className="text-xs text-muted-foreground">{e.category}</span>}
                  </div>
                  <h3 className="font-headline text-lg text-headline">{e.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmt(e.start_at)}{e.end_at ? ` – ${fmt(e.end_at)}` : ""}</span>
                    {e.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {e.location}</span>}
                    {e.url && (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" /> Lenke
                      </a>
                    )}
                  </div>
                  {e.organizer && <p className="text-xs text-muted-foreground mt-1">Arrangør: {e.organizer}</p>}
                  {e.description && <p className="text-sm text-foreground/85 mt-3 whitespace-pre-wrap">{e.description}</p>}
                  {e.moderation_note && (
                    <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted rounded-md">
                      <span className="font-medium">Notat: </span>{e.moderation_note}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">Sendt inn: {fmt(e.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {e.status !== "approved" && (
                    <button disabled={busyId === e.id} onClick={() => moderate(e.id, "approved")}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-sm">
                      <Check className="w-4 h-4" /> Godkjenn
                    </button>
                  )}
                  {e.status !== "rejected" && (
                    <button disabled={busyId === e.id} onClick={() => setNoteFor(noteFor === e.id ? null : e.id)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                      <X className="w-4 h-4" /> Avvis <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => remove(e.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {noteFor === e.id && (
                <div className="mt-4 pt-4 border-t border-border flex gap-2">
                  <input value={noteText} onChange={(ev) => setNoteText(ev.target.value)} placeholder="Begrunnelse (valgfritt)"
                    className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm" />
                  <button onClick={() => moderate(e.id, "rejected", noteText.trim() || undefined)}
                    className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm">Bekreft avvisning</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};