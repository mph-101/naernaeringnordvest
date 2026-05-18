
-- Voice profile per forfatter
ALTER TABLE public.authors
  ADD COLUMN IF NOT EXISTS elevenlabs_voice_id text,
  ADD COLUMN IF NOT EXISTS voice_cloned_at timestamptz,
  ADD COLUMN IF NOT EXISTS voice_sample_path text;

-- Profil-toggle for lyd-modus
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS audio_mode_enabled boolean NOT NULL DEFAULT true;

-- Cache for generert lyd
CREATE TABLE IF NOT EXISTS public.article_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('summary', 'full')),
  voice_id text NOT NULL,
  storage_path text NOT NULL,
  duration_seconds integer,
  region_slug text,
  summary_text text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT article_audio_unique UNIQUE (article_id, mode, voice_id)
);

CREATE INDEX IF NOT EXISTS idx_article_audio_article ON public.article_audio (article_id);
CREATE INDEX IF NOT EXISTS idx_article_audio_generated ON public.article_audio (generated_at DESC);

ALTER TABLE public.article_audio ENABLE ROW LEVEL SECURITY;

-- Lese-policy: alle autentiserte kan se metadata (signed URL hentes via edge function)
CREATE POLICY "Anyone authenticated can read audio metadata"
  ON public.article_audio FOR SELECT
  TO authenticated
  USING (true);

-- Skrive-policy: kun staff (service role bypasser RLS uansett)
CREATE POLICY "Staff can manage audio cache"
  ON public.article_audio FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Privat storage-bucket for lydfiler
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-audio', 'article-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: kun service role kan skrive (default), autentiserte kan lese via signed URL
CREATE POLICY "Authenticated can read article audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'article-audio');
