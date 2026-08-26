DROP FUNCTION IF EXISTS public.claim_moderation_backlog(int);

CREATE OR REPLACE FUNCTION public.claim_moderation_backlog(p_limit int DEFAULT 40)
RETURNS TABLE (
  video_id text,
  title text,
  channel_id text,
  channel_title text,
  category text,
  content_language text,
  published_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 40), 1), 200);
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT cv.video_id
    FROM public.curated_videos cv
    WHERE cv.moderation_state = 'pending_review'
      AND cv.is_archived = false
      AND (cv.moderation_claimed_at IS NULL OR cv.moderation_claimed_at < now() - interval '30 minutes')
    ORDER BY cv.moderation_claimed_at NULLS FIRST, cv.ingested_at
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  ), stamped AS (
    UPDATE public.curated_videos cv
    SET moderation_claimed_at = now()
    WHERE cv.video_id IN (SELECT c.video_id FROM claimed c)
    RETURNING cv.video_id, cv.title, cv.channel_id, cv.channel_title,
              cv.category, cv.content_language, cv.published_at
  )
  SELECT s.video_id, s.title, s.channel_id, s.channel_title,
         s.category, s.content_language, s.published_at
  FROM stamped s;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_moderation_backlog(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_moderation_backlog(int) TO service_role;