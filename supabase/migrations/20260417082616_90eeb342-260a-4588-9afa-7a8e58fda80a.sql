-- ========== article_views ==========
CREATE TABLE public.article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id text NOT NULL,
  session_id text NOT NULL,
  user_id uuid,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  read_seconds integer NOT NULL DEFAULT 0,
  scroll_depth numeric(5,2) NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  referrer_host text,
  device_type text,
  region_slug text,
  country text
);

CREATE INDEX idx_article_views_article ON public.article_views(article_id);
CREATE INDEX idx_article_views_viewed_at ON public.article_views(viewed_at DESC);
CREATE INDEX idx_article_views_session ON public.article_views(session_id);
CREATE INDEX idx_article_views_user ON public.article_views(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.article_views ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous or authenticated) can log a view
CREATE POLICY "Anyone can log article views"
  ON public.article_views FOR INSERT
  WITH CHECK (true);

-- Allow updating one's own session row (to extend read time / scroll depth)
CREATE POLICY "Anyone can update own session view"
  ON public.article_views FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Admin & editor see all
CREATE POLICY "Admin and editor can view all article views"
  ON public.article_views FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  );

-- Journalists see only views for their own articles
CREATE POLICY "Journalists can view own article views"
  ON public.article_views FOR SELECT
  USING (
    has_role(auth.uid(), 'journalist'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id::text = article_views.article_id
        AND a.created_by = auth.uid()
    )
  );

-- ========== user_events ==========
CREATE TABLE public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  region_slug text,
  referrer_host text
);

CREATE INDEX idx_user_events_type_time ON public.user_events(event_type, occurred_at DESC);
CREATE INDEX idx_user_events_session ON public.user_events(session_id);
CREATE INDEX idx_user_events_user ON public.user_events(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log user events"
  ON public.user_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin and editor can view all user events"
  ON public.user_events FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  );

-- ========== Aggregation RPCs (security definer, role-aware) ==========

-- Top articles by views in a date range
CREATE OR REPLACE FUNCTION public.analytics_top_articles(
  _from timestamptz,
  _to timestamptz,
  _limit integer DEFAULT 20
)
RETURNS TABLE (
  article_id text,
  title text,
  region_slug text,
  views bigint,
  unique_sessions bigint,
  avg_read_seconds numeric,
  completion_rate numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  SELECT
    av.article_id,
    COALESCE(a.title, '(slettet)') AS title,
    a.region_slug,
    COUNT(*)::bigint AS views,
    COUNT(DISTINCT av.session_id)::bigint AS unique_sessions,
    ROUND(AVG(av.read_seconds)::numeric, 1) AS avg_read_seconds,
    ROUND((SUM(CASE WHEN av.completed THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 1) AS completion_rate
  FROM public.article_views av
  LEFT JOIN public.articles a ON a.id::text = av.article_id
  WHERE av.viewed_at >= _from
    AND av.viewed_at < _to
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'editor'::app_role)
      OR (has_role(auth.uid(), 'journalist'::app_role) AND a.created_by = auth.uid())
    )
  GROUP BY av.article_id, a.title, a.region_slug
  ORDER BY views DESC
  LIMIT _limit;
END;
$$;

-- Daily traffic series
CREATE OR REPLACE FUNCTION public.analytics_daily_traffic(
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  day date,
  views bigint,
  unique_sessions bigint,
  unique_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('day', av.viewed_at)::date AS day,
    COUNT(*)::bigint AS views,
    COUNT(DISTINCT av.session_id)::bigint AS unique_sessions,
    COUNT(DISTINCT av.user_id)::bigint AS unique_users
  FROM public.article_views av
  WHERE av.viewed_at >= _from AND av.viewed_at < _to
  GROUP BY 1
  ORDER BY 1;
END;
$$;

-- Referrer / device breakdown
CREATE OR REPLACE FUNCTION public.analytics_breakdown(
  _from timestamptz,
  _to timestamptz,
  _dimension text -- 'referrer_host' | 'device_type' | 'region_slug' | 'country'
)
RETURNS TABLE (
  bucket text,
  views bigint,
  unique_sessions bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  IF _dimension NOT IN ('referrer_host', 'device_type', 'region_slug', 'country') THEN
    RAISE EXCEPTION 'Invalid dimension';
  END IF;

  RETURN QUERY EXECUTE format($f$
    SELECT
      COALESCE(%I, '(ukjent)')::text AS bucket,
      COUNT(*)::bigint AS views,
      COUNT(DISTINCT session_id)::bigint AS unique_sessions
    FROM public.article_views
    WHERE viewed_at >= $1 AND viewed_at < $2
    GROUP BY 1
    ORDER BY views DESC
    LIMIT 25
  $f$, _dimension)
  USING _from, _to;
END;
$$;

-- Conversion funnel: signup → onboarding → first article → paywall view → subscription
CREATE OR REPLACE FUNCTION public.analytics_conversion_funnel(
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  step text,
  step_order integer,
  user_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  WITH steps(step, step_order) AS (
    VALUES
      ('signup', 1),
      ('onboarding_completed', 2),
      ('article_read', 3),
      ('paywall_viewed', 4),
      ('subscription_started', 5)
  )
  SELECT
    s.step,
    s.step_order,
    COALESCE(COUNT(DISTINCT ue.session_id), 0)::bigint AS user_count
  FROM steps s
  LEFT JOIN public.user_events ue
    ON ue.event_type = s.step
   AND ue.occurred_at >= _from
   AND ue.occurred_at < _to
  GROUP BY s.step, s.step_order
  ORDER BY s.step_order;
END;
$$;

-- Active users summary
CREATE OR REPLACE FUNCTION public.analytics_user_growth(
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  day date,
  new_signups bigint,
  daily_active_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(date_trunc('day', _from), date_trunc('day', _to - interval '1 day'), interval '1 day')::date AS d
  ),
  signups AS (
    SELECT date_trunc('day', occurred_at)::date AS d, COUNT(DISTINCT user_id)::bigint AS c
    FROM public.user_events
    WHERE event_type = 'signup' AND occurred_at >= _from AND occurred_at < _to
    GROUP BY 1
  ),
  active AS (
    SELECT date_trunc('day', viewed_at)::date AS d, COUNT(DISTINCT user_id)::bigint AS c
    FROM public.article_views
    WHERE user_id IS NOT NULL AND viewed_at >= _from AND viewed_at < _to
    GROUP BY 1
  )
  SELECT
    days.d AS day,
    COALESCE(signups.c, 0) AS new_signups,
    COALESCE(active.c, 0) AS daily_active_users
  FROM days
  LEFT JOIN signups ON signups.d = days.d
  LEFT JOIN active ON active.d = days.d
  ORDER BY days.d;
END;
$$;