-- Add scheduled publishing support to articles.
-- When scheduled_publish_at is set and the time has passed, a pg_cron job
-- will auto-publish the article (set published_at, published, status).

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_articles_scheduled_publish
  ON public.articles(scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL AND published_at IS NULL;

-- pg_cron job: every 5 minutes, publish articles whose scheduled time has passed.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('auto-publish-scheduled-articles');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-publish-scheduled-articles',
  '*/5 * * * *',
  $cron$
    UPDATE public.articles
       SET published_at = now(),
           published = true,
           status = 'published',
           scheduled_publish_at = NULL
     WHERE scheduled_publish_at IS NOT NULL
       AND scheduled_publish_at <= now()
       AND published_at IS NULL;
  $cron$
);
