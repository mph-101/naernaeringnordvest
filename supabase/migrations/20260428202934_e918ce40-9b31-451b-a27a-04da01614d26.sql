
-- ============================================
-- JOB LISTINGS — premium + extras
-- ============================================
ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS premium_payment_method text, -- 'stripe' | 'invoice'
  ADD COLUMN IF NOT EXISTS premium_amount_nok integer,
  ADD COLUMN IF NOT EXISTS premium_stripe_session_id text,
  ADD COLUMN IF NOT EXISTS additional_regions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apply_click_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz;

-- Slug auto-generation
CREATE OR REPLACE FUNCTION public.generate_job_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  counter int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND length(NEW.slug) > 0 THEN
    RETURN NEW;
  END IF;
  base_slug := lower(regexp_replace(coalesce(NEW.title, '') || '-' || coalesce(NEW.company_name, ''), '[^a-z0-9æøåÆØÅ]+', '-', 'gi'));
  base_slug := trim(both '-' from base_slug);
  base_slug := substring(base_slug from 1 for 80);
  IF base_slug = '' THEN
    base_slug := 'stilling';
  END IF;
  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.job_listings WHERE slug = candidate AND id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    candidate := base_slug || '-' || counter::text;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_listings_slug ON public.job_listings;
CREATE TRIGGER trg_job_listings_slug
BEFORE INSERT OR UPDATE OF title, company_name ON public.job_listings
FOR EACH ROW EXECUTE FUNCTION public.generate_job_slug();

CREATE UNIQUE INDEX IF NOT EXISTS uniq_job_listings_slug ON public.job_listings(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_listings_premium ON public.job_listings(is_premium) WHERE is_premium = true;

-- Open up: any authenticated user can update own pending listing
DROP POLICY IF EXISTS "Business users can update own listings" ON public.job_listings;
CREATE POLICY "Submitters can update own pending listings"
ON public.job_listings FOR UPDATE
TO authenticated
USING (auth.uid() = submitted_by AND status IN ('pending','rejected'))
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Submitters can delete own pending listings"
ON public.job_listings FOR DELETE
TO authenticated
USING (auth.uid() = submitted_by AND status IN ('pending','rejected'));

-- Anyone can increment counters via dedicated RPC — keep counters not directly writable.
CREATE OR REPLACE FUNCTION public.increment_job_view(_job_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.job_listings SET view_count = view_count + 1 WHERE id = _job_id AND status = 'published';
$$;

CREATE OR REPLACE FUNCTION public.increment_job_apply_click(_job_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.job_listings SET apply_click_count = apply_click_count + 1 WHERE id = _job_id AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION public.increment_job_view(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_job_apply_click(uuid) TO anon, authenticated;

-- ============================================
-- EMPLOYER PROFILES (for premium employer branding)
-- ============================================
CREATE TABLE IF NOT EXISTS public.employer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  company_name text NOT NULL,
  orgnr text UNIQUE,
  tagline text,
  description_html text,
  logo_url text,
  cover_image_url text,
  website_url text,
  industry text,
  region_slug text REFERENCES public.editorial_regions(slug),
  is_published boolean NOT NULL DEFAULT false,
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employer_profiles_orgnr ON public.employer_profiles(orgnr);
CREATE INDEX IF NOT EXISTS idx_employer_profiles_published ON public.employer_profiles(is_published) WHERE is_published = true;

ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published employer profiles"
ON public.employer_profiles FOR SELECT
USING (is_published = true);

CREATE POLICY "Owners can view own employer profile"
ON public.employer_profiles FOR SELECT
TO authenticated
USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners can insert employer profile"
ON public.employer_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update own employer profile"
ON public.employer_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Staff can manage employer profiles"
ON public.employer_profiles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER update_employer_profiles_updated_at
BEFORE UPDATE ON public.employer_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link job listing to employer profile (optional)
ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS employer_profile_id uuid REFERENCES public.employer_profiles(id) ON DELETE SET NULL;

-- ============================================
-- INVOICE REQUESTS (Premium via faktura/EHF)
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_invoice_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_listing_id uuid NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  company_name text NOT NULL,
  orgnr text,
  invoice_email text NOT NULL,
  invoice_reference text,
  amount_nok integer NOT NULL DEFAULT 4990,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | paid | cancelled
  notes text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_invoice_requests_status ON public.job_invoice_requests(status);
CREATE INDEX IF NOT EXISTS idx_job_invoice_requests_job ON public.job_invoice_requests(job_listing_id);

ALTER TABLE public.job_invoice_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester can view own invoice request"
ON public.job_invoice_requests FOR SELECT
TO authenticated
USING (auth.uid() = requested_by);

CREATE POLICY "Requester can create invoice request"
ON public.job_invoice_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Staff can manage invoice requests"
ON public.job_invoice_requests FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER update_job_invoice_requests_updated_at
BEFORE UPDATE ON public.job_invoice_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
