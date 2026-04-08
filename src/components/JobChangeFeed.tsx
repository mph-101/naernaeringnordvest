import { useState, useEffect } from "react";
import { Briefcase, ArrowRight, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

interface JobChange {
  id: string;
  person_name: string;
  new_role: string | null;
  new_company: string | null;
  change_type: string;
  generated_notice: string | null;
  source_url: string | null;
  published_at: string | null;
}

export const JobChangeFeed = () => {
  const { language } = useTheme();
  const isNo = language === "no";
  const [items, setItems] = useState<JobChange[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("job_changes")
        .select("id, person_name, new_role, new_company, change_type, generated_notice, source_url, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(5);
      setItems((data as any[]) || []);
    };
    fetch();
  }, []);

  const typeLabel = (type: string) => {
    if (isNo) {
      if (type === "promotion") return "Rykket opp";
      if (type === "job_change") return "Byttet jobb";
      return "Ny jobb";
    }
    if (type === "promotion") return "Promoted";
    if (type === "job_change") return "Job change";
    return "New job";
  };

  const typeBg = (type: string) => {
    if (type === "promotion") return "bg-accent/10 text-accent";
    if (type === "job_change") return "bg-primary/10 text-primary";
    return "bg-secondary text-muted-foreground";
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-4.5 h-4.5 text-primary" />
          </div>
          <h2 className="font-headline text-lg font-semibold text-headline">
            {isNo ? "Jobbytter" : "Job Changes"}
          </h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-primary font-subhead font-medium hover:underline"
        >
          {isNo ? "Meld inn" : "Report"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5">
          <LazyJobChangeForm onSubmitted={() => setShowForm(false)} />
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body py-4 text-center">
          {isNo ? "Ingen publiserte jobbytter ennå" : "No published job changes yet"}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-subhead font-semibold text-sm text-headline">{item.person_name}</span>
                  <span className={`px-2 py-0.5 text-xs font-subhead font-medium rounded-full ${typeBg(item.change_type)}`}>
                    {typeLabel(item.change_type)}
                  </span>
                </div>
                {item.generated_notice && (
                  <p className="text-sm text-foreground font-body leading-relaxed">{item.generated_notice}</p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {item.published_at && (
                    <span className="text-xs text-muted-foreground font-body">
                      {new Date(item.published_at).toLocaleDateString(isNo ? "nb-NO" : "en-US", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  {item.source_url && (
                    <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {isNo ? "Kilde" : "Source"}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// Lazy import to avoid loading form for read-only users
import { JobChangeForm } from "./JobChangeForm";
const LazyJobChangeForm = JobChangeForm;
