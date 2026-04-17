
-- ============================================
-- JOB LISTINGS
-- ============================================
CREATE TABLE public.job_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  company_name text NOT NULL,
  company_orgnr text,
  company_logo_url text,
  location text NOT NULL,
  region_slug text REFERENCES public.editorial_regions(slug),
  employment_type text NOT NULL DEFAULT 'fulltime',
  industry text,
  salary_range text,
  application_deadline date,
  description_html text NOT NULL,
  application_url text,
  contact_name text,
  contact_email text,
  contact_phone text,
  status text NOT NULL DEFAULT 'pending',
  submitted_by uuid,
  reviewed_by uuid,
  rejection_reason text,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_listings_status ON public.job_listings(status);
CREATE INDEX idx_job_listings_region ON public.job_listings(region_slug);
CREATE INDEX idx_job_listings_published_at ON public.job_listings(published_at DESC);
CREATE INDEX idx_job_listings_deadline ON public.job_listings(application_deadline);

ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published job listings"
ON public.job_listings FOR SELECT
USING (status = 'published');

CREATE POLICY "Authenticated users can submit job listings"
ON public.job_listings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can view own submissions"
ON public.job_listings FOR SELECT
TO authenticated
USING (auth.uid() = submitted_by);

CREATE POLICY "Business users can update own listings"
ON public.job_listings FOR UPDATE
TO authenticated
USING (auth.uid() = submitted_by AND has_role(auth.uid(), 'business'::public.app_role))
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Staff can view all job listings"
ON public.job_listings FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'editor'::public.app_role));

CREATE POLICY "Staff can update job listings"
ON public.job_listings FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'editor'::public.app_role));

CREATE POLICY "Staff can delete job listings"
ON public.job_listings FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_job_listings_updated_at
BEFORE UPDATE ON public.job_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- NEWSLETTER SUBSCRIPTIONS
-- ============================================
CREATE TABLE public.newsletter_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  user_id uuid,
  region_slugs text[] NOT NULL DEFAULT '{}',
  topics text[] NOT NULL DEFAULT ARRAY['articles','jobs','job_changes']::text[],
  frequency text NOT NULL DEFAULT 'weekly',
  confirmed boolean NOT NULL DEFAULT false,
  confirmation_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  confirmed_at timestamptz,
  unsubscribe_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  unsubscribed_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_newsletter_email ON public.newsletter_subscriptions(email);
CREATE INDEX idx_newsletter_confirmed ON public.newsletter_subscriptions(confirmed) WHERE unsubscribed_at IS NULL;
CREATE INDEX idx_newsletter_confirmation_token ON public.newsletter_subscriptions(confirmation_token);
CREATE INDEX idx_newsletter_unsubscribe_token ON public.newsletter_subscriptions(unsubscribe_token);

ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all subscriptions"
ON public.newsletter_subscriptions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'editor'::public.app_role));

CREATE POLICY "Users can view own subscription"
ON public.newsletter_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Staff can delete subscriptions"
ON public.newsletter_subscriptions FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_newsletter_subscriptions_updated_at
BEFORE UPDATE ON public.newsletter_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- NEWSLETTER ISSUES
-- ============================================
CREATE TABLE public.newsletter_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  preview_text text,
  html_content text NOT NULL,
  region_slug text REFERENCES public.editorial_regions(slug),
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  triggered_by text NOT NULL DEFAULT 'manual',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage newsletter issues"
ON public.newsletter_issues FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'editor'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'editor'::public.app_role));

CREATE TRIGGER update_newsletter_issues_updated_at
BEFORE UPDATE ON public.newsletter_issues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-logos', 'job-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view job logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-logos');

CREATE POLICY "Authenticated users can upload job logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own job logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'job-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own job logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'job-logos' AND auth.uid() IS NOT NULL);
