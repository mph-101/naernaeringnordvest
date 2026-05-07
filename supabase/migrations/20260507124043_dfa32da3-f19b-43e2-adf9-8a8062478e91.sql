
-- 1. job-logos: path-based ownership for update & delete
DROP POLICY IF EXISTS "Users can update own job logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own job logos" ON storage.objects;

CREATE POLICY "Users can update own job logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'job-logos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  )
);

CREATE POLICY "Users can delete own job logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job-logos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  )
);

-- Also scope upload INSERTs to user-owned folder
DROP POLICY IF EXISTS "Authenticated users can upload job logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload job logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job-logos'
  AND auth.uid() IS NOT NULL
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  )
);

-- 2. audio-uploads: ownership for read & delete
DROP POLICY IF EXISTS "Authenticated users can read own audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own audio" ON storage.objects;

CREATE POLICY "Authenticated users can read own audio"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'audio-uploads'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  )
);

CREATE POLICY "Authenticated users can delete own audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio-uploads'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Also scope upload to user-owned folder
DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio-uploads'
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3. article_views: restrict updates to owning authenticated user
DROP POLICY IF EXISTS "Sessions can update recent own view" ON public.article_views;
CREATE POLICY "Users can update own recent view"
ON public.article_views FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND viewed_at > (now() - interval '2 hours')
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND viewed_at > (now() - interval '2 hours')
);

-- 4. article_comments realtime: remove from publication (avoid leaking moderated comments)
ALTER PUBLICATION supabase_realtime DROP TABLE public.article_comments;

-- 5. job_listings: hide contact_* columns from anonymous visitors
REVOKE SELECT (contact_email, contact_phone, contact_name) ON public.job_listings FROM anon;
