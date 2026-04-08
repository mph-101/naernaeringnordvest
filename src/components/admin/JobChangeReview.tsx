import { useState, useEffect } from "react";
import { Check, X, Trash2, Loader2, ExternalLink, Sparkles, User, Building2, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JobChange {
  id: string;
  person_name: string;
  new_role: string | null;
  new_company: string | null;
  old_role: string | null;
  old_company: string | null;
  change_type: string;
  source_url: string | null;
  source_text: string | null;
  generated_notice: string | null;
  status: string;
  created_at: string;
  image_url: string | null;
  photo_credit: string | null;
}

export const JobChangeReview = () => {
  const [items, setItems] = useState<JobChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "published" | "rejected">("pending");
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("job_changes")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });
    setItems((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [filter]);

  const handleApprove = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("job_changes").update({
      status: "published",
      published_at: new Date().toISOString(),
      reviewed_by: session?.user.id,
    } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Publisert!");
    fetchItems();
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from("job_changes").update({ status: "rejected" } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Avvist");
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("job_changes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Slettet");
    fetchItems();
  };

  const handleRegenerate = async (item: JobChange) => {
    setRegeneratingId(item.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-notice", {
        body: item.source_text
          ? { source_text: item.source_text, person_name: item.person_name }
          : { person_name: item.person_name, new_role: item.new_role, new_company: item.new_company, old_role: item.old_role, old_company: item.old_company, change_type: item.change_type },
      });
      if (error) throw error;
      await supabase.from("job_changes").update({ generated_notice: data.notice } as any).eq("id", item.id);
      fetchItems();
      toast.success("Notis regenerert");
    } catch (e: any) {
      toast.error(e.message || "Feil");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleNoticeEdit = async (id: string, notice: string) => {
    await supabase.from("job_changes").update({ generated_notice: notice } as any).eq("id", id);
  };

  const typeLabel = (t: string) => t === "promotion" ? "Rykket opp" : t === "job_change" ? "Byttet jobb" : "Ny jobb";

  return (
    <div>
      <h2 className="font-headline text-2xl font-semibold text-headline mb-6">Jobbytter</h2>

      <div className="flex gap-2 mb-6">
        {(["pending", "published", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-sm font-subhead font-medium transition-all ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {s === "pending" ? "Venter" : s === "published" ? "Publisert" : "Avvist"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground font-body text-center py-12">Ingen jobbytter å vise</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {item.image_url && (
                <div className="relative">
                  <img src={item.image_url} alt={item.person_name} className="w-full h-40 object-cover" />
                  {item.photo_credit && (
                    <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-[10px] text-muted-foreground font-body px-2 py-0.5 rounded">
                      {item.photo_credit}
                    </span>
                  )}
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-headline text-base font-semibold text-headline">{item.person_name}</span>
                      <span className="px-2 py-0.5 text-xs font-subhead font-medium rounded-full bg-secondary text-muted-foreground">{typeLabel(item.change_type)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-body space-x-3">
                      {item.new_role && <span>→ {item.new_role}</span>}
                      {item.new_company && <span>@ {item.new_company}</span>}
                      {item.old_role && <span>(fra {item.old_role})</span>}
                      {item.old_company && <span>@ {item.old_company}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-body flex-shrink-0">
                    {new Date(item.created_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}
                  </span>
                </div>

                {item.source_text && (
                  <details className="mb-3">
                    <summary className="text-xs text-primary font-subhead cursor-pointer">Vis kildetekst</summary>
                    <p className="text-xs text-muted-foreground font-body mt-1 p-2 bg-secondary rounded-lg whitespace-pre-wrap">{item.source_text}</p>
                  </details>
                )}
                {item.source_url && (
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mb-3">
                    <ExternalLink className="w-3 h-3" /> Kilde
                  </a>
                )}

                {/* Structured notice preview */}
                {(() => {
                  try {
                    const parsed = JSON.parse(item.generated_notice || "");
                    if (parsed.title && parsed.key_points) {
                      return (
                        <div className="mb-3 p-3 bg-secondary/50 rounded-lg space-y-2">
                          <div className="font-headline text-sm font-semibold text-headline">{parsed.title}</div>
                          <div className="text-xs text-muted-foreground font-body">{parsed.ingress}</div>
                          <div className="flex flex-wrap gap-2">
                            <span className="flex items-center gap-1 text-xs bg-background px-2 py-0.5 rounded">
                              <User className="w-3 h-3 text-primary" /> {parsed.key_points.name}
                            </span>
                            <span className="flex items-center gap-1 text-xs bg-background px-2 py-0.5 rounded">
                              <BadgeCheck className="w-3 h-3 text-primary" /> {parsed.key_points.role}
                            </span>
                            <span className="flex items-center gap-1 text-xs bg-background px-2 py-0.5 rounded">
                              <Building2 className="w-3 h-3 text-primary" /> {parsed.key_points.company}
                            </span>
                          </div>
                          <div className="text-xs text-foreground font-body leading-relaxed">{parsed.body}</div>
                        </div>
                      );
                    }
                  } catch {}
                  return null;
                })()}
                <textarea
                  defaultValue={item.generated_notice || ""}
                  onBlur={(e) => handleNoticeEdit(item.id, e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-3"
                />

                <div className="flex items-center gap-2">
                  <button onClick={() => handleRegenerate(item)} disabled={regeneratingId === item.id} className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-subhead hover:bg-secondary/80 transition-colors disabled:opacity-50">
                    {regeneratingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Regenerer
                  </button>
                  {filter === "pending" && (
                    <>
                      <button onClick={() => handleApprove(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-subhead hover:bg-accent/20 transition-colors">
                        <Check className="w-3 h-3" /> Publiser
                      </button>
                      <button onClick={() => handleReject(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-subhead hover:bg-destructive/20 transition-colors">
                        <X className="w-3 h-3" /> Avvis
                      </button>
                    </>
                  )}
                  <button onClick={() => handleDelete(item.id)} className="ml-auto p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
