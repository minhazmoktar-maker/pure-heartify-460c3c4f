-- Cheap (1-unit) discovery lanes — playlist_collab and description_mention —
-- previously crawled approved channels in last_rechecked_at order, which is
-- language-blind. With ~766 English channels vs 22 Bengali / 16 Urdu / 8 Hindi /
-- 3 Malay, English seeds monopolised the only lanes that still work while the
-- YouTube Search quota is exhausted. This orders seeds so launch-market channels
-- are crawled first, then everything else by staleness.
CREATE OR REPLACE FUNCTION public.next_discovery_seeds(p_limit integer DEFAULT 40)
RETURNS TABLE(youtube_channel_id text, language text, is_launch boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH chan_lang AS (
    SELECT v.channel_id,
           (array_agg(v.content_language ORDER BY cnt DESC))[1] AS language
    FROM (
      SELECT channel_id, content_language, count(*) AS cnt
      FROM public.curated_videos
      WHERE channel_id IS NOT NULL AND content_language IS NOT NULL
      GROUP BY 1, 2
    ) v
    GROUP BY v.channel_id
  ),
  seeds AS (
    SELECT a.youtube_channel_id,
           COALESCE(cl.language, 'unknown') AS language,
           (COALESCE(cl.language, '') IN ('bn', 'ur', 'hi', 'ms')) AS is_launch,
           a.last_rechecked_at
    FROM public.approved_channels a
    LEFT JOIN chan_lang cl ON cl.channel_id = a.youtube_channel_id
    WHERE a.status = 'active'
  )
  SELECT youtube_channel_id, language, is_launch
  FROM seeds
  ORDER BY is_launch DESC, last_rechecked_at ASC NULLS FIRST, youtube_channel_id
  LIMIT GREATEST(1, LEAST(p_limit, 500));
$$;

REVOKE ALL ON FUNCTION public.next_discovery_seeds(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_discovery_seeds(integer) FROM anon;
REVOKE ALL ON FUNCTION public.next_discovery_seeds(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.next_discovery_seeds(integer) TO service_role;