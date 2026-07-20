
CREATE OR REPLACE FUNCTION public.get_trust_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'approved_channels', (SELECT COUNT(*) FROM public.approved_channels),
    'reviewed_videos',   (SELECT COUNT(*) FROM public.curated_videos),
    'removed_videos',    (SELECT COUNT(*) FROM public.removed_videos),
    'languages_covered', (
      SELECT COUNT(DISTINCT lower(content_language))
      FROM public.curated_videos
      WHERE content_language IS NOT NULL AND content_language <> ''
    ),
    'generated_at',      to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )
$$;

REVOKE ALL ON FUNCTION public.get_trust_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trust_stats() TO anon, authenticated;
