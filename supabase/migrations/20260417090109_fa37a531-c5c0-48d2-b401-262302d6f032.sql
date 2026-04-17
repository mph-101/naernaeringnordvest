
DROP FUNCTION IF EXISTS public.admin_list_users(text, integer);

CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL::text, _limit integer DEFAULT 100)
 RETURNS TABLE(
   user_id uuid,
   email text,
   display_name text,
   created_at timestamp with time zone,
   roles app_role[],
   last_seen_at timestamp with time zone,
   articles_read bigint,
   api_key_count bigint,
   api_last_used_at timestamp with time zone
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  WITH api_stats AS (
    SELECT
      ak.user_id,
      COUNT(*)::bigint AS key_count,
      MAX(ak.last_used_at) AS last_used
    FROM public.api_keys ak
    WHERE ak.revoked_at IS NULL
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
    GROUP BY ak.user_id
  )
  SELECT
    u.id AS user_id,
    u.email::text,
    p.display_name,
    u.created_at,
    COALESCE(ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::app_role[]) AS roles,
    MAX(av.viewed_at) AS last_seen_at,
    COUNT(DISTINCT av.article_id)::bigint AS articles_read,
    COALESCE(MAX(aks.key_count), 0)::bigint AS api_key_count,
    MAX(aks.last_used) AS api_last_used_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.article_views av ON av.user_id = u.id
  LEFT JOIN api_stats aks ON aks.user_id = u.id
  WHERE
    _search IS NULL
    OR u.email ILIKE '%' || _search || '%'
    OR p.display_name ILIKE '%' || _search || '%'
  GROUP BY u.id, u.email, p.display_name, u.created_at
  ORDER BY u.created_at DESC
  LIMIT _limit;
END;
$function$;
