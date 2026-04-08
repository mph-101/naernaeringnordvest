
ALTER TABLE public.job_changes
ADD COLUMN image_url text DEFAULT NULL,
ADD COLUMN photo_credit text DEFAULT NULL;

-- Storage bucket for job change images
INSERT INTO storage.buckets (id, name, public) VALUES ('job-images', 'job-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone authenticated can upload
CREATE POLICY "Authenticated users can upload job images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-images');

-- Public read
CREATE POLICY "Public can view job images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'job-images');

-- Uploaders can delete own images
CREATE POLICY "Users can delete own job images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'job-images' AND (storage.foldername(name))[1] = auth.uid()::text);
