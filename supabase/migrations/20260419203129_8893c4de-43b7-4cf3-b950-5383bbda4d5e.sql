-- Switch from pgvector embeddings to Postgres full-text search (Lovable AI has no embedding endpoint)
DROP FUNCTION IF EXISTS public.match_articles(vector, int, float);
DROP INDEX IF EXISTS public.articles_embedding_idx;
ALTER TABLE public.articles
  DROP COLUMN IF EXISTS embedding,
  DROP COLUMN IF EXISTS embedding_updated_at;

-- Generated tsvector column combining title (weight A), excerpt (B), body (C)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('norwegian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('norwegian', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('norwegian', regexp_replace(coalesce(body, ''), '<[^>]+>', ' ', 'g')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS articles_search_tsv_idx
  ON public.articles USING gin (search_tsv);

-- RPC: rank-ordered text search over PUBLISHED articles only.
-- Accepts a free-text query, splits it into prefix-match tokens so partial
-- words (e.g. "Veøy" matching "Veøys") still hit, and returns the top N.
CREATE OR REPLACE FUNCTION public.search_articles(
  query_text text,
  match_count int DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  title text,
  excerpt text,
  body text,
  category text,
  author text,
  published_at timestamptz,
  region_slug text,
  rank real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts_query tsquery;
  cleaned text;
BEGIN
  cleaned := regexp_replace(coalesce(query_text, ''), '[^\w\sæøåÆØÅ-]', ' ', 'g');
  cleaned := trim(regexp_replace(cleaned, '\s+', ' ', 'g'));

  IF cleaned = '' THEN
    RETURN;
  END IF;

  -- Prefix match every token, OR-joined for recall
  ts_query := to_tsquery(
    'norwegian',
    array_to_string(
      array(
        SELECT t || ':*'
        FROM unnest(string_to_array(cleaned, ' ')) AS t
        WHERE length(t) >= 2
      ),
      ' | '
    )
  );

  IF ts_query IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.excerpt,
    a.body,
    a.category,
    a.author,
    a.published_at,
    a.region_slug,
    ts_rank(a.search_tsv, ts_query) AS rank
  FROM public.articles a
  WHERE a.published = true
    AND a.search_tsv @@ ts_query
  ORDER BY rank DESC, a.published_at DESC NULLS LAST
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_articles(text, int) TO anon, authenticated;