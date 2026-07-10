
CREATE OR REPLACE FUNCTION public.get_public_dhikr_circle(_circle_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  phrase TEXT,
  target_count INTEGER,
  current_count BIGINT,
  is_active BOOLEAN,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  member_count INTEGER,
  top_contributors JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.phrase,
    c.target_count,
    c.current_count,
    c.is_active,
    c.ends_at,
    c.created_at,
    (SELECT COUNT(*)::int FROM public.dhikr_circle_members m WHERE m.circle_id = c.id) AS member_count,
    COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          COALESCE(p.handle, p.display_name, 'Anonymous') AS name,
          p.handle,
          m.contribution
        FROM public.dhikr_circle_members m
        LEFT JOIN public.profiles p ON p.id = m.user_id
        WHERE m.circle_id = c.id
        ORDER BY m.contribution DESC
        LIMIT 5
      ) t
    ), '[]'::jsonb) AS top_contributors
  FROM public.dhikr_circles c
  WHERE c.id = _circle_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_dhikr_circle(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_dhikr_circle(UUID) TO anon, authenticated;
