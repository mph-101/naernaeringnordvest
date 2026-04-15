INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-uploads', 'audio-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audio-uploads');

CREATE POLICY "Authenticated users can read own audio"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audio-uploads');

CREATE POLICY "Authenticated users can delete own audio"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'audio-uploads');