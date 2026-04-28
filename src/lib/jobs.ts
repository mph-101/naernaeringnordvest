import { supabase } from "@/integrations/supabase/client";

export const PREMIUM_PRICE_NOK = 4990;
export const PREMIUM_PRICE_ID = "job_premium_one_time";

export const EMPLOYMENT_TYPES = [
  { value: "fulltime", label_no: "Fast/heltid", label_en: "Full-time" },
  { value: "parttime", label_no: "Deltid", label_en: "Part-time" },
  { value: "temporary", label_no: "Vikariat", label_en: "Temporary" },
  { value: "internship", label_no: "Lærling/praksis", label_en: "Internship" },
  { value: "freelance", label_no: "Frilans/oppdrag", label_en: "Freelance" },
] as const;

export type JobListing = {
  id: string;
  slug: string | null;
  title: string;
  company_name: string;
  company_orgnr: string | null;
  company_logo_url: string | null;
  location: string;
  region_slug: string | null;
  employment_type: string;
  industry: string | null;
  salary_range: string | null;
  application_deadline: string | null;
  description_html: string;
  application_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  is_premium: boolean;
  premium_payment_method: string | null;
  premium_paid_at: string | null;
  additional_regions: string[];
  view_count: number;
  apply_click_count: number;
  employer_profile_id: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  submitted_by: string | null;
};

export async function fetchPublishedJobs(opts?: { region?: string | null; limit?: number; premiumOnly?: boolean }): Promise<JobListing[]> {
  let q = supabase
    .from("job_listings")
    .select("*")
    .eq("status", "published")
    .order("is_premium", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.region) q = q.or(`region_slug.eq.${opts.region},additional_regions.cs.{${opts.region}}`);
  if (opts?.premiumOnly) q = q.eq("is_premium", true);
  const { data, error } = await q;
  if (error) {
    console.warn("fetchPublishedJobs error", error);
    return [];
  }
  return (data ?? []) as JobListing[];
}

export async function fetchJobBySlug(slug: string): Promise<JobListing | null> {
  const { data } = await supabase
    .from("job_listings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as JobListing | null) ?? null;
}

export function jobUrl(job: Pick<JobListing, "slug" | "id">): string {
  return `/stillinger/${job.slug ?? job.id}`;
}

export function jsonLdJobPosting(job: JobListing, baseUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description_html,
    datePosted: job.published_at ?? job.created_at,
    validThrough: job.expires_at ?? job.application_deadline ?? undefined,
    employmentType: job.employment_type?.toUpperCase(),
    hiringOrganization: {
      "@type": "Organization",
      name: job.company_name,
      logo: job.company_logo_url ?? undefined,
    },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "NO" },
    },
    industry: job.industry ?? undefined,
    baseSalary: job.salary_range ? { "@type": "MonetaryAmount", currency: "NOK", value: { "@type": "QuantitativeValue", value: job.salary_range, unitText: "MONTH" } } : undefined,
    url: `${baseUrl}/stillinger/${job.slug ?? job.id}`,
  };
}