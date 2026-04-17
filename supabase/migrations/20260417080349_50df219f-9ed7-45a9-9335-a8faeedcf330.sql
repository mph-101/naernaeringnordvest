-- 1. Create editorial_regions table
CREATE TABLE public.editorial_regions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.editorial_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view regions"
  ON public.editorial_regions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage regions"
  ON public.editorial_regions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_editorial_regions_updated_at
  BEFORE UPDATE ON public.editorial_regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 7 regions
INSERT INTO public.editorial_regions (slug, name, description, sort_order) VALUES
  ('nasjonal',         'Nasjonal',           'Nasjonalt næringsstoff på tvers av regioner',  0),
  ('more-og-romsdal',  'Møre og Romsdal',    'Lokalt næringsliv i Møre og Romsdal',          1),
  ('vestlandet',       'Vestlandet',         'Lokalt næringsliv på Vestlandet',              2),
  ('nord-norge',       'Nord-Norge',         'Lokalt næringsliv i Nord-Norge',               3),
  ('trondelag',        'Trøndelag',          'Lokalt næringsliv i Trøndelag',                4),
  ('ostlandet',        'Østlandet',          'Lokalt næringsliv på Østlandet',               5),
  ('sorlandet',        'Sørlandet',          'Lokalt næringsliv på Sørlandet',               6);

-- 2. Add region columns to articles
ALTER TABLE public.articles
  ADD COLUMN region_slug text REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE,
  ADD COLUMN forked_from_article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL;

CREATE INDEX idx_articles_region_slug ON public.articles(region_slug);
CREATE INDEX idx_articles_forked_from ON public.articles(forked_from_article_id);

-- 3. Join table for explicit cross-region sharing
CREATE TABLE public.article_shared_regions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  region_slug text NOT NULL REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  shared_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (article_id, region_slug)
);

CREATE INDEX idx_article_shared_regions_article ON public.article_shared_regions(article_id);
CREATE INDEX idx_article_shared_regions_region ON public.article_shared_regions(region_slug);

ALTER TABLE public.article_shared_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared regions for published articles"
  ON public.article_shared_regions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_shared_regions.article_id AND a.published = true
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  );

CREATE POLICY "Staff can manage article shared regions"
  ON public.article_shared_regions FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  );

-- 4. Add primary editorial region to profiles
ALTER TABLE public.profiles
  ADD COLUMN editorial_region text REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE;

CREATE INDEX idx_profiles_editorial_region ON public.profiles(editorial_region);