import { lazy, Suspense, useState, useEffect } from "react";
import { Briefcase, ExternalLink, ChevronDown, Linkedin } from "lucide-react";
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
  image_url: string | null;
  photo_credit: string | null;
}

interface StructuredNotice {
  title: string;
  ingress: string;
  key_points: { name: string; role: string; company: string };
  body: string;
}

const parseNotice = (notice: string | null): StructuredNotice | null => {
  if (!notice) return null;
  try {
    const parsed = JSON.parse(notice);
    if (parsed.title && parsed.ingress && parsed.key_points && parsed.body) return parsed;
  } catch {}
  return null;
};

export const JobChangeFeed = () => {
  const { language } = useTheme();
  const isNo = language === "no";
  const [items, setItems] = useState<JobChange[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("job_changes")
        .select("id, person_name, new_role, new_company, change_type, generated_notice, source_url, published_at, image_url, photo_credit")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(10);
      setItems((data as any[]) || []);
    };
    fetchData();
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
    if (type === "promotion") return "bg-accent/10 text-accent-ink";
    if (type === "job_change") return "bg-primary/10 text-primary-ink";
    return "bg-secondary text-muted-foreground";
  };

  const renderRow = (item: JobChange) => {
    const structured = parseNotice(item.generated_notice);
    const name = structured?.key_points.name || item.person_name;
    const role = structured?.key_points.role || item.new_role;
    const company = structured?.key_points.company || item.new_company;
    const body = structured?.body || item.generated_notice;
    const isExpanded = expandedId === item.id;
    const canExpand = Boolean(body || item.image_url);

    return (
      <li key={item.id} className="border-b border-border last:border-0">
        {/* Stretched-button row: the chevron <button> covers the collapsed row
            via after:inset-0; the source link sits above it with z-10. */}
        <div
          className={`relative flex items-start gap-3 py-3 ${canExpand ? "hover:bg-muted/30" : ""} transition-colors`}
        >
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline flex-wrap gap-x-2">
              <span className="font-subhead font-semibold text-sm text-headline">{name}</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-subhead font-medium rounded ${typeBg(item.change_type)}`}>
                {typeLabel(item.change_type)}
              </span>
            </div>
            {(role || company) && (
              <p className="text-sm text-foreground font-body truncate">
                {role}{role && company ? ` · ${company}` : company || ""}
              </p>
            )}
            <div className="flex items-center gap-3 mt-0.5">
              {item.published_at && (
                <span className="text-xs text-muted-foreground font-body">
                  {new Date(item.published_at).toLocaleDateString(isNo ? "nb-NO" : "en-US", { day: "numeric", month: "short" })}
                </span>
              )}
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-10 text-xs text-primary-ink hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> {isNo ? "Kilde" : "Source"}
                </a>
              )}
            </div>
          </div>
          {canExpand && (
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
              aria-expanded={isExpanded}
              aria-label={isNo ? `Vis detaljer for ${name}` : `Show details for ${name}`}
              className="flex-shrink-0 p-2 -m-1 mt-0 rounded-md text-muted-foreground after:absolute after:inset-0 after:content-[''] after:cursor-pointer"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
        {isExpanded && canExpand && (
          <div className="pl-10 pr-2 pb-4 -mt-1 space-y-3 animate-fade-up">
            {item.image_url && (
              <div className="relative rounded-lg overflow-hidden">
                <img src={item.image_url} alt={name} className="w-full max-h-64 object-cover" />
                {item.photo_credit && (
                  <span className="absolute bottom-1.5 right-1.5 bg-background/80 backdrop-blur-sm text-[10px] text-muted-foreground font-body px-1.5 py-0.5 rounded">
                    {item.photo_credit}
                  </span>
                )}
              </div>
            )}
            {body && (
              <p className="text-sm text-foreground font-body leading-relaxed whitespace-pre-line">
                {body}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&summary=${encodeURIComponent(`${name} – ${role || ""}${role && company ? " · " : ""}${company || ""}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-subhead font-medium text-primary-ink hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
                aria-label={isNo ? "Del på LinkedIn" : "Share on LinkedIn"}
              >
                <Linkedin className="w-3.5 h-3.5" />
                {isNo ? "Del på LinkedIn" : "Share on LinkedIn"}
              </a>
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-[18px] h-[18px] text-primary-ink" />
          </div>
          <h2 className="font-headline text-lg font-semibold text-headline">
            {isNo ? "Jobbytter" : "Job Changes"}
          </h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-primary-ink font-subhead font-medium hover:underline"
        >
          {isNo ? "Meld inn" : "Report"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5">
          <Suspense fallback={null}>
            <LazyJobChangeForm onSubmitted={() => setShowForm(false)} />
          </Suspense>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body py-4 text-center">
          {isNo ? "Ingen publiserte jobbytter ennå" : "No published job changes yet"}
        </p>
      ) : (
        <ul className="-my-3">
          {items.map((item) => renderRow(item))}
        </ul>
      )}
    </section>
  );
};

// Loaded on demand — the form chunk is only fetched when a reader opens "Meld inn"
const LazyJobChangeForm = lazy(() =>
  import("./JobChangeForm").then((m) => ({ default: m.JobChangeForm })),
);
