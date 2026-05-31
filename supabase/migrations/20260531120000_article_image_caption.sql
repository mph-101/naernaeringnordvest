-- Add per-article hero image caption / credit / source.
--
-- These are seeded from media_assets (caption / photographer / source) when an
-- image is uploaded or picked in the editor, but can be edited per article
-- without writing back to the shared media_assets archive. Existing articles
-- get NULL and fall back to a media_assets lookup by public_url at render time.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS image_caption text,
  ADD COLUMN IF NOT EXISTS image_credit  text,
  ADD COLUMN IF NOT EXISTS image_source  text;
