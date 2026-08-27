-- 1. Music-policy items can never pass a visual sweep and are already hidden;
--    record the verdict so the "unchecked" queue is honest.
CREATE OR REPLACE FUNCTION public.resolve_music_category_unchecked(p_limit integer DEFAULT 5000)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  WITH picked AS (
    SELECT video_id FROM public.curated_videos
    WHERE is_archived = false
      AND moderation_state IN ('approved','auto_approved')
      AND (visual_state IS NULL OR visual_state = 'unchecked')
      AND lower(coalesce(category,'')) IN ('nasheeds','nasheed','music','songs')
    LIMIT GREATEST(LEAST(p_limit, 20000), 1)
  )
  UPDATE public.curated_videos cv
  SET visual_state = 'flagged',
      visual_checked_at = now(),
      visual_confidence = 100,
      visual_flags = ARRAY['music_policy'],
      is_hidden = true,
      hidden_reason = 'music_policy'
  WHERE cv.video_id IN (SELECT video_id FROM picked);
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN jsonb_build_object('resolved', _n);
END; $$;

REVOKE EXECUTE ON FUNCTION public.resolve_music_category_unchecked(integer) FROM anon, authenticated;

SELECT public.resolve_music_category_unchecked(20000);

-- 2. Let the sweep claim items hidden only because their checks are pending.
CREATE OR REPLACE FUNCTION public.claim_visual_scan_batch(p_limit integer DEFAULT 40)
RETURNS TABLE(video_id text, title text, channel_title text, thumbnail_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT cv.video_id
    FROM public.curated_videos cv
    WHERE cv.is_archived = false
      AND (cv.is_hidden = false
           OR cv.hidden_reason IS NULL
           OR cv.hidden_reason = 'awaiting_visual_check'
           OR cv.hidden_reason LIKE 'halal_gate:%')
      AND cv.moderation_state IN ('approved','auto_approved')
      AND cv.thumbnail_url IS NOT NULL
      AND lower(coalesce(cv.category,'')) NOT IN ('nasheeds','nasheed','music','songs')
      AND (cv.visual_state IS NULL OR cv.visual_state = 'unchecked')
      AND (cv.visual_checked_at IS NULL OR cv.visual_checked_at < now() - interval '1 hour')
    ORDER BY cv.view_count DESC NULLS LAST, cv.published_at DESC NULLS LAST
    LIMIT GREATEST(1, LEAST(p_limit, 300))
    FOR UPDATE SKIP LOCKED
  ), stamped AS (
    UPDATE public.curated_videos cv
    SET visual_checked_at = now()
    WHERE cv.video_id IN (SELECT p.video_id FROM picked p)
    RETURNING cv.video_id, cv.title, cv.channel_title, cv.thumbnail_url
  )
  SELECT s.video_id, s.title, s.channel_title, s.thumbnail_url FROM stamped s;
END; $$;

-- 3. Keep it closed out for newly ingested music-category videos.
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'resolve-music-unchecked-hourly';
SELECT cron.schedule('resolve-music-unchecked-hourly', '50 * * * *',
  $$SELECT public.resolve_music_category_unchecked(5000);$$);