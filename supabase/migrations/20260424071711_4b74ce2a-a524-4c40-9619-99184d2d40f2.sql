-- Trusted sources system: admin-curated reference sources for the AI chatbot

-- 1. Source registry
CREATE TABLE public.trusted_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  source_type text NOT NULL CHECK (source_type IN ('url', 'rss', 'document', 'api')),
  url text,
  storage_path text,
  api_config jsonb DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  priority integer NOT NULL DEFAULT 50,
  active boolean NOT NULL DEFAULT true,
  index_strategy text NOT NULL DEFAULT 'periodic' CHECK (index_strategy IN ('periodic', 'live', 'hybrid')),
  refresh_interval_hours integer NOT NULL DEFAULT 24,
  last_indexed_at timestamptz,
  last_index_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_trusted_sources_active ON public.trusted_sources(active, priority DESC);
CREATE INDEX idx_trusted_sources_tags ON public.trusted_sources USING gin(tags);

-- 2. Indexed content chunks with full-text search
CREATE TABLE public.trusted_source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.trusted_sources(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL DEFAULT 0,
  title text,
  content text NOT NULL,
  source_url text,
  published_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('norwegian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('norwegian', coalesce(content, '')), 'B')
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tsd_source_id ON public.trusted_source_documents(source_id);
CREATE INDEX idx_tsd_search_tsv ON public.trusted_source_documents USING gin(search_tsv);
CREATE INDEX idx_tsd_published_at ON public.trusted_source_documents(published_at DESC NULLS LAST);

-- 3. RLS
ALTER TABLE public.trusted_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_source_documents ENABLE ROW LEVEL SECURITY;

-- Admins/editors can manage sources
CREATE POLICY "Staff can view trusted sources"
  ON public.trusted_sources FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Staff can insert trusted sources"
  ON public.trusted_sources FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Staff can update trusted sources"
  ON public.trusted_sources FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Staff can delete trusted sources"
  ON public.trusted_sources FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Documents: same admin/editor management. Read access is via SECURITY DEFINER search function (no anon SELECT needed).
CREATE POLICY "Staff can view trusted source documents"
  ON public.trusted_source_documents FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Staff can manage trusted source documents"
  ON public.trusted_source_documents FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- 4. Updated-at trigger
CREATE TRIGGER trg_trusted_sources_updated_at
  BEFORE UPDATE ON public.trusted_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Search function callable by chatbot (anon-safe via SECURITY DEFINER, only returns content from active sources)
CREATE OR REPLACE FUNCTION public.search_trusted_sources(query_text text, match_count integer DEFAULT 6)
RETURNS TABLE(
  document_id uuid,
  source_id uuid,
  source_name text,
  source_url text,
  source_type text,
  title text,
  content text,
  published_at timestamptz,
  priority integer,
  rank real
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ts_query tsquery;
  cleaned text;
BEGIN
  cleaned := regexp_replace(coalesce(query_text, ''), '[^\w\sæøåÆØÅ-]', ' ', 'g');
  cleaned := trim(regexp_replace(cleaned, '\s+', ' ', 'g'));
  IF cleaned = '' THEN RETURN; END IF;

  ts_query := to_tsquery(
    'norwegian',
    array_to_string(
      array(SELECT t || ':*' FROM unnest(string_to_array(cleaned, ' ')) AS t WHERE length(t) >= 2),
      ' | '
    )
  );
  IF ts_query IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    d.id AS document_id,
    s.id AS source_id,
    s.name AS source_name,
    COALESCE(d.source_url, s.url) AS source_url,
    s.source_type,
    d.title,
    d.content,
    d.published_at,
    s.priority,
    ts_rank(d.search_tsv, ts_query) AS rank
  FROM public.trusted_source_documents d
  JOIN public.trusted_sources s ON s.id = d.source_id
  WHERE s.active = true
    AND d.search_tsv @@ ts_query
  ORDER BY (ts_rank(d.search_tsv, ts_query) * (1.0 + s.priority / 100.0)) DESC,
           d.published_at DESC NULLS LAST
  LIMIT match_count;
END;
$$;

-- 6. Storage bucket for uploaded source documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trusted-sources', 'trusted-sources', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff can read trusted source files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'trusted-sources' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)));

CREATE POLICY "Staff can upload trusted source files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'trusted-sources' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)));

CREATE POLICY "Staff can delete trusted source files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'trusted-sources' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)));