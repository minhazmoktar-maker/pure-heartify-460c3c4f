
-- Track audio listening minutes per user per day so the weekly recap
-- reflects time spent in the Listen section (previously only watch_history counted).
CREATE TABLE IF NOT EXISTS public.audio_listen_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  seconds INT NOT NULL DEFAULT 0 CHECK (seconds >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

GRANT SELECT ON public.audio_listen_daily TO authenticated;
GRANT ALL ON public.audio_listen_daily TO service_role;

ALTER TABLE public.audio_listen_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own listen totals" ON public.audio_listen_daily;
CREATE POLICY "Users read their own listen totals"
ON public.audio_listen_daily FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_audio_listen_daily_user_day ON public.audio_listen_daily (user_id, day DESC);

-- Client-callable RPC: add N seconds of listening to today's bucket.
-- Rate-limited implicitly by upsert of (user, today); no direct table writes needed.
CREATE OR REPLACE FUNCTION public.record_listen_seconds(_seconds INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'UTC')::date;
  _new_total INT;
  _delta INT := GREATEST(0, LEAST(COALESCE(_seconds, 0), 600));
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _delta = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.audio_listen_daily (user_id, day, seconds)
  VALUES (_uid, _today, _delta)
  ON CONFLICT (user_id, day) DO UPDATE
    SET seconds = public.audio_listen_daily.seconds + EXCLUDED.seconds,
        updated_at = now()
  RETURNING seconds INTO _new_total;

  RETURN _new_total;
END;
$$;

REVOKE ALL ON FUNCTION public.record_listen_seconds(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_listen_seconds(INT) TO authenticated;

-- Fold audio listening minutes into the weekly recap alongside watch_history.
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
