import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUrlParam } from "@/lib/params";
import { ArrowLeft, MapPin, Briefcase, Calendar, Building2, Mail, Phone, ExternalLink, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchJobBySlug, jsonLdJobPosting, EMPLOYMENT_TYPES, type JobListing } from "@/lib/jobs";

export default function StillingDetail() {
  const slug = getUrlParam();
  const navigate = useNavigate();
  const { language } = useTheme();
  const { userId } = useAuth();
  const isNo = language === "no";
  const [job, setJob] = useState<JobListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [employer, setEmployer] = useState<{ slug: string; company_name: string } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    (async () => {
      const j = await fetchJobBySlug(slug);
      if (!mounted) return;
      setJob(j);
      setLoading(false);
      if (j && j.status === "published") {
        // Async, fire-and-forget. Skip for self-views.
        if (j.submitted_by !== userId) {
          supabase.rpc("increment_job_view", { _job_id: j.id }).then(() => {});
        }
        document.title = `${j.title} – ${j.company_name} | Nær Næring`;
        const meta =
          document.querySelector('meta[name="description"]') ||
          Object.assign(document.head.appendChild(document.createElement("meta")), { name: "description" });
        const stripped = (j.description_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 155);
        meta.setAttribute("content", stripped);

        if (j.employer_profile_id) {
          const { data } = await supabase
            .from("employer_profiles")
            .select("slug, company_name")
            .eq("id", j.employer_profile_id)
            .eq("is_published", true)
            .maybeSingle();
          if (mounted) setEmployer(data as any);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="max-w-3xl mx-auto px-6 py-16 text-center text-muted-foreground font-body">
          {isNo ? "Laster…" : "Loading…"}
        </div>
      </div>
    );
  }

  if (!job || job.status !== "published") {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="font-headline text-xl text-headline">
            {isNo ? "Stillingen finnes ikke" : "Job not found"}
          </p>
          <Link to="/stillinger" className="inline-block mt-4 text-primary font-body">
            {isNo ? "Tilbake til alle stillinger" : "Back to all jobs"}
          </Link>
        </div>
      </div>
    );
  }

  const employmentLabel = EMPLOYMENT_TYPES.find((t) => t.value === job.employment_type);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const handleApplyClick = () => {
    if (job.submitted_by !== userId) {
      supabase.rpc("increment_job_apply_click", { _job_id: job.id }).then(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdJobPosting(job, baseUrl)) }} />

      <main className="max-w-3xl mx-auto px-6 py-8 md:py-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> {isNo ? "Tilbake" : "Back"}
        </button>

        {job.is_premium && (
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary font-body font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> {isNo ? "Premium-annonse" : "Featured posting"}
          </div>
        )}

        <div className="flex items-start gap-4 mb-6">
          {job.company_logo_url ? (
            <img src={job.company_logo_url} alt={job.company_name} className="w-16 h-16 rounded-xl object-cover bg-muted shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-headline text-2xl md:text-3xl font-bold text-headline">{job.title}</h1>
            <p className="font-body text-foreground mt-1">
              {employer ? (
                <Link to={`/arbeidsgiver/${employer.slug}`} className="hover:underline">{job.company_name}</Link>
              ) : (
                job.company_name
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground font-body mb-8 pb-6 border-b border-border">
          <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" />{job.location}</span>
          {employmentLabel && (
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              {isNo ? employmentLabel.label_no : employmentLabel.label_en}
            </span>
          )}
          {job.application_deadline && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {isNo ? "Søknadsfrist" : "Deadline"}: {new Date(job.application_deadline).toLocaleDateString(isNo ? "nb-NO" : "en-US")}
            </span>
          )}
          {job.salary_range && <span>· {job.salary_range}</span>}
          {job.industry && <span>· {job.industry}</span>}
        </div>

        <article
          className="prose prose-stone dark:prose-invert max-w-none font-body text-foreground"
          dangerouslySetInnerHTML={{ __html: job.description_html ?? "" }}
        />

        <div className="mt-10 p-6 rounded-2xl bg-card border border-border">
          <h2 className="font-headline text-lg font-semibold text-headline mb-4">
            {isNo ? "Søk på stillingen" : "Apply for this position"}
          </h2>
          {job.application_url && (
            <a
              href={job.application_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleApplyClick}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full font-body font-medium hover:opacity-90 transition-opacity"
            >
              {isNo ? "Søk her" : "Apply now"}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <div className="mt-4 space-y-1 text-sm font-body text-muted-foreground">
            {job.contact_name && <p>{isNo ? "Kontakt" : "Contact"}: <span className="text-foreground">{job.contact_name}</span></p>}
            {job.contact_email && (
              <p className="inline-flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                <a href={`mailto:${job.contact_email}`} className="text-foreground hover:underline" onClick={handleApplyClick}>{job.contact_email}</a>
              </p>
            )}
            {job.contact_phone && (
              <p className="inline-flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                <a href={`tel:${job.contact_phone}`} className="text-foreground hover:underline">{job.contact_phone}</a>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}