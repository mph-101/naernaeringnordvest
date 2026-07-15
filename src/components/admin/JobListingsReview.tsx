import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, MapPin, Building2, ExternalLink, Check, X, Trash2 } from "lucide-react";

type JobRow = {
  id: string;
  slug: string | null;
  title: string;
  company_name: string;
  location: string;
  status: string;
  is_premium: boolean;
  premium_payment_method: string | null;
  view_count: number;
  apply_click_count: number;
  created_at: string;
  application_url: string | null;
};

const STATUSES = ["pending", "published", "rejected"] as const;

export function JobListingsReview() {
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("pending");
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_listings")
      .select("id, slug, title, company_name, location, status, is_premium, premium_payment_method, view_count, apply_click_count, created_at, application_url")
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as JobRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const updateStatus = async (id: string, status: "published" | "rejected" | "pending") => {
    const patch: { status: string; published_at?: string } = { status };
    if (status === "published") patch.published_at = new Date().toISOString();
    const { error } = await supabase.from("job_listings").update(patch as any).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Oppdatert");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Slett stillingen permanent?")) return;
    const { error } = await supabase.from("job_listings").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Slettet");
    load();
  };

  return (
    <div>
      <h2 className="font-headline text-2xl font-semibold text-headline mb-4">Stillingsannonser</h2>
      <div className="flex gap-2 mb-6">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-body transition-colors ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "pending" ? "Til godkjenning" : s === "published" ? "Publisert" : "Avvist"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground font-body">Laster…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground font-body">Ingen stillinger.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-start">
              <div className="flex-1 min-w-[260px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-headline font-semibold text-headline">{r.title}</h3>
                  {r.is_premium && (
                    <span className="inline-flex items-center gap-1 text-[0.6875rem] uppercase tracking-wider text-primary font-body font-semibold">
                      <Sparkles className="w-3 h-3" /> Premium ({r.premium_payment_method ?? "?"})
                    </span>
                  )}
                </div>
                <p className="text-sm font-body text-foreground mt-0.5 inline-flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> {r.company_name}
                  <span className="mx-1 text-muted-foreground">·</span>
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {r.location}
                </p>
                <p className="text-xs text-muted-foreground font-body mt-1">
                  {new Date(r.created_at).toLocaleString("nb-NO")} · 👁 {r.view_count} · ↗ {r.apply_click_count}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.slug && (
                  <a
                    href={`/stillinger/${r.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-accent text-foreground"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Åpne
                  </a>
                )}
                {filter !== "published" && (
                  <button
                    onClick={() => updateStatus(r.id, "published")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-primary text-primary-foreground"
                  >
                    <Check className="w-3.5 h-3.5" /> Publisér
                  </button>
                )}
                {filter !== "rejected" && (
                  <button
                    onClick={() => updateStatus(r.id, "rejected")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-accent text-foreground"
                  >
                    <X className="w-3.5 h-3.5" /> Avvis
                  </button>
                )}
                <button
                  onClick={() => remove(r.id)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}