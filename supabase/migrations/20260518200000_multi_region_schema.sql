-- Multi-region schema changes (task 2.2)
-- Extends editorial_regions, renames regions, adds region_slug to missing tables,
-- creates region_hidden_articles for muting national content.

BEGIN;

-- ============================================================
-- 1. Extend editorial_regions with new columns
-- ============================================================

ALTER TABLE public.editorial_regions
  ADD COLUMN IF NOT EXISTS subdomain text UNIQUE,
  ADD COLUMN IF NOT EXISTS publisher_name text,
  ADD COLUMN IF NOT EXISTS publisher_orgnr text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Fix missing ON UPDATE CASCADE on hjernevelv FKs
--    (these only had ON DELETE SET NULL)
-- ============================================================

ALTER TABLE public.hjernevelv_writers
  DROP CONSTRAINT IF EXISTS hjernevelv_writers_region_slug_fkey,
  ADD CONSTRAINT hjernevelv_writers_region_slug_fkey
    FOREIGN KEY (region_slug) REFERENCES public.editorial_regions(slug)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.hjernevelv_articles
  DROP CONSTRAINT IF EXISTS hjernevelv_articles_region_slug_fkey,
  ADD CONSTRAINT hjernevelv_articles_region_slug_fkey
    FOREIGN KEY (region_slug) REFERENCES public.editorial_regions(slug)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.hjernevelv_panels
  DROP CONSTRAINT IF EXISTS hjernevelv_panels_region_slug_fkey,
  ADD CONSTRAINT hjernevelv_panels_region_slug_fkey
    FOREIGN KEY (region_slug) REFERENCES public.editorial_regions(slug)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- Also fix newsletter_issues and newsletter_subscriptions if missing CASCADE
ALTER TABLE public.newsletter_issues
  DROP CONSTRAINT IF EXISTS newsletter_issues_region_slug_fkey,
  ADD CONSTRAINT newsletter_issues_region_slug_fkey
    FOREIGN KEY (region_slug) REFERENCES public.editorial_regions(slug)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- ============================================================
-- 3. Rename regions (ON UPDATE CASCADE propagates to all FKs)
-- ============================================================

UPDATE public.editorial_regions SET
  slug = 'nordvestlandet', name = 'Nordvestlandet',
  description = 'Lokalt næringsliv på Nordvestlandet',
  subdomain = 'nordvest', is_active = true
WHERE slug = 'more-og-romsdal';

UPDATE public.editorial_regions SET
  slug = 'midt-norge', name = 'Midt-Norge',
  description = 'Lokalt næringsliv i Midt-Norge'
WHERE slug = 'trondelag';

-- Update remaining regions with subdomain and descriptions
UPDATE public.editorial_regions SET
  subdomain = NULL, is_active = true,
  description = 'Nasjonalt næringsstoff på tvers av regioner'
WHERE slug = 'nasjonal';

UPDATE public.editorial_regions SET
  subdomain = 'vestlandet',
  description = 'Lokalt næringsliv på Vestlandet'
WHERE slug = 'vestlandet';

UPDATE public.editorial_regions SET
  subdomain = 'nord-norge',
  description = 'Lokalt næringsliv i Nord-Norge'
WHERE slug = 'nord-norge';

UPDATE public.editorial_regions SET
  subdomain = 'ostlandet',
  description = 'Lokalt næringsliv på Østlandet'
WHERE slug = 'ostlandet';

UPDATE public.editorial_regions SET
  subdomain = 'sorlandet',
  description = 'Lokalt næringsliv på Sørlandet'
WHERE slug = 'sorlandet';

-- ============================================================
-- 4. Add region_slug to tables that are missing it
-- ============================================================

-- Subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS region_slug text
    REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE;

UPDATE public.subscriptions
  SET region_slug = 'nordvestlandet'
  WHERE region_slug IS NULL;

-- Business accounts
ALTER TABLE public.business_accounts
  ADD COLUMN IF NOT EXISTS region_slug text
    REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE;

UPDATE public.business_accounts
  SET region_slug = 'nordvestlandet'
  WHERE region_slug IS NULL;

-- Groups
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS region_slug text
    REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE;

UPDATE public.groups
  SET region_slug = 'nordvestlandet'
  WHERE region_slug IS NULL;

-- Polls
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS region_slug text
    REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE;

UPDATE public.polls
  SET region_slug = 'nordvestlandet'
  WHERE region_slug IS NULL;

-- Native ads
ALTER TABLE public.native_ads
  ADD COLUMN IF NOT EXISTS region_slug text
    REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE;

UPDATE public.native_ads
  SET region_slug = 'nordvestlandet'
  WHERE region_slug IS NULL;

-- Job changes
ALTER TABLE public.job_changes
  ADD COLUMN IF NOT EXISTS region_slug text
    REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE;

UPDATE public.job_changes
  SET region_slug = 'nordvestlandet'
  WHERE region_slug IS NULL;

-- Tips
ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS region_slug text
    REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE;

UPDATE public.tips
  SET region_slug = 'nordvestlandet'
  WHERE region_slug IS NULL;

-- ============================================================
-- 5. Create region_hidden_articles table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.region_hidden_articles (
  region_slug text NOT NULL REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  hidden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (region_slug, article_id)
);

ALTER TABLE public.region_hidden_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view hidden articles"
  ON public.region_hidden_articles FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  );

CREATE POLICY "Staff can manage hidden articles"
  ON public.region_hidden_articles FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  );

-- ============================================================
-- 6. Indexes for new columns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_region ON public.subscriptions(region_slug);
CREATE INDEX IF NOT EXISTS idx_business_accounts_region ON public.business_accounts(region_slug);
CREATE INDEX IF NOT EXISTS idx_groups_region ON public.groups(region_slug);
CREATE INDEX IF NOT EXISTS idx_polls_region ON public.polls(region_slug);
CREATE INDEX IF NOT EXISTS idx_native_ads_region ON public.native_ads(region_slug);
CREATE INDEX IF NOT EXISTS idx_job_changes_region ON public.job_changes(region_slug);
CREATE INDEX IF NOT EXISTS idx_tips_region ON public.tips(region_slug);
CREATE INDEX IF NOT EXISTS idx_region_hidden_articles_article ON public.region_hidden_articles(article_id);

COMMIT;
