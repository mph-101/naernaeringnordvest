
DROP FUNCTION IF EXISTS public.admin_list_users(text, integer);

CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL::text, _limit integer DEFAULT 100)
 RETURNS TABLE(user_id uuid, email text, display_name text, created_at timestamp with time zone, roles app_role[], last_seen_at timestamp with time zone, articles_read bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text,
    p.display_name,
    u.created_at,
    COALESCE(ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::app_role[]) AS roles,
    MAX(av.viewed_at) AS last_seen_at,
    COUNT(DISTINCT av.article_id)::bigint AS articles_read
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.article_views av ON av.user_id = u.id
  WHERE
    _search IS NULL
    OR u.email ILIKE '%' || _search || '%'
    OR p.display_name ILIKE '%' || _search || '%'
  GROUP BY u.id, u.email, p.display_name, u.created_at
  ORDER BY u.created_at DESC
  LIMIT _limit;
END;
$function$;
