
-- 1. Drop overly broad public-listing SELECT policy on author-avatars bucket.
-- The bucket remains publicly readable via direct object URLs (bucket.public = true),
-- but anonymous clients can no longer list the contents of the bucket.
DROP POLICY IF EXISTS "Author avatars are publicly accessible" ON storage.objects;

-- 2. Lock down SECURITY DEFINER helper / trigger functions so they cannot be
-- invoked directly via PostgREST by anon or authenticated clients.
-- Trigger functions (only invoked by Postgres internally):
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_business_seat() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fact_boxes_refresh_search() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_job_slug() FROM PUBLIC, anon, authenticated;

-- Edge-function only (called with service role):
REVOKE EXECUTE ON FUNCTION public.validate_api_key(text) FROM PUBLIC, anon, authenticated;

-- Revoke anon execute on admin/authenticated-only RPCs (functions self-check role,
-- but anon has no business calling them at all).
REVOKE EXECUTE ON FUNCTION public.admin_grant_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_api_key(text, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_api_key(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.merge_tags(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.analytics_breakdown(timestamptz, timestamptz, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.analytics_conversion_funnel(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.analytics_daily_traffic(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.analytics_top_articles(timestamptz, timestamptz, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.analytics_user_growth(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.article_variant_stats(uuid) FROM PUBLIC, anon;
