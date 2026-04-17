ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS image_crop jsonb,
  ADD COLUMN IF NOT EXISTS image_focal jsonb;

COMMENT ON COLUMN public.articles.image_crop IS 'Rectangular crop in percent: { x, y, width, height } where each value is 0-100. Null = use full image.';
COMMENT ON COLUMN public.articles.image_focal IS 'Focal point in percent: { x, y } where each value is 0-100. Null = center (50,50).';