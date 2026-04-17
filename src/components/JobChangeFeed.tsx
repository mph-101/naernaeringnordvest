import { useState, useEffect, useRef } from "react";
import { Briefcase, ArrowRight, ExternalLink, User, Building2, BadgeCheck, Linkedin, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    setCurrentIndex(clamped);
    setExpandedId(null);
    scrollRef.current?.children[clamped]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    }
  };

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

  const renderCard = (item: JobChange) => {
    const structured = parseNotice(item.generated_notice);
    const isExpanded = expandedId === item.id;

    return (
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {item.image_url && (
          <div className="relative">
            <img src={item.image_url} alt={item.person_name} className="w-full h-48 object-cover" />
            {item.photo_credit && (
              <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-[10px] text-muted-foreground font-body px-2 py-0.5 rounded">
                {item.photo_credit}
              </span>
            )}
          </div>
        )}
        <div className="p-4">
          {structured ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 text-xs font-subhead font-medium rounded-full ${typeBg(item.change_type)}`}>
                  {typeLabel(item.change_type)}
                </span>
                {item.published_at && (
                  <span className="text-xs text-muted-foreground font-body">
                    {new Date(item.published_at).toLocaleDateString(isNo ? "nb-NO" : "en-US", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
              <h3 className="font-headline text-base font-semibold text-headline mb-1">{structured.title}</h3>
              <p className="text-sm text-muted-foreground font-body mb-3 line-clamp-2">{structured.ingress}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="flex items-center gap-1.5 text-xs font-subhead font-medium bg-secondary px-2.5 py-1 rounded-lg">
                  <User className="w-3 h-3 text-primary" /> {structured.key_points.name}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-subhead font-medium bg-secondary px-2.5 py-1 rounded-lg">
                  <BadgeCheck className="w-3 h-3 text-primary" /> {structured.key_points.role}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-subhead font-medium bg-secondary px-2.5 py-1 rounded-lg">
                  <Building2 className="w-3 h-3 text-primary" /> {structured.key_points.company}
                </span>
              </div>
              {isExpanded && (
                <p className="text-sm text-foreground font-body leading-relaxed mb-2">{structured.body}</p>
              )}
              <div className="flex items-center gap-3">
                <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="text-xs text-primary font-subhead hover:underline">
                  {isExpanded ? (isNo ? "Vis mindre" : "Show less") : (isNo ? "Les mer" : "Read more")}
                </button>
                {item.source_url && (
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {isNo ? "Kilde" : "Source"}
                  </a>
                )}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}&title=${encodeURIComponent(structured.title)}&summary=${encodeURIComponent(structured.ingress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0A66C2] hover:underline flex items-center gap-1 font-subhead font-medium"
                >
                  <Linkedin className="w-3 h-3" /> LinkedIn
                </a>
              </div>
            </>
          ) : (
            <div className="flex gap-3 items-start">
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
          )}
        </div>
      </div>
    );
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
        <div className="flex items-center gap-3">
          {items.length > 1 && (
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => goTo(currentIndex + 1)}
                disabled={currentIndex === items.length - 1}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm text-primary font-subhead font-medium hover:underline"
          >
            {isNo ? "Meld inn" : "Report"}
          </button>
        </div>
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
        <div className="relative">
          {/* Carousel container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-1 px-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 w-full snap-start"
              >
                {renderCard(item)}
              </div>
            ))}
          </div>

          {/* Dots */}
          {items.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentIndex
                      ? "bg-primary w-4"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

// Lazy import to avoid loading form for read-only users
import { JobChangeForm } from "./JobChangeForm";
const LazyJobChangeForm = JobChangeForm;
