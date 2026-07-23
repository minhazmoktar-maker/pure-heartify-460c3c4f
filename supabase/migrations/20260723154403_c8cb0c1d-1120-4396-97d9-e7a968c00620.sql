
-- Unified inappropriate-content pattern (extends existing trigger with news/entertainment terms)
CREATE OR REPLACE FUNCTION public._inappropriate_pattern()
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT '(^|[^a-z])(female|females|woman|women|girl|girls|actress|actresses|singer|singers|song|songs|music|musical|musician|musicians|band|bands|concert|concerts|nasheed|nasheeds|anasheed|sister|sisters|ustadha|shaykha|dance|dancer|dancing|kpop|k-pop|kdrama|k-drama|anime|manga|movie|movies|film|films|netflix|hollywood|bollywood|celebrity|celebrities|gossip|dating|romance|romantic|kiss|kissing|nude|nudity|sexy|sex|sexual|porn|pornstar|onlyfans|entertainment|breaking news|bbc news|al jazeera|ary news|geo news|cnn|fox news|reuters|ap news|showbiz|red carpet|fashion show|beauty pageant|miss world|miss universe|makeup tutorial|hijab tutorial|hijab style|modeling|model runway)($|[^a-z])'::text
$$;

-- Sweep function: archives existing bad videos, removes bad channels, logs metric
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
  v_prev_role text;
BEGIN
  -- Bypass triggers safely to allow bulk archival
  v_prev_role := current_setting('session_replication_role', true);
  PERFORM set_config('session_replication_role', 'replica', true);

  -- Archive matching curated_videos
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

  -- Flag channels whose titles match, mark removed
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

  -- Also archive all videos from newly-blocked channels
  UPDATE public.curated_videos cv
  SET is_archived = true, is_hidden = true, moderation_state = 'rejected',
      moderation_reasoning = COALESCE(moderation_reasoning,'') || ' | auto-sweep: channel blocked'
  FROM public.blocked_creators bc
  WHERE cv.channel_id = bc.channel_id AND cv.is_archived = false;

  -- Restore role
  PERFORM set_config('session_replication_role', COALESCE(v_prev_role,'origin'), true);

  INSERT INTO public.ops_metrics (metric_name, metric_value, metadata)
  VALUES ('inappropriate_sweep', v_video_count,
          jsonb_build_object('videos_archived', v_video_count, 'channels_blocked', v_channel_count, 'ran_at', now()));

  RETURN jsonb_build_object('videos_archived', v_video_count, 'channels_blocked', v_channel_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sweep_inappropriate_content() TO service_role;

-- Ensure pg_cron + pg_net available
CREATE EXTENSION IF NOT EXISTS pg_cron;
