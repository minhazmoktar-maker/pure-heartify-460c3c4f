
-- Return the milestone hit so the client can celebrate in-app.
CREATE OR REPLACE FUNCTION public.record_streak_activity()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row RECORD;
  _today date := (now() at time zone 'utc')::date;
  _yesterday date := _today - 1;
  _new_current int;
  _new_longest int;
  _milestones int[] := ARRAY[3,7,14,30,60,100,180,365,500,1000];
  _m int;
  _milestone_hit int := NULL;
  _freeze_granted boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
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
        IF FOUND THEN _new_current := _row.current_streak + 1;
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

  RETURN jsonb_build_object(
    'ok', true,
    'current', _new_current,
    'longest', _new_longest,
    'milestone_hit', _milestone_hit,
    'freeze_granted', _freeze_granted
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.record_streak_activity() TO authenticated;
