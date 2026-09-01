-- The directory listing referenced a non-existent channel status ('approved')
-- and counted videos from video_candidates (a sampling queue) instead of the
-- live serving table, so the public directory rendered empty.
CREATE OR REPLACE FUNCTION public.list_directory_channels(
  _q text DEFAULT NULL,
  _limit int DEFAULT 60,
  _offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT c.youtube_channel_id AS channel_id,
           c.title,
           c.handle,
           c.category,
           c.trust_tier::text AS trust_tier,
           c.consistency_score,
           (SELECT count(*) FROM public.curated_videos v
             WHERE v.channel_id = c.youtube_channel_id
               AND v.moderation_state IN ('approved', 'auto_approved')
               AND NOT v.is_hidden
               AND NOT v.is_archived) AS video_count,
           (SELECT v.thumbnail_url FROM public.curated_videos v
             WHERE v.channel_id = c.youtube_channel_id
               AND v.moderation_state IN ('approved', 'auto_approved')
               AND NOT v.is_hidden
               AND NOT v.is_archived
             ORDER BY v.published_at DESC NULLS LAST LIMIT 1) AS thumbnail_url
      FROM public.approved_channels c
     WHERE c.status = 'active'
       AND (_q IS NULL OR _q = ''
            OR c.title ILIKE '%' || _q || '%'
            OR coalesce(c.handle, '') ILIKE '%' || _q || '%')
     ORDER BY c.trust_tier, coalesce(c.consistency_score, 0) DESC, c.title
     LIMIT greatest(1, least(coalesce(_limit, 60), 100))
    OFFSET greatest(0, coalesce(_offset, 0))
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(base) ORDER BY trust_tier, video_count DESC), '[]'::jsonb) FROM base;
$$;

REVOKE ALL ON FUNCTION public.list_directory_channels(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_directory_channels(text, int, int) TO anon, authenticated, service_role;
