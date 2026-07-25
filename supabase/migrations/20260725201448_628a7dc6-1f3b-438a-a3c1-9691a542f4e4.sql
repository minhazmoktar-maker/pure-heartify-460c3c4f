
CREATE OR REPLACE FUNCTION public.record_streak_activity(_client_date date DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row RECORD;
  _utc_today date := (now() at time zone 'utc')::date;
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

  -- Use the client's local date so users in timezones offset from UTC
  -- (e.g. UTC+6 Bangladesh, UTC+10 Australia) don't lose their streak
  -- on the UTC-boundary rollover. Clamp to ±1 day of UTC today to prevent
  -- abuse (arbitrary future/past dates).
  IF _client_date IS NOT NULL
     AND _client_date BETWEEN _utc_today - 1 AND _utc_today + 1 THEN
    _today := _client_date;
  ELSE
    _today := _utc_today;
  END IF;
  _yesterday := _today - 1;

  SELECT * INTO _row FROM public.streaks WHERE user_id=_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.streaks(user_id, current_streak, longest_streak, last_completed_date, total_doses_completed)
      VALUES (_uid, 1, 1, _today, 1);
    _new_current := 1; _new_longest := 1;
  ELSIF _row.last_completed_date = _today THEN
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
      _new_current := _row.current_streak + 1;
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

-- Drop the old no-arg signature so PostgREST resolves to the new one cleanly.
DROP FUNCTION IF EXISTS public.record_streak_activity();

REVOKE ALL ON FUNCTION public.record_streak_activity(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_streak_activity(date) TO authenticated, service_role;
