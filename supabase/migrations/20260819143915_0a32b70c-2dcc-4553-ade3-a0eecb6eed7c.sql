CREATE OR REPLACE FUNCTION public.nightly_reaudit_sweep()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  removed integer := 0;
  sample text[];
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH del AS (
    DELETE FROM public.curated_videos v
    USING public.blocked_creators b
    WHERE lower(coalesce(v.channel_title,'') || ' ' || coalesce(v.title,''))
          LIKE '%' || lower(b.pattern) || '%'
    RETURNING v.video_id, v.channel_title
  )
  SELECT count(*), array_agg(channel_title) FILTER (WHERE channel_title IS NOT NULL)
  INTO removed, sample
  FROM del;

  INSERT INTO public.moderation_overrides (admin_id, action, target, reason, metadata)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'nightly_sweep',
    'curated_videos',
    'automated nightly re-audit',
    jsonb_build_object('removed', removed, 'sample_channels', coalesce(sample[1:20], ARRAY[]::text[]))
  );

  RETURN jsonb_build_object('removed', removed);
END;
$function$;

REVOKE ALL ON FUNCTION public.nightly_reaudit_sweep() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nightly_reaudit_sweep() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.compute_weekly_recap(_user_id uuid, _week_start date)
RETURNS weekly_recaps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row public.weekly_recaps;
  _week_end DATE := _week_start + INTERVAL '7 days';
  _minutes INT := 0;
  _watch_seconds BIGINT := 0;
  _listen_seconds BIGINT := 0;
  _favs INT := 0;
  _dhikr INT := 0;
  _juz INT := 0;
  _streak INT := 0;
BEGIN
  PERFORM public.assert_self_or_admin(_user_id);

  SELECT COALESCE(SUM(GREATEST(COALESCE(progress_seconds,0),0)),0)
    INTO _watch_seconds
  FROM public.watch_history
  WHERE user_id = _user_id
    AND watched_at >= _week_start AND watched_at < _week_end;

  SELECT COALESCE(SUM(seconds),0)
    INTO _listen_seconds
  FROM public.audio_listen_daily
  WHERE user_id = _user_id
    AND day >= _week_start AND day < _week_end;

  _minutes := ((_watch_seconds + _listen_seconds) / 60)::INT;

  SELECT COUNT(*) INTO _favs FROM public.favorites
  WHERE user_id = _user_id
    AND created_at >= _week_start AND created_at < _week_end;

  SELECT COALESCE(SUM(count),0) INTO _dhikr FROM public.dhikr_sessions
  WHERE user_id = _user_id
    AND updated_at >= _week_start AND updated_at < _week_end;

  SELECT COUNT(*) INTO _juz FROM public.khatm_juz_claims
  WHERE user_id = _user_id
    AND completed_at >= _week_start AND completed_at < _week_end;

  SELECT COALESCE(current_streak, 0) INTO _streak FROM public.streaks
  WHERE user_id = _user_id
  LIMIT 1;
  _streak := COALESCE(_streak, 0);

  INSERT INTO public.weekly_recaps (
    user_id, week_start, minutes_watched, favorites_added,
    dhikr_count, juz_completed, streak_length
  )
  VALUES (
    _user_id, _week_start,
    COALESCE(_minutes,0), COALESCE(_favs,0),
    COALESCE(_dhikr,0), COALESCE(_juz,0), COALESCE(_streak,0)
  )
  ON CONFLICT (user_id, week_start) DO UPDATE
    SET minutes_watched = EXCLUDED.minutes_watched,
        favorites_added = EXCLUDED.favorites_added,
        dhikr_count = EXCLUDED.dhikr_count,
        juz_completed = EXCLUDED.juz_completed,
        streak_length = EXCLUDED.streak_length
  RETURNING * INTO _row;
  RETURN _row;
END;
$function$;

REVOKE ALL ON FUNCTION public.compute_weekly_recap(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_weekly_recap(uuid, date) TO authenticated, service_role;