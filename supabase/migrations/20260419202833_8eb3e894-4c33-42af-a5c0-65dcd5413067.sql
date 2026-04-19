-- Enable pgvector for semantic search over articles
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to articles (768 dims = Gemini text-embedding-004 / Google embedding default)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- Approximate nearest-neighbor index (cosine)
CREATE INDEX IF NOT EXISTS articles_embedding_idx
  ON public.articles
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- RPC: semantic match over PUBLISHED articles only
CREATE OR REPLACE FUNCTION public.match_articles(
  query_embedding vector(768),
  match_count int DEFAULT 6,
  min_similarity float DEFAULT 0.2
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
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.title,
    a.excerpt,
    a.body,
    a.category,
    a.author,
    a.published_at,
    a.region_slug,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM public.articles a
  WHERE a.published = true
    AND a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) >= min_similarity
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Allow anon + authenticated to call the matcher (it only returns published articles)
GRANT EXECUTE ON FUNCTION public.match_articles(vector, int, float) TO anon, authenticated;