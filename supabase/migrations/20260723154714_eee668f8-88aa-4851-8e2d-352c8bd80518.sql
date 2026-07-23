
CREATE OR REPLACE FUNCTION public.sweep_inappropriate_content()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern text := public._inappropriate_pattern();
  v_video_count int := 0;
  v_channel_count int := 0;
BEGIN
  WITH updated AS (
    UPDATE public.curated_videos
    SET is_archived = true,
        is_hidden = true,
        moderation_state = 'rejected',
        moderation_reasoning = COALESCE(moderation_reasoning,'') || ' | auto-sweep: inappropriate content policy'
    WHERE is_archived = false
      AND (
        lower(COALESCE(title,'')) ~* v_pattern
        OR lower(COALESCE(channel_title,'')) ~* v_pattern
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_video_count FROM updated;

  WITH ch AS (
    UPDATE public.approved_channels
    SET status = 'removed'
    WHERE status <> 'removed'
      AND lower(COALESCE(title,'')) ~* v_pattern
    RETURNING youtube_channel_id, title
  ),
  ins AS (
    INSERT INTO public.blocked_creators (pattern, reason)
    SELECT lower(title), 'auto-sweep: inappropriate content policy'
    FROM ch
    ON CONFLICT (pattern) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_channel_count FROM ch;

  -- Archive videos from newly-blocked creators (pattern-based)
  UPDATE public.curated_videos cv
  SET is_archived = true, is_hidden = true, moderation_state = 'rejected',
      moderation_reasoning = COALESCE(moderation_reasoning,'') || ' | auto-sweep: channel blocked'
  WHERE cv.is_archived = false
    AND EXISTS (
      SELECT 1 FROM public.blocked_creators bc
      WHERE lower(COALESCE(cv.channel_title,'') || ' ' || COALESCE(cv.title,'')) LIKE '%' || lower(bc.pattern) || '%'
    );

  INSERT INTO public.ops_metrics (metric_name, metric_value, metadata)
  VALUES ('inappropriate_sweep', v_video_count,
          jsonb_build_object('videos_archived', v_video_count, 'channels_blocked', v_channel_count, 'ran_at', now()));

  RETURN jsonb_build_object('videos_archived', v_video_count, 'channels_blocked', v_channel_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sweep_inappropriate_content() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_inappropriate_content() TO service_role;
