
CREATE OR REPLACE FUNCTION public.get_public_dua(_id uuid)
RETURNS TABLE (id uuid, body text, is_anonymous boolean, ameen_count integer, created_at timestamptz, author_handle text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.body, d.is_anonymous, d.ameen_count, d.created_at,
    CASE WHEN d.is_anonymous THEN NULL ELSE p.handle END AS author_handle
  FROM public.dua_requests d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  WHERE d.id = _id
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_dua(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_dua(uuid) TO anon, authenticated;
