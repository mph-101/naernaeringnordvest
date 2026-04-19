-- Sentralt mediearkiv
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  public_url text NOT NULL,
  bucket text NOT NULL DEFAULT 'article-images',
  mime_type text,
  width integer,
  height integer,
  file_size integer,
  -- Påkrevde redaksjonelle metadata
  alt_text text NOT NULL CHECK (length(trim(alt_text)) > 0),
  caption text NOT NULL CHECK (length(trim(caption)) > 0),
  photographer text NOT NULL CHECK (length(trim(photographer)) > 0),
  -- Valgfrie metadata
  source text,
  license text,
  tags text[] NOT NULL DEFAULT '{}',
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_assets_uploaded_by ON public.media_assets(uploaded_by);
CREATE INDEX idx_media_assets_tags ON public.media_assets USING GIN(tags);
CREATE INDEX idx_media_assets_created_at ON public.media_assets(created_at DESC);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media assets"
  ON public.media_assets FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert media"
  ON public.media_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'editor'::app_role)
      OR has_role(auth.uid(), 'journalist'::app_role))
  );

CREATE POLICY "Staff can update media"
  ON public.media_assets FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR (auth.uid() = uploaded_by AND has_role(auth.uid(), 'journalist'::app_role))
  );

CREATE POLICY "Staff can delete media"
  ON public.media_assets FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR (auth.uid() = uploaded_by AND has_role(auth.uid(), 'journalist'::app_role))
  );

CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Galleri per artikkel
CREATE TABLE public.article_gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id text NOT NULL,
  media_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, media_id)
);

CREATE INDEX idx_article_gallery_article ON public.article_gallery_items(article_id, sort_order);

ALTER TABLE public.article_gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view article galleries"
  ON public.article_gallery_items FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage article galleries"
  ON public.article_gallery_items FOR ALL
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