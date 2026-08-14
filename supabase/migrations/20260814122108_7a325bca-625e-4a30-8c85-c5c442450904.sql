-- 1. Resolve a user's IANA timezone (profile first, then notification prefs, else UTC)
CREATE OR REPLACE FUNCTION public.user_timezone(_uid uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _tz text;
BEGIN
  SELECT nullif(btrim(p.timezone), '') INTO _tz FROM public.profiles p WHERE p.user_id = _uid;
  IF _tz IS NULL THEN
    SELECT nullif(btrim(np.timezone), '') INTO _tz
      FROM public.notification_preferences np
      WHERE np.user_id = _uid AND np.timezone IS NOT NULL
      LIMIT 1;
  END IF;
  IF _tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _tz) THEN
    RETURN 'UTC';
  END IF;
  RETURN _tz;
END $$;

-- 2. The user's local calendar date (streak day boundary)
CREATE OR REPLACE FUNCTION public.user_local_date(_uid uuid, _at timestamptz DEFAULT now())
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _tz text; _d date;
BEGIN
  _tz := public.user_timezone(_uid);
  BEGIN
    _d := (_at AT TIME ZONE _tz)::date;
  EXCEPTION WHEN others THEN
    _d := (_at AT TIME ZONE 'UTC')::date;
  END;
  RETURN _d;
END $$;

-- 3. The user's local hour 0-23 (push windows)
CREATE OR REPLACE FUNCTION public.user_local_hour(_uid uuid, _at timestamptz DEFAULT now())
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _tz text; _h int;
BEGIN
  _tz := public.user_timezone(_uid);
  BEGIN
    _h := extract(hour FROM (_at AT TIME ZONE _tz))::int;
  EXCEPTION WHEN others THEN
    _h := extract(hour FROM (_at AT TIME ZONE 'UTC'))::int;
  END;
  RETURN _h;
END $$;

REVOKE ALL ON FUNCTION public.user_timezone(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_local_date(uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_local_hour(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_timezone(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_local_date(uuid, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_local_hour(uuid, timestamptz) TO authenticated, service_role;

-- 4. Let the signed-in client persist its detected timezone
CREATE OR REPLACE FUNCTION public.set_my_timezone(_tz text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _tz) THEN
    RAISE EXCEPTION 'invalid_timezone';
  END IF;
  UPDATE public.profiles SET timezone = _tz, updated_at = now() WHERE user_id = _uid;
  UPDATE public.notification_preferences SET timezone = _tz, updated_at = now() WHERE user_id = _uid;
  RETURN _tz;
END $$;

REVOKE ALL ON FUNCTION public.set_my_timezone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_timezone(text) TO authenticated;

-- 5. Streak day boundary now follows the user's timezone, not UTC
CREATE OR REPLACE FUNCTION public.record_streak_activity(_client_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row RECORD;
  _server_today date;
  _today date;
  _yesterday date;
  _new_current int;
  _new_longest int;
  _milestones int[] := ARRAY[3,7,14,30,60,100,180,365,500,1000];
  _m int;
  _milestone_hit int := NULL;
  _freeze_granted boolean := false;
  _freeze_used boolean := false;
  _next_freeze_at timestamptz := NULL;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  PERFORM set_config('app.streak_rpc', 'on', true);

  -- Server-side notion of "today" is the user's LOCAL date, so a device in
  -- UTC+13/UTC-11 is never judged against a UTC calendar day.
  _server_today := public.user_local_date(_uid, now());

  IF _client_date IS NOT NULL
     AND _client_date BETWEEN _server_today - 1 AND _server_today + 1 THEN
    _today := _client_date;
  ELSE
    _today := _server_today;
  END IF;
  _yesterday := _today - 1;

  SELECT * INTO _row FROM public.streaks WHERE user_id=_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.streaks(user_id, current_streak, longest_streak, last_completed_date, total_doses_completed)
      VALUES (_uid, 1, 1, _today, 1);
    _new_current := 1; _new_longest := 1;
  ELSIF _row.last_completed_date = _today THEN
    PERFORM set_config('app.streak_rpc', 'off', true);
    RETURN jsonb_build_object('ok', true, 'unchanged', true, 'current', _row.current_streak);
  ELSE
    IF _row.last_completed_date = _yesterday THEN
      _new_current := _row.current_streak + 1;
    ELSIF _row.last_completed_date < _yesterday THEN
      IF _row.last_completed_date = _yesterday - 1 THEN
        UPDATE public.streak_freezes SET used_at = now()
          WHERE id = (SELECT id FROM public.streak_freezes
                      WHERE user_id=_uid AND used_at IS NULL
                      ORDER BY granted_at LIMIT 1);
        IF FOUND THEN
          _new_current := _row.current_streak + 1;
          _freeze_used := true;
        ELSE _new_current := 1;
        END IF;
      ELSE
        _new_current := 1;
      END IF;
    ELSE
      -- last_completed_date is in the future relative to _today (timezone or
      -- clock drift): keep the streak, do not reset, and don't move the date back.
      _new_current := _row.current_streak;
      _today := _row.last_completed_date;
    END IF;
    _new_longest := GREATEST(_row.longest_streak, _new_current);
    UPDATE public.streaks
      SET current_streak=_new_current,
          longest_streak=_new_longest,
          last_completed_date=_today,
          total_doses_completed=_row.total_doses_completed + 1,
          updated_at=now()
      WHERE user_id=_uid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.streak_freezes WHERE user_id=_uid AND used_at IS NULL)
     AND NOT EXISTS (SELECT 1 FROM public.streak_freezes WHERE user_id=_uid AND granted_at > now() - interval '7 days')
  THEN
    INSERT INTO public.streak_freezes(user_id) VALUES (_uid);
    _freeze_granted := true;
  END IF;

  SELECT granted_at + interval '7 days' INTO _next_freeze_at
    FROM public.streak_freezes
    WHERE user_id=_uid
    ORDER BY granted_at DESC
    LIMIT 1;

  FOREACH _m IN ARRAY _milestones LOOP
    IF _new_current = _m THEN
      INSERT INTO public.streak_milestones(user_id, milestone) VALUES (_uid, _m)
        ON CONFLICT DO NOTHING;
      IF FOUND THEN
        _milestone_hit := _m;
        INSERT INTO public.user_notifications(user_id, kind, title, body, data) VALUES
          (_uid, 'streak_milestone', _m || '-day streak! 🔥', 'Keep going — share your milestone.',
            jsonb_build_object('milestone', _m));
        IF _m IN (3,7,30,100,365) THEN
          INSERT INTO public.user_badges(user_id, badge_key)
            VALUES (_uid, 'streak_' || _m) ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END LOOP;

  IF _freeze_used THEN
    INSERT INTO public.user_notifications(user_id, kind, title, body, data) VALUES
      (_uid, 'streak_freeze_used', 'Your streak was saved ❄️',
       'A streak freeze protected your ' || _new_current || '-day streak.',
       jsonb_build_object('current', _new_current));
  END IF;

  PERFORM set_config('app.streak_rpc', 'off', true);

  RETURN jsonb_build_object(
    'ok', true,
    'current', _new_current,
    'longest', _new_longest,
    'milestone_hit', _milestone_hit,
    'freeze_granted', _freeze_granted,
    'freeze_used', _freeze_used,
    'next_freeze_at', _next_freeze_at
  );
END; $function$;

-- 6. Server-side helper for cron jobs: which users are at risk in THEIR local evening
CREATE OR REPLACE FUNCTION public.streak_risk_candidates(_min_hour int DEFAULT 19, _max_hour int DEFAULT 23, _limit int DEFAULT 5000)
RETURNS TABLE (user_id uuid, current_streak int, last_completed_date date, local_date date, local_hour int, timezone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.user_id,
         s.current_streak,
         s.last_completed_date,
         public.user_local_date(s.user_id, now()) AS local_date,
         public.user_local_hour(s.user_id, now()) AS local_hour,
         public.user_timezone(s.user_id) AS timezone
  FROM public.streaks s
  WHERE s.current_streak >= 1
    AND (s.last_completed_date IS NULL
         OR s.last_completed_date < public.user_local_date(s.user_id, now()))
    AND public.user_local_hour(s.user_id, now()) BETWEEN _min_hour AND _max_hour
  LIMIT _limit
$$;

REVOKE ALL ON FUNCTION public.streak_risk_candidates(int, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.streak_risk_candidates(int, int, int) TO service_role;