import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, ExternalLink, FileText } from "lucide-react";

type Row = {
  id: string;
  job_listing_id: string;
  company_name: string;
  orgnr: string | null;
  invoice_email: string;
  invoice_reference: string | null;
  amount_nok: number;
  status: string;
  notes: string | null;
  processed_at: string | null;
  created_at: string;
  job_listings: { title: string; slug: string | null } | null;
};

const STATUSES = ["pending", "invoiced", "paid", "cancelled"] as const;
const LABELS: Record<string, string> = {
  pending: "Til fakturering",
  invoiced: "Fakturert",
  paid: "Betalt",
  cancelled: "Kansellert",
};

export function JobInvoiceRequests() {
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_invoice_requests")
      .select("id, job_listing_id, company_name, orgnr, invoice_email, invoice_reference, amount_nok, status, notes, processed_at, created_at, job_listings(title, slug)")
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (row: Row, status: (typeof STATUSES)[number]) => {
    const { error } = await supabase
      .from("job_invoice_requests")
      .update({ status, processed_at: status === "pending" ? null : new Date().toISOString() })
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }

    // When marked paid, also flip the listing to premium
    if (status === "paid") {
      const featuredUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("job_listings")
        .update({
          is_premium: true,
          premium_paid_at: new Date().toISOString(),
          premium_payment_method: "invoice",
          featured_until: featuredUntil,
        })
        .eq("id", row.job_listing_id);
    }
    toast.success("Oppdatert");
    load();
  };

  return (
    <div>
      <h2 className="font-headline text-2xl font-semibold text-headline mb-4">Faktura-forespørsler (Premium)</h2>
      <p className="text-sm text-muted-foreground font-body mb-4">
        Bedrifter som har valgt faktura for Premium-pakken (4 990 kr). Marker som «Fakturert» når faktura er sendt, og «Betalt» når oppgjør er mottatt — annonsen blir da automatisk Premium i 30 dager.
      </p>
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-body transition-colors ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground font-body">Laster…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground font-body">Ingen forespørsler.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-start">
              <div className="flex-1 min-w-[260px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-headline font-semibold text-headline">{r.company_name}</h3>
                  {r.orgnr && (
                    <span className="text-xs font-mono text-muted-foreground">{r.orgnr}</span>
                  )}
                </div>
                <p className="text-sm font-body text-foreground mt-1">
                  {r.job_listings?.title ?? "(stilling slettet)"} · {r.amount_nok.toLocaleString("nb-NO")} kr
                </p>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  E-post: {r.invoice_email}
                  {r.invoice_reference && <> · Ref: {r.invoice_reference}</>}
                </p>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  Mottatt {new Date(r.created_at).toLocaleString("nb-NO")}
                  {r.processed_at && ` · Behandlet ${new Date(r.processed_at).toLocaleString("nb-NO")}`}
                </p>
                {r.notes && <p className="text-xs text-muted-foreground italic mt-1">«{r.notes}»</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {r.job_listings?.slug && (
                  <a
                    href={`/stillinger/${r.job_listings.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-accent text-foreground"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Annonse
                  </a>
                )}
                {filter === "pending" && (
                  <button
                    onClick={() => updateStatus(r, "invoiced")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-accent text-foreground"
                  >
                    Marker som fakturert
                  </button>
                )}
                {(filter === "pending" || filter === "invoiced") && (
                  <button
                    onClick={() => updateStatus(r, "paid")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-primary text-primary-foreground"
                  >
                    <Check className="w-3.5 h-3.5" /> Marker som betalt
                  </button>
                )}
                {filter !== "cancelled" && (
                  <button
                    onClick={() => updateStatus(r, "cancelled")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-destructive hover:bg-destructive/10"
                  >
                    Kanseller
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}