CREATE OR REPLACE FUNCTION public.compute_weekly_recap(_user_id UUID, _week_start DATE)
RETURNS public.weekly_recaps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.weekly_recaps;
  _week_end DATE := _week_start + INTERVAL '7 days';
  _minutes INT := 0;
  _favs INT := 0;
  _dhikr INT := 0;
  _juz INT := 0;
  _streak INT := 0;
BEGIN
  SELECT COALESCE(SUM(GREATEST(COALESCE(progress_seconds,0),0)),0)/60
    INTO _minutes
  FROM public.watch_history
  WHERE user_id = _user_id
    AND watched_at >= _week_start AND watched_at < _week_end;

  SELECT COUNT(*) INTO _favs FROM public.favorites
  WHERE user_id = _user_id
    AND created_at >= _week_start AND created_at < _week_end;

  SELECT COALESCE(SUM(count),0) INTO _dhikr FROM public.dhikr_sessions
  WHERE user_id = _user_id
    AND updated_at >= _week_start AND updated_at < _week_end;

  SELECT COUNT(*) INTO _juz FROM public.khatm_juz_claims
  WHERE user_id = _user_id
    AND completed_at >= _week_start AND completed_at < _week_end;

  -- SELECT INTO sets target to NULL when no row is found, so wrap defensively.
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
$$;