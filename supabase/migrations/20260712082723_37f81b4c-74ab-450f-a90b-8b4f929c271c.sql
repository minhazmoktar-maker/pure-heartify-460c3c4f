
CREATE OR REPLACE FUNCTION public.refresh_leaderboards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.leaderboard_snapshots
    WHERE scope='global' AND metric='streak' AND period='all_time';
  INSERT INTO public.leaderboard_snapshots (scope, metric, period, user_id, display_name, score, rank)
  SELECT 'global','streak','all_time', s.user_id, p.display_name,
         GREATEST(COALESCE(s.longest_streak,0), COALESCE(s.current_streak,0)),
         ROW_NUMBER() OVER (ORDER BY GREATEST(COALESCE(s.longest_streak,0), COALESCE(s.current_streak,0)) DESC)
  FROM public.streaks s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE COALESCE(s.longest_streak, s.current_streak, 0) > 0
  ORDER BY 6 DESC
  LIMIT 100;

  DELETE FROM public.leaderboard_snapshots
    WHERE scope='global' AND metric='khatm_juz' AND period='weekly';
  INSERT INTO public.leaderboard_snapshots (scope, metric, period, user_id, display_name, score, rank)
  SELECT 'global','khatm_juz','weekly', c.user_id, p.display_name,
         COUNT(*)::int,
         ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC)
  FROM public.khatm_juz_claims c
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE c.completed_at >= date_trunc('week', now())
  GROUP BY c.user_id, p.display_name
  ORDER BY 6 DESC
  LIMIT 100;
END;
$$;

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
  SELECT COALESCE(SUM(GREATEST(COALESCE(watched_seconds,0),0)),0)/60
    INTO _minutes
  FROM public.watch_history
  WHERE user_id = _user_id
    AND created_at >= _week_start AND created_at < _week_end;

  SELECT COUNT(*) INTO _favs FROM public.favorites
  WHERE user_id = _user_id
    AND created_at >= _week_start AND created_at < _week_end;

  SELECT COALESCE(SUM(count),0) INTO _dhikr FROM public.dhikr_sessions
  WHERE user_id = _user_id
    AND updated_at >= _week_start AND updated_at < _week_end;

  SELECT COUNT(*) INTO _juz FROM public.khatm_juz_claims
  WHERE user_id = _user_id
    AND completed_at >= _week_start AND completed_at < _week_end;

  SELECT COALESCE(current_streak,0) INTO _streak FROM public.streaks
  WHERE user_id = _user_id;

  INSERT INTO public.weekly_recaps (user_id, week_start, minutes_watched, favorites_added, dhikr_count, juz_completed, streak_length)
  VALUES (_user_id, _week_start, _minutes, _favs, _dhikr, _juz, _streak)
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
