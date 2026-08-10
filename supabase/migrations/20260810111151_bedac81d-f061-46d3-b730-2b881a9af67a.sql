-- 1) Rate-limited, preference-aware notification helper -----------------------
CREATE OR REPLACE FUNCTION public.social_notify(
  _user_id uuid,
  _kind text,
  _title text,
  _body text,
  _data jsonb DEFAULT '{}'::jsonb,
  _max_per_day int DEFAULT 10
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE allowed boolean; sent int;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  SELECT COALESCE(np.in_app_enabled, true) INTO allowed
    FROM public.notification_preferences np
   WHERE np.user_id = _user_id AND np.kind = _kind
   LIMIT 1;
  IF allowed IS NULL THEN allowed := true; END IF;
  IF NOT allowed THEN RETURN false; END IF;

  SELECT count(*)::int INTO sent
    FROM public.user_notifications n
   WHERE n.user_id = _user_id AND n.kind = _kind
     AND n.created_at > now() - interval '24 hours';
  IF sent >= GREATEST(_max_per_day, 1) THEN RETURN false; END IF;

  INSERT INTO public.user_notifications (user_id, kind, title, body, data)
  VALUES (_user_id, _kind, _title, _body, COALESCE(_data, '{}'::jsonb));
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.social_notify(uuid, text, text, text, jsonb, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.social_notify(uuid, text, text, text, jsonb, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_notify(uuid, text, text, text, jsonb, int) TO service_role;

CREATE OR REPLACE FUNCTION public.social_display_name(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(btrim(p.display_name), ''), '@' || p.handle, 'A Heartify member')
    FROM public.profiles p WHERE p.user_id = _user_id LIMIT 1;
$$;

-- 2) Connection request / response notifications -------------------------------
CREATE OR REPLACE FUNCTION public.send_connection_request(_handle text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); target uuid; existing record; new_id uuid; sent int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  SELECT user_id INTO target FROM public.profiles WHERE lower(handle) = lower(btrim(_handle)) LIMIT 1;
  IF target IS NULL THEN RETURN jsonb_build_object('error','handle_not_found'); END IF;
  IF target = uid THEN RETURN jsonb_build_object('error','cannot_connect_self'); END IF;
  IF public.social_is_blocked(uid, target) THEN RETURN jsonb_build_object('error','blocked'); END IF;

  SELECT count(*)::int INTO sent FROM public.user_connections
   WHERE requester_id = uid AND created_at > now() - interval '24 hours';
  IF sent >= 30 THEN RETURN jsonb_build_object('error','daily_limit_reached'); END IF;

  SELECT * INTO existing FROM public.user_connections
   WHERE least(requester_id, addressee_id) = least(uid, target)
     AND greatest(requester_id, addressee_id) = greatest(uid, target);

  IF existing.id IS NOT NULL THEN
    IF existing.status = 'accepted' THEN RETURN jsonb_build_object('error','already_connected'); END IF;
    IF existing.status = 'pending'  THEN RETURN jsonb_build_object('error','request_pending'); END IF;
    UPDATE public.user_connections
       SET status='pending', requester_id=uid, addressee_id=target, accepted_at=NULL, created_at=now()
     WHERE id = existing.id RETURNING id INTO new_id;
  ELSE
    INSERT INTO public.user_connections (requester_id, addressee_id, status)
    VALUES (uid, target, 'pending') RETURNING id INTO new_id;
  END IF;

  PERFORM public.social_notify(
    target, 'connection_request', 'New connection request',
    public.social_display_name(uid) || ' wants to connect with you.',
    jsonb_build_object('connection_id', new_id, 'actor_id', uid), 10);

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_connection_request(_connection_id uuid, _accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); row record;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  SELECT * INTO row FROM public.user_connections WHERE id = _connection_id;
  IF row.id IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF row.addressee_id <> uid THEN RETURN jsonb_build_object('error','forbidden'); END IF;
  IF row.status <> 'pending' THEN RETURN jsonb_build_object('error','not_pending'); END IF;

  IF _accept THEN
    UPDATE public.user_connections SET status='accepted', accepted_at=now() WHERE id = row.id;
    PERFORM public.social_notify(
      row.requester_id, 'connection_accepted', 'Connection accepted',
      public.social_display_name(uid) || ' accepted your connection request.',
      jsonb_build_object('connection_id', row.id, 'actor_id', uid), 20);
  ELSE
    UPDATE public.user_connections SET status='declined' WHERE id = row.id;
    PERFORM public.social_notify(
      row.requester_id, 'connection_declined', 'Request not accepted',
      'Your connection request was not accepted. You can try again later.',
      jsonb_build_object('connection_id', row.id), 5);
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 3) Challenge invite response notifies the creator ---------------------------
CREATE OR REPLACE FUNCTION public.respond_challenge_invite(_challenge_id uuid, _accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); m record; c record;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  SELECT * INTO m FROM public.challenge_members WHERE challenge_id = _challenge_id AND user_id = uid;
  IF m.id IS NULL THEN RETURN jsonb_build_object('error','not_invited'); END IF;
  IF m.state <> 'invited' THEN RETURN jsonb_build_object('error','already_responded'); END IF;
  UPDATE public.challenge_members
     SET state = CASE WHEN _accept THEN 'joined' ELSE 'declined' END,
         joined_at = CASE WHEN _accept THEN now() ELSE NULL END
   WHERE id = m.id;

  SELECT * INTO c FROM public.challenges WHERE id = _challenge_id;
  IF c.creator_id IS NOT NULL AND c.creator_id <> uid THEN
    PERFORM public.social_notify(
      c.creator_id,
      CASE WHEN _accept THEN 'challenge_joined' ELSE 'challenge_declined' END,
      CASE WHEN _accept THEN 'Someone joined your challenge' ELSE 'Challenge invite declined' END,
      public.social_display_name(uid) ||
        CASE WHEN _accept THEN ' joined "' ELSE ' declined "' END || c.title || '".',
      jsonb_build_object('challenge_id', c.id, 'actor_id', uid), 20);
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 4) Challenge invites through create_challenge use the capped helper ---------
CREATE OR REPLACE FUNCTION public.create_challenge(
  _type text, _title text, _goal int, _days int, _handles text[], _description text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); cid uuid; h text; target uuid; invited int := 0; active int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  IF _type NOT IN ('minutes','doses','videos','sessions') THEN RETURN jsonb_build_object('error','invalid_type'); END IF;
  IF _days NOT IN (3,7,14,30) THEN RETURN jsonb_build_object('error','invalid_duration'); END IF;
  IF _goal IS NULL OR _goal < 1 OR _goal > 100000 THEN RETURN jsonb_build_object('error','invalid_goal'); END IF;
  IF char_length(btrim(coalesce(_title,''))) NOT BETWEEN 1 AND 120 THEN RETURN jsonb_build_object('error','invalid_title'); END IF;
  IF coalesce(array_length(_handles,1),0) > 20 THEN RETURN jsonb_build_object('error','too_many_invites'); END IF;

  SELECT count(*)::int INTO active FROM public.challenges
   WHERE creator_id = uid AND status = 'active';
  IF active >= 10 THEN RETURN jsonb_build_object('error','too_many_active_challenges'); END IF;

  INSERT INTO public.challenges (creator_id, type, title, description, goal, start_at, end_at)
  VALUES (uid, _type, btrim(_title), NULLIF(btrim(coalesce(_description,'')),''), _goal,
          date_trunc('day', now()), date_trunc('day', now()) + (_days || ' days')::interval)
  RETURNING id INTO cid;

  INSERT INTO public.challenge_members (challenge_id, user_id, state, joined_at)
  VALUES (cid, uid, 'joined', now());

  FOREACH h IN ARRAY COALESCE(_handles, ARRAY[]::text[]) LOOP
    SELECT user_id INTO target FROM public.profiles WHERE lower(handle) = lower(btrim(h)) LIMIT 1;
    CONTINUE WHEN target IS NULL OR target = uid;
    CONTINUE WHEN NOT public.are_connected(uid, target);
    CONTINUE WHEN public.social_is_blocked(uid, target);
    INSERT INTO public.challenge_members (challenge_id, user_id, state)
    VALUES (cid, target, 'invited') ON CONFLICT DO NOTHING;
    PERFORM public.social_notify(
      target, 'challenge_invite', 'You have a new challenge',
      public.social_display_name(uid) || ' invited you to "' || btrim(_title) || '".',
      jsonb_build_object('challenge_id', cid, 'actor_id', uid), 10);
    invited := invited + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'id', cid, 'invited', invited);
END;
$$;

-- 5) Daily Dose completion syncs challenge progress + notifies peers ----------
CREATE OR REPLACE FUNCTION public.social_sync_challenge_progress(_user_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; st record; prog int; peer record; hits int := 0; shared boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN 0; END IF;

  FOR c IN
    SELECT ch.*, m.id AS member_id
      FROM public.challenges ch
      JOIN public.challenge_members m ON m.challenge_id = ch.id AND m.user_id = _user_id
     WHERE ch.status = 'active' AND m.state = 'joined' AND m.completed = false
       AND now() BETWEEN ch.start_at AND ch.end_at
     LIMIT 20
  LOOP
    SELECT * INTO st FROM public.user_activity_stats(_user_id, c.start_at);
    prog := CASE c.type
              WHEN 'minutes' THEN st.minutes
              WHEN 'doses'   THEN st.doses
              WHEN 'videos'  THEN st.videos
              ELSE st.days END;
    CONTINUE WHEN prog IS NULL OR prog < c.goal;

    UPDATE public.challenge_members SET completed = true, updated_at = now()
     WHERE id = c.member_id AND completed = false;
    hits := hits + 1;

    PERFORM public.social_notify(
      _user_id, 'challenge_completed', 'Challenge goal reached 🌿',
      'You reached the goal of "' || c.title || '".',
      jsonb_build_object('challenge_id', c.id), 10);

    -- Peers only hear about it when the member shares progress with them.
    FOR peer IN
      SELECT m2.user_id FROM public.challenge_members m2
       WHERE m2.challenge_id = c.id AND m2.state = 'joined' AND m2.user_id <> _user_id
       LIMIT 25
    LOOP
      SELECT public.social_can_view(peer.user_id, _user_id,
               (SELECT progress_visibility FROM public.profiles WHERE user_id = _user_id))
        INTO shared;
      CONTINUE WHEN NOT COALESCE(shared, false);
      PERFORM public.social_notify(
        peer.user_id, 'challenge_progress', 'A challenge friend hit the goal',
        public.social_display_name(_user_id) || ' completed "' || c.title || '".',
        jsonb_build_object('challenge_id', c.id, 'actor_id', _user_id), 5);
    END LOOP;
  END LOOP;

  RETURN hits;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_dose_completion_social()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.social_sync_challenge_progress(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dose_completion_social ON public.dose_completions;
CREATE TRIGGER trg_dose_completion_social
AFTER INSERT ON public.dose_completions
FOR EACH ROW EXECUTE FUNCTION public.tg_dose_completion_social();

REVOKE ALL ON FUNCTION public.social_sync_challenge_progress(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.social_sync_challenge_progress(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_sync_challenge_progress(uuid) TO service_role;

-- 6) Privacy-conscious admin analytics ---------------------------------------
CREATE OR REPLACE FUNCTION public.social_analytics_series(_days int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d int := LEAST(GREATEST(COALESCE(_days, 30), 7), 90); series jsonb; totals jsonb; k int := 5;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error','forbidden');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'day', day,
           'requests', requests, 'accepted', accepted, 'declined', declined,
           'pokes', pokes, 'challenges_created', challenges_created,
           'challenge_completions', challenge_completions
         ) ORDER BY day), '[]'::jsonb) INTO series
  FROM (
    SELECT g::date AS day,
      (SELECT count(*)::int FROM public.user_connections c
         WHERE c.created_at::date = g::date) AS requests,
      (SELECT count(*)::int FROM public.user_connections c
         WHERE c.accepted_at::date = g::date) AS accepted,
      (SELECT count(*)::int FROM public.user_connections c
         WHERE c.status = 'declined' AND c.created_at::date = g::date) AS declined,
      (SELECT count(*)::int FROM public.nudges n
         WHERE n.created_at::date = g::date) AS pokes,
      (SELECT count(*)::int FROM public.challenges ch
         WHERE ch.created_at::date = g::date) AS challenges_created,
      (SELECT count(*)::int FROM public.challenge_members m
         WHERE m.completed AND m.updated_at::date = g::date) AS challenge_completions
    FROM generate_series(current_date - (d - 1), current_date, interval '1 day') g
  ) rows;

  SELECT jsonb_build_object(
    'window_days', d,
    'connections', (SELECT count(*)::int FROM public.user_connections WHERE status='accepted'),
    'pending_requests', (SELECT count(*)::int FROM public.user_connections WHERE status='pending'),
    'declined_requests', (SELECT count(*)::int FROM public.user_connections WHERE status='declined'),
    'members_with_connections', (SELECT count(DISTINCT u)::int FROM (
        SELECT requester_id AS u FROM public.user_connections WHERE status='accepted'
        UNION SELECT addressee_id FROM public.user_connections WHERE status='accepted') t),
    'avg_circle_size', (SELECT COALESCE(round(avg(n), 2), 0) FROM (
        SELECT count(*)::numeric AS n FROM (
          SELECT requester_id AS u FROM public.user_connections WHERE status='accepted'
          UNION ALL SELECT addressee_id FROM public.user_connections WHERE status='accepted') t
        GROUP BY u) q),
    'acceptance_rate', (SELECT CASE WHEN count(*) > 0
        THEN round(count(*) FILTER (WHERE status='accepted')::numeric * 100 / count(*), 1) ELSE 0 END
        FROM public.user_connections),
    'pokes', (SELECT count(*)::int FROM public.nudges),
    'pokes_window', (SELECT count(*)::int FROM public.nudges WHERE created_at > now() - make_interval(days => d)),
    'challenges', (SELECT count(*)::int FROM public.challenges),
    'challenges_active', (SELECT count(*)::int FROM public.challenges WHERE status='active'),
    'challenge_participants', (SELECT count(*)::int FROM public.challenge_members WHERE state='joined'),
    'challenge_invite_accept_rate', (SELECT CASE WHEN count(*) > 0
        THEN round(count(*) FILTER (WHERE state='joined')::numeric * 100 / count(*), 1) ELSE 0 END
        FROM public.challenge_members),
    'challenge_completion_rate', (SELECT CASE WHEN count(*) FILTER (WHERE state='joined') > 0
        THEN round(count(*) FILTER (WHERE completed)::numeric * 100
                   / count(*) FILTER (WHERE state='joined'), 1) ELSE 0 END
        FROM public.challenge_members),
    'open_reports', (SELECT count(*)::int FROM public.user_reports WHERE status='open'),
    'blocked_pairs', (SELECT count(*)::int FROM public.user_blocks),
    'progress_sharing', jsonb_build_object(
      'everyone', (SELECT count(*)::int FROM public.profiles WHERE progress_visibility='everyone'),
      'connections', (SELECT count(*)::int FROM public.profiles WHERE progress_visibility='connections'),
      'nobody', (SELECT count(*)::int FROM public.profiles WHERE progress_visibility='nobody'))
  ) INTO totals;

  -- k-anonymity: suppress the whole readout while the cohort is too small.
  IF (totals->>'members_with_connections')::int < k THEN
    RETURN jsonb_build_object('suppressed', true, 'min_cohort', k, 'window_days', d);
  END IF;

  RETURN jsonb_build_object('suppressed', false, 'min_cohort', k,
                            'totals', totals, 'series', series);
END;
$$;

REVOKE ALL ON FUNCTION public.social_analytics_series(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.social_analytics_series(int) FROM anon;
GRANT EXECUTE ON FUNCTION public.social_analytics_series(int) TO authenticated, service_role;

-- 7) Privacy-aware profile showcase (achievements + milestones) ---------------
CREATE OR REPLACE FUNCTION public.get_profile_showcase(_handle text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p record; s record; w record;
        can_profile boolean; can_streak boolean; can_progress boolean; can_activity boolean;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE lower(handle) = lower(btrim(_handle)) LIMIT 1;
  IF p.user_id IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;

  can_profile  := public.social_can_view(uid, p.user_id, p.profile_visibility);
  IF NOT can_profile THEN RETURN jsonb_build_object('error','private'); END IF;
  can_streak   := public.social_can_view(uid, p.user_id, p.streak_visibility);
  can_progress := public.social_can_view(uid, p.user_id, p.progress_visibility);
  can_activity := public.social_can_view(uid, p.user_id, p.activity_visibility);

  SELECT current_streak, longest_streak INTO s FROM public.streaks WHERE user_id = p.user_id;
  IF can_progress THEN
    SELECT * INTO w FROM public.user_activity_stats(p.user_id, now() - interval '7 days');
  END IF;

  RETURN jsonb_build_object(
    'handle', p.handle,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'joined_at', p.created_at,
    'is_me', uid IS NOT NULL AND uid = p.user_id,
    'connected', uid IS NOT NULL AND public.are_connected(uid, p.user_id),
    'streak_shared', can_streak,
    'progress_shared', can_progress,
    'activity_shared', can_activity,
    'current_streak', CASE WHEN can_streak THEN COALESCE(s.current_streak, 0) END,
    'longest_streak', CASE WHEN can_streak THEN COALESCE(s.longest_streak, 0) END,
    'week', CASE WHEN can_progress THEN jsonb_build_object(
              'minutes', COALESCE(w.minutes,0), 'videos', COALESCE(w.videos,0),
              'doses', COALESCE(w.doses,0), 'days', COALESCE(w.days,0)) END,
    'referrals_redeemed', (SELECT count(*)::int FROM public.referrals r
                             WHERE r.inviter_id = p.user_id AND r.status = 'redeemed'),
    'badge_count', (SELECT count(*)::int FROM public.user_badges ub WHERE ub.user_id = p.user_id),
    'badges', CASE WHEN can_activity THEN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'key', ub.badge_key, 'name', b.name, 'icon', COALESCE(b.icon,'🏅'),
                 'description', b.description, 'earned_at', ub.earned_at
               ) ORDER BY ub.earned_at DESC), '[]'::jsonb)
          FROM public.user_badges ub
          LEFT JOIN public.badges b ON b.key = ub.badge_key
         WHERE ub.user_id = p.user_id) ELSE '[]'::jsonb END,
    'milestones', CASE WHEN can_streak THEN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'milestone', sm.milestone, 'reached_at', sm.reached_at
               ) ORDER BY sm.milestone DESC), '[]'::jsonb)
          FROM public.streak_milestones sm WHERE sm.user_id = p.user_id) ELSE '[]'::jsonb END,
    'challenges_completed', CASE WHEN can_activity THEN (
        SELECT count(*)::int FROM public.challenge_members m
         WHERE m.user_id = p.user_id AND m.completed) ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_profile_showcase(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_showcase(text) TO anon, authenticated, service_role;