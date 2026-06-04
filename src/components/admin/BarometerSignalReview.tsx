import { useState, useEffect } from "react";
import { Check, X, Trash2, Loader2, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Signal {
  id: string;
  indicator: string;
  nace_code: string;
  period: string;
  direction: "opp" | "ned";
  deviation_pct: number | null;
  observed_value: number | null;
  baseline_value: number | null;
  source_table: string | null;
  source_payload: Record<string, any> | null;
  status: string;
  created_at: string;
}

const nf = (n: number) => n.toLocaleString("nb-NO", { maximumFractionDigits: 1 });
const SSB_URL = (t: string) => `https://www.ssb.no/statbank/table/${t}`;

// Menneskelesbar tittel + forslag til vinkling (mal-basert, ingen AI).
function describe(s: Signal): { title: string; angle: string; unit: string } {
  const dev = s.deviation_pct != null ? nf(Math.abs(s.deviation_pct)) : "?";
  const retning = s.direction === "opp" ? "opp" : "ned";
  const obs = s.observed_value != null ? nf(s.observed_value) : "?";
  const base = s.baseline_value != null ? nf(s.baseline_value) : "?";
  if (s.indicator === "omsetning") {
    const bransje = s.source_payload?.bransje ?? `næring ${s.nace_code}`;
    return {
      title: `Omsetning — ${bransje}`,
      unit: "mill. kr",
      angle: `Omsetningen i ${bransje} i Møre og Romsdal gikk ${retning} ${dev} % i ${s.period}, fra ${base} til ${obs} mill. kr — et tydelig avvik fra året før.`,
    };
  }
  if (s.indicator === "konkurser") {
    return {
      title: "Konkurser — siste 12 måneder",
      unit: "konkurser",
      angle: `Antall opna konkursar siste 12 måneder (${obs}) ligger ${dev} % ${retning === "opp" ? "over" : "under"} sesongnormalen (${base}) i Møre og Romsdal.`,
    };
  }
  if (s.indicator === "etableringer") {
    return {
      title: "Nye foretak",
      unit: "foretak",
      angle: `Antall nye foretak i ${s.period} (${obs}) ligger ${dev} % ${retning === "opp" ? "over" : "under"} femårssnittet (${base}) i Møre og Romsdal.`,
    };
  }
  return { title: s.indicator, unit: "", angle: "" };
}

export const BarometerSignalReview = () => {
  const [items, setItems] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "published" | "rejected">("pending");

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("barometer_signals")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });
    setItems((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [filter]);

  const setStatus = async (id: string, status: "published" | "rejected") => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("barometer_signals").update({
      status,
      reviewed_by: session?.user.id,
      reviewed_at: new Date().toISOString(),
    } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "published" ? "Godkjent" : "Avvist");
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("barometer_signals").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Slettet");
    fetchItems();
  };

  return (
    <div>
      <h2 className="font-headline text-2xl font-semibold text-headline mb-2">Næringsbarometer — avvikssignaler</h2>
      <p className="font-body text-sm text-muted-foreground mb-6">
        Automatisk oppdagede avvik fra SSB-data. Godkjenn for å bruke som utgangspunkt for en sak, eller avvis.
      </p>

      <div className="flex gap-2 mb-6">
        {(["pending", "published", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-subhead font-medium transition-all ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {s === "pending" ? "Til vurdering" : s === "published" ? "Godkjent" : "Avvist"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground font-body text-center py-12">Ingen signaler å vise</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const d = describe(item);
            const up = item.direction === "opp";
            return (
              <div key={item.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-headline text-base font-semibold text-headline">{d.title}</span>
                      <span className={`flex items-center gap-0.5 px-2 py-0.5 text-xs font-subhead font-medium rounded-full ${
                        up ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
                        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {item.deviation_pct != null ? `${item.deviation_pct > 0 ? "+" : ""}${nf(item.deviation_pct)} %` : "—"}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-subhead rounded-full bg-secondary text-muted-foreground">{item.period}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-body">
                      {nf(item.observed_value ?? 0)} {d.unit} (mot {nf(item.baseline_value ?? 0)})
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-body flex-shrink-0">
                    {new Date(item.created_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}
                  </span>
                </div>

                <p className="text-sm text-foreground font-body leading-relaxed mb-3 p-3 bg-secondary/40 rounded-lg">
                  {d.angle}
                </p>

                {item.source_table && (
                  <a href={SSB_URL(item.source_table)} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mb-3 w-fit">
                    <ExternalLink className="w-3 h-3" /> Kilde: SSB tabell {item.source_table}
                  </a>
                )}

                <div className="flex items-center gap-2">
                  {filter === "pending" && (
                    <>
                      <button onClick={() => setStatus(item.id, "published")}
                        className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-subhead hover:bg-accent/20 transition-colors">
                        <Check className="w-3 h-3" /> Godkjenn
                      </button>
                      <button onClick={() => setStatus(item.id, "rejected")}
                        className="flex items-center gap-1 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-subhead hover:bg-destructive/20 transition-colors">
                        <X className="w-3 h-3" /> Avvis
                      </button>
                    </>
                  )}
                  <button onClick={() => handleDelete(item.id)}
                    className="ml-auto p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
