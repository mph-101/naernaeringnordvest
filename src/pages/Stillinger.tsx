import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Briefcase, MapPin, Sparkles, Plus, Building2, Clock } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { fetchPublishedJobs, jobUrl, EMPLOYMENT_TYPES, type JobListing } from "@/lib/jobs";

export default function Stillinger() {
  const { language } = useTheme();
  const isNo = language === "no";
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    document.title = isNo
      ? "Ledige stillinger i lokalt næringsliv | Nær Næring"
      : "Local business jobs | Nær Næring";
    const meta =
      document.querySelector('meta[name="description"]') ||
      Object.assign(document.head.appendChild(document.createElement("meta")), { name: "description" });
    meta.setAttribute(
      "content",
      isNo
        ? "Gratis publisering av stillingsannonser. Finn jobb i Møre og Romsdal og resten av regionen."
        : "Free job posting for local employers. Find jobs across the region.",
    );
  }, [isNo]);

  useEffect(() => {
    fetchPublishedJobs({ limit: 100 }).then((rows) => {
      setJobs(rows);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return jobs;
    return jobs.filter((j) => j.employment_type === filter);
  }, [jobs, filter]);

  const premium = filtered.filter((j) => j.is_premium);
  const standard = filtered.filter((j) => !j.is_premium);

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main className="max-w-5xl mx-auto px-6 py-8 md:py-12">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground font-body text-sm mb-2">
              <Briefcase className="w-4 h-4" />
              {isNo ? "Stillinger" : "Jobs"}
            </div>
            <h1 className="font-headline text-3xl md:text-4xl font-bold text-headline">
              {isNo ? "Ledige stillinger" : "Open positions"}
            </h1>
            <p className="text-muted-foreground font-body mt-2 max-w-xl">
              {isNo
                ? "Gratis publisering for alle bedrifter i regionen. Premium fremheving 4 990 kr/stilling."
                : "Free posting for all regional employers. Premium feature 4,990 NOK per posting."}
            </p>
          </div>
          <Link
            to="/stillinger/ny"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full font-body font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {isNo ? "Legg ut stilling" : "Post a job"}
          </Link>
        </div>

        <div className="flex gap-2 flex-wrap mb-8">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>{isNo ? "Alle" : "All"}</FilterChip>
          {EMPLOYMENT_TYPES.map((t) => (
            <FilterChip key={t.value} active={filter === t.value} onClick={() => setFilter(t.value)}>
              {isNo ? t.label_no : t.label_en}
            </FilterChip>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground font-body py-12 text-center">{isNo ? "Laster…" : "Loading…"}</p>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-12 text-center">
            <p className="text-muted-foreground font-body">
              {isNo ? "Ingen stillinger publisert enda. Bli den første – det er gratis." : "No listings yet. Be first — it's free."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {premium.length > 0 && (
              <section>
                <h2 className="font-headline text-lg font-semibold text-headline mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {isNo ? "Fremhevet" : "Featured"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {premium.map((j) => <JobCard key={j.id} job={j} featured isNo={isNo} />)}
                </div>
              </section>
            )}
            {standard.length > 0 && (
              <section>
                {premium.length > 0 && (
                  <h2 className="font-headline text-lg font-semibold text-headline mb-3">
                    {isNo ? "Alle stillinger" : "All positions"}
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {standard.map((j) => <JobCard key={j.id} job={j} isNo={isNo} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-body transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function JobCard({ job, featured, isNo }: { job: JobListing; featured?: boolean; isNo: boolean }) {
  const employmentLabel = EMPLOYMENT_TYPES.find((t) => t.value === job.employment_type);
  return (
    <Link
      to={jobUrl(job)}
      className={`block rounded-2xl p-5 transition-all hover:shadow-soft ${
        featured
          ? "bg-gradient-to-br from-primary/5 via-card to-card border-2 border-primary/30"
          : "bg-card border border-border hover:border-accent"
      }`}
    >
      <div className="flex gap-4 items-start">
        {job.company_logo_url ? (
          <img src={job.company_logo_url} alt={job.company_name} className="w-12 h-12 rounded-lg object-cover bg-muted" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <Building2 className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {featured && (
            <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-primary font-body font-semibold mb-1">
              <Sparkles className="w-3 h-3" /> {isNo ? "Premium" : "Featured"}
            </span>
          )}
          <h3 className="font-headline text-base font-semibold text-headline line-clamp-2">{job.title}</h3>
          <p className="font-body text-sm text-foreground mt-1">{job.company_name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground font-body">
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
            {employmentLabel && <span>{isNo ? employmentLabel.label_no : employmentLabel.label_en}</span>}
            {job.application_deadline && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isNo ? "Frist: " : "Deadline: "}
                {new Date(job.application_deadline).toLocaleDateString(isNo ? "nb-NO" : "en-US", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}