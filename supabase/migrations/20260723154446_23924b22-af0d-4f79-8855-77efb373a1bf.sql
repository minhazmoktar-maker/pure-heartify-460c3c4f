
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
        OR lower(COALESCE(description,'')) ~* v_pattern
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_video_count FROM updated;

  WITH ch AS (
    UPDATE public.approved_channels
    SET status = 'removed'
    WHERE status <> 'removed'
      AND lower(COALESCE(channel_title,'')) ~* v_pattern
    RETURNING channel_id, channel_title
  ),
  ins AS (
    INSERT INTO public.blocked_creators (channel_id, channel_title, reason)
    SELECT channel_id, channel_title, 'auto-sweep: inappropriate content policy'
    FROM ch
    ON CONFLICT (channel_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_channel_count FROM ch;

  UPDATE public.curated_videos cv
  SET is_archived = true, is_hidden = true, moderation_state = 'rejected',
      moderation_reasoning = COALESCE(moderation_reasoning,'') || ' | auto-sweep: channel blocked'
  FROM public.blocked_creators bc
  WHERE cv.channel_id = bc.channel_id AND cv.is_archived = false;

  INSERT INTO public.ops_metrics (metric_name, metric_value, metadata)
  VALUES ('inappropriate_sweep', v_video_count,
          jsonb_build_object('videos_archived', v_video_count, 'channels_blocked', v_channel_count, 'ran_at', now()));

  RETURN jsonb_build_object('videos_archived', v_video_count, 'channels_blocked', v_channel_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sweep_inappropriate_content() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_inappropriate_content() TO service_role;
