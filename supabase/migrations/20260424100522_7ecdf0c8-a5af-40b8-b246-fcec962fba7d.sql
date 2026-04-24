-- Create authors table for managed author profiles
CREATE TABLE public.authors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT,
  bio TEXT,
  email TEXT,
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_authors_active ON public.authors (active);
CREATE INDEX idx_authors_name ON public.authors (lower(name));

ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

-- Anyone can view active authors (used for byline display + selection)
CREATE POLICY "Anyone can view active authors"
ON public.authors FOR SELECT
USING (active = true);

-- Staff can view all (incl. inactive)
CREATE POLICY "Staff can view all authors"
ON public.authors FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'journalist'::app_role)
);

-- Staff can create authors
CREATE POLICY "Staff can insert authors"
ON public.authors FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'journalist'::app_role)
);

-- Staff can update authors
CREATE POLICY "Staff can update authors"
ON public.authors FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
);

-- Only admins/editors can delete
CREATE POLICY "Staff can delete authors"
ON public.authors FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
);

-- Trigger to keep updated_at fresh
CREATE TRIGGER update_authors_updated_at
BEFORE UPDATE ON public.authors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for author byline portraits
INSERT INTO storage.buckets (id, name, public)
VALUES ('author-avatars', 'author-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for byline images
CREATE POLICY "Author avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'author-avatars');

-- Staff can upload author avatars
CREATE POLICY "Staff can upload author avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'author-avatars'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  )
);

-- Staff can update author avatars
CREATE POLICY "Staff can update author avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'author-avatars'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  )
);

-- Staff can delete author avatars
CREATE POLICY "Staff can delete author avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'author-avatars'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  )
);