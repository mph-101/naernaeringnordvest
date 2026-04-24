
-- Variants table: alternative title + image for an article (variant B etc.)
CREATE TABLE public.article_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  variant_key text NOT NULL,
  title text,
  image_url text,
  image_crop jsonb,
  image_focal jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (article_id, variant_key)
);

CREATE INDEX article_variants_article_idx ON public.article_variants(article_id);

ALTER TABLE public.article_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view variants for published articles"
  ON public.article_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_variants.article_id AND a.published = true
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  );

CREATE POLICY "Staff can manage article variants"
  ON public.article_variants FOR ALL
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

-- Event log for impressions + completions per variant
CREATE TABLE public.article_variant_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL,
  variant_key text NOT NULL,
  event_type text NOT NULL, -- 'impression' | 'completed'
  session_id text NOT NULL,
  user_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX article_variant_events_article_idx
  ON public.article_variant_events(article_id, variant_key, event_type);

ALTER TABLE public.article_variant_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log variant events"
  ON public.article_variant_events FOR INSERT
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) BETWEEN 8 AND 128
    AND event_type IN ('impression', 'completed')
  );

CREATE POLICY "Staff can view variant events"
  ON public.article_variant_events FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  );

-- Aggregated stats helper
CREATE OR REPLACE FUNCTION public.article_variant_stats(_article_id uuid)
RETURNS TABLE (
  variant_key text,
  impressions bigint,
  unique_sessions bigint,
  completions bigint,
  completion_rate numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  SELECT
    e.variant_key,
    COUNT(*) FILTER (WHERE e.event_type = 'impression')::bigint AS impressions,
    COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_type = 'impression')::bigint AS unique_sessions,
    COUNT(*) FILTER (WHERE e.event_type = 'completed')::bigint AS completions,
    ROUND(
      (COUNT(*) FILTER (WHERE e.event_type = 'completed')::numeric
        / NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'impression'), 0)) * 100,
      1
    ) AS completion_rate
  FROM public.article_variant_events e
  WHERE e.article_id = _article_id
  GROUP BY e.variant_key
  ORDER BY e.variant_key;
END;
$$;
