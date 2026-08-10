-- helper: are two users blocked in either direction?
CREATE OR REPLACE FUNCTION public.social_is_blocked(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = _a AND b.blocked_user_id = _b)
       OR (b.blocker_id = _b AND b.blocked_user_id = _a)
  );
$$;

CREATE OR REPLACE FUNCTION public.are_connected(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_connections c
    WHERE c.status = 'accepted'
      AND ((c.requester_id = _a AND c.addressee_id = _b)
        OR (c.requester_id = _b AND c.addressee_id = _a))
  );
$$;

-- can _viewer see _field of _owner?
CREATE OR REPLACE FUNCTION public.social_can_view(_viewer uuid, _owner uuid, _level public.visibility_level)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _viewer = _owner THEN true
    WHEN _viewer IS NOT NULL AND public.social_is_blocked(_viewer, _owner) THEN false
    WHEN _level = 'everyone' THEN true
    WHEN _level = 'connections' THEN _viewer IS NOT NULL AND public.are_connected(_viewer, _owner)
    ELSE false
  END;
$$;

-- VERIFIED PROGRESS ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_activity_stats(_user_id uuid, _since timestamptz)
RETURNS TABLE(minutes int, videos int, doses int, days int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (
      COALESCE((SELECT sum(LEAST(GREATEST(w.progress_seconds,0), 14400)) FROM public.watch_history w
                WHERE w.user_id = _user_id AND w.watched_at >= _since), 0)
    + COALESCE((SELECT sum(LEAST(GREATEST(a.seconds,0), 43200)) FROM public.audio_listen_daily a
                WHERE a.user_id = _user_id AND a.day >= _since::date), 0)
    )::int / 60 AS minutes,
    COALESCE((SELECT count(*) FROM public.watch_history w
              WHERE w.user_id = _user_id AND w.watched_at >= _since AND w.completed), 0)::int AS videos,
    COALESCE((SELECT count(*) FROM public.dose_completions d
              WHERE d.user_id = _user_id AND d.completed_at >= _since), 0)::int AS doses,
    COALESCE((SELECT count(DISTINCT day) FROM (
                SELECT (w.watched_at AT TIME ZONE 'UTC')::date AS day FROM public.watch_history w
                  WHERE w.user_id = _user_id AND w.watched_at >= _since
                UNION
                SELECT (d.completed_at AT TIME ZONE 'UTC')::date FROM public.dose_completions d
                  WHERE d.user_id = _user_id AND d.completed_at >= _since
              ) t), 0)::int AS days;
$$;

-- my own progress summary (today + week + streak)
CREATE OR REPLACE FUNCTION public.my_progress_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); t record; w record; s record;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  SELECT * INTO t FROM public.user_activity_stats(uid, date_trunc('day', now()));
  SELECT * INTO w FROM public.user_activity_stats(uid, now() - interval '7 days');
  SELECT current_streak, longest_streak INTO s FROM public.streaks WHERE user_id = uid;
  RETURN jsonb_build_object(
    'today', jsonb_build_object('minutes', t.minutes, 'videos', t.videos, 'doses', t.doses),
    'week',  jsonb_build_object('minutes', w.minutes, 'videos', w.videos, 'doses', w.doses, 'days', w.days),
    'current_streak', COALESCE(s.current_streak, 0),
    'longest_streak', COALESCE(s.longest_streak, 0)
  );
END; $$;

-- DISCOVERY ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_heartify_users(_q text, _limit int DEFAULT 20)
RETURNS TABLE(handle text, display_name text, avatar_url text, bio text,
              primary_interest text, current_streak int, connection_status text, connection_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); q text := btrim(coalesce(_q,''));
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  IF char_length(q) < 2 THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.handle, p.display_name, p.avatar_url, p.bio,
         ui.primary_interest,
         CASE WHEN public.social_can_view(uid, p.user_id, p.streak_visibility)
              THEN COALESCE(s.current_streak, 0) ELSE NULL END::int,
         CASE WHEN c.id IS NULL THEN 'none'
              WHEN c.status = 'accepted' THEN 'connected'
              WHEN c.status = 'pending' AND c.requester_id = uid THEN 'outgoing'
              WHEN c.status = 'pending' THEN 'incoming'
              ELSE c.status END,
         c.id
  FROM public.profiles p
  LEFT JOIN public.streaks s ON s.user_id = p.user_id
  LEFT JOIN public.user_interests ui ON ui.user_id = p.user_id
  LEFT JOIN public.user_connections c
    ON least(c.requester_id, c.addressee_id) = least(uid, p.user_id)
   AND greatest(c.requester_id, c.addressee_id) = greatest(uid, p.user_id)
  WHERE p.user_id <> uid
    AND p.handle IS NOT NULL
    AND p.discoverable
    AND p.profile_visibility <> 'nobody'
    AND NOT public.social_is_blocked(uid, p.user_id)
    AND (p.handle ILIKE '%' || q || '%' OR p.display_name ILIKE '%' || q || '%')
  ORDER BY (lower(p.handle) = lower(q)) DESC, p.handle
  LIMIT LEAST(GREATEST(coalesce(_limit,20), 1), 50);
END; $$;

-- CONNECTION ACTIONS -------------------------------------------------------
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
    -- previously declined: allow one re-request, flipping direction to the new sender
    UPDATE public.user_connections
       SET status='pending', requester_id=uid, addressee_id=target, accepted_at=NULL, created_at=now()
     WHERE id = existing.id RETURNING id INTO new_id;
  ELSE
    INSERT INTO public.user_connections (requester_id, addressee_id, status)
    VALUES (uid, target, 'pending') RETURNING id INTO new_id;
  END IF;

  INSERT INTO public.user_notifications (user_id, kind, title, body, data)
  VALUES (target, 'connection_request', 'New connection request',
          COALESCE((SELECT display_name FROM public.profiles WHERE user_id = uid), 'A Heartify member')
            || ' wants to connect with you.',
          jsonb_build_object('connection_id', new_id, 'actor_id', uid));

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END; $$;

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
    INSERT INTO public.user_notifications (user_id, kind, title, body, data)
    VALUES (row.requester_id, 'connection_accepted', 'Connection accepted',
            COALESCE((SELECT display_name FROM public.profiles WHERE user_id = uid), 'A Heartify member')
              || ' accepted your connection request.',
            jsonb_build_object('connection_id', row.id, 'actor_id', uid));
  ELSE
    UPDATE public.user_connections SET status='declined' WHERE id = row.id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- CONNECTION LISTS ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_connections()
RETURNS TABLE(connection_id uuid, user_handle text, display_name text, avatar_url text,
              current_streak int, week_minutes int, week_doses int, week_videos int,
              progress_shared boolean, connected_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT c.id, p.handle, p.display_name, p.avatar_url,
         CASE WHEN public.social_can_view(uid, p.user_id, p.streak_visibility)
              THEN COALESCE(s.current_streak,0) ELSE NULL END::int,
         CASE WHEN vis.ok THEN st.minutes ELSE NULL END,
         CASE WHEN vis.ok THEN st.doses   ELSE NULL END,
         CASE WHEN vis.ok THEN st.videos  ELSE NULL END,
         vis.ok, c.accepted_at
  FROM public.user_connections c
  JOIN public.profiles p
    ON p.user_id = CASE WHEN c.requester_id = uid THEN c.addressee_id ELSE c.requester_id END
  LEFT JOIN public.streaks s ON s.user_id = p.user_id
  CROSS JOIN LATERAL (SELECT public.social_can_view(uid, p.user_id, p.progress_visibility) AS ok) vis
  LEFT JOIN LATERAL public.user_activity_stats(p.user_id, now() - interval '7 days') st ON true
  WHERE c.status = 'accepted' AND (c.requester_id = uid OR c.addressee_id = uid)
  ORDER BY c.accepted_at DESC NULLS LAST;
END; $$;

CREATE OR REPLACE FUNCTION public.list_my_connection_requests()
RETURNS TABLE(connection_id uuid, direction text, user_handle text, display_name text,
              avatar_url text, bio text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT c.id,
         CASE WHEN c.requester_id = uid THEN 'outgoing' ELSE 'incoming' END,
         p.handle, p.display_name, p.avatar_url, p.bio, c.created_at
  FROM public.user_connections c
  JOIN public.profiles p
    ON p.user_id = CASE WHEN c.requester_id = uid THEN c.addressee_id ELSE c.requester_id END
  WHERE c.status = 'pending' AND (c.requester_id = uid OR c.addressee_id = uid)
  ORDER BY c.created_at DESC;
END; $$;

-- public profile progress, privacy-gated
CREATE OR REPLACE FUNCTION public.get_profile_progress(_handle text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p record; w record; s record;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE lower(handle) = lower(btrim(_handle)) LIMIT 1;
  IF p.user_id IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF NOT public.social_can_view(uid, p.user_id, p.profile_visibility) THEN
    RETURN jsonb_build_object('error','private');
  END IF;
  SELECT current_streak, longest_streak INTO s FROM public.streaks WHERE user_id = p.user_id;
  IF public.social_can_view(uid, p.user_id, p.progress_visibility) THEN
    SELECT * INTO w FROM public.user_activity_stats(p.user_id, now() - interval '7 days');
  END IF;
  RETURN jsonb_build_object(
    'handle', p.handle,
    'connected', uid IS NOT NULL AND public.are_connected(uid, p.user_id),
    'streak_shared', public.social_can_view(uid, p.user_id, p.streak_visibility),
    'current_streak', CASE WHEN public.social_can_view(uid, p.user_id, p.streak_visibility)
                           THEN COALESCE(s.current_streak,0) END,
    'longest_streak', CASE WHEN public.social_can_view(uid, p.user_id, p.streak_visibility)
                           THEN COALESCE(s.longest_streak,0) END,
    'progress_shared', public.social_can_view(uid, p.user_id, p.progress_visibility),
    'week', CASE WHEN w IS NOT NULL THEN jsonb_build_object(
              'minutes', w.minutes, 'videos', w.videos, 'doses', w.doses, 'days', w.days) END,
    'interests', (SELECT jsonb_build_array(ui.primary_interest, ui.secondary_interest)
                    FROM public.user_interests ui WHERE ui.user_id = p.user_id),
    'badges', (SELECT COALESCE(jsonb_agg(b.badge_key), '[]'::jsonb)
                 FROM public.user_badges b WHERE b.user_id = p.user_id)
  );
END; $$;

-- CHALLENGES ---------------------------------------------------------------
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
    INSERT INTO public.user_notifications (user_id, kind, title, body, data)
    VALUES (target, 'challenge_invite', 'You have a new challenge',
            COALESCE((SELECT display_name FROM public.profiles WHERE user_id = uid), 'A connection')
              || ' invited you to "' || btrim(_title) || '".',
            jsonb_build_object('challenge_id', cid, 'actor_id', uid));
    invited := invited + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'id', cid, 'invited', invited);
END; $$;

CREATE OR REPLACE FUNCTION public.respond_challenge_invite(_challenge_id uuid, _accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); m record;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  SELECT * INTO m FROM public.challenge_members WHERE challenge_id = _challenge_id AND user_id = uid;
  IF m.id IS NULL THEN RETURN jsonb_build_object('error','not_invited'); END IF;
  IF m.state <> 'invited' THEN RETURN jsonb_build_object('error','already_responded'); END IF;
  UPDATE public.challenge_members
     SET state = CASE WHEN _accept THEN 'joined' ELSE 'declined' END,
         joined_at = CASE WHEN _accept THEN now() ELSE NULL END
   WHERE id = m.id;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.leave_challenge(_challenge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  UPDATE public.challenge_members SET state='left' WHERE challenge_id=_challenge_id AND user_id=uid;
  UPDATE public.challenges SET status='cancelled'
   WHERE id=_challenge_id AND creator_id=uid AND status='active';
  RETURN jsonb_build_object('ok', true);
END; $$;

-- live challenge list with server-computed progress
CREATE OR REPLACE FUNCTION public.list_my_challenges()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); out jsonb;
BEGIN
  IF uid IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'end_at'), '[]'::jsonb) INTO out FROM (
    SELECT jsonb_build_object(
      'id', c.id, 'type', c.type, 'title', c.title, 'description', c.description,
      'goal', c.goal, 'start_at', c.start_at, 'end_at', c.end_at, 'status', c.status,
      'is_creator', c.creator_id = uid,
      'my_state', me.state,
      'members', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'handle', p.handle,
                 'display_name', p.display_name,
                 'avatar_url', p.avatar_url,
                 'is_me', m.user_id = uid,
                 'state', m.state,
                 'progress', CASE c.type
                    WHEN 'minutes'  THEN st.minutes
                    WHEN 'doses'    THEN st.doses
                    WHEN 'videos'   THEN st.videos
                    ELSE st.days END,
                 'completed', (CASE c.type
                    WHEN 'minutes'  THEN st.minutes
                    WHEN 'doses'    THEN st.doses
                    WHEN 'videos'   THEN st.videos
                    ELSE st.days END) >= c.goal
               ) ORDER BY p.handle), '[]'::jsonb)
        FROM public.challenge_members m
        JOIN public.profiles p ON p.user_id = m.user_id
        LEFT JOIN LATERAL public.user_activity_stats(m.user_id, c.start_at) st ON true
        WHERE m.challenge_id = c.id AND m.state IN ('joined','invited')
      )
    ) AS x
    FROM public.challenges c
    JOIN public.challenge_members me ON me.challenge_id = c.id AND me.user_id = uid
    WHERE me.state IN ('invited','joined') AND c.status <> 'cancelled'
  ) s;
  RETURN out;
END; $$;

-- FRIENDS LEADERBOARD ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.friends_leaderboard(_metric text DEFAULT 'minutes')
RETURNS TABLE(user_handle text, display_name text, avatar_url text, is_me boolean, score int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); m text := lower(coalesce(_metric,'minutes'));
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  IF m NOT IN ('minutes','doses','days','streak') THEN m := 'minutes'; END IF;
  RETURN QUERY
  WITH circle AS (
    SELECT uid AS id
    UNION
    SELECT CASE WHEN c.requester_id = uid THEN c.addressee_id ELSE c.requester_id END
    FROM public.user_connections c
    WHERE c.status='accepted' AND (c.requester_id = uid OR c.addressee_id = uid)
  )
  SELECT p.handle, p.display_name, p.avatar_url, p.user_id = uid,
         CASE
           WHEN m = 'streak' THEN
             CASE WHEN public.social_can_view(uid, p.user_id, p.streak_visibility)
                  THEN COALESCE(s.current_streak, 0) ELSE 0 END
           WHEN NOT public.social_can_view(uid, p.user_id, p.progress_visibility) THEN 0
           WHEN m = 'doses' THEN st.doses
           WHEN m = 'days'  THEN st.days
           ELSE st.minutes
         END::int
  FROM circle
  JOIN public.profiles p ON p.user_id = circle.id
  LEFT JOIN public.streaks s ON s.user_id = p.user_id
  LEFT JOIN LATERAL public.user_activity_stats(p.user_id, now() - interval '7 days') st ON true
  ORDER BY 5 DESC, p.handle;
END; $$;

-- REPORTING ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_heartify_user(_handle text, _reason text, _description text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); target uuid; recent int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  IF _reason NOT IN ('spam','harassment','inappropriate','abuse','other') THEN
    RETURN jsonb_build_object('error','invalid_reason'); END IF;
  IF char_length(coalesce(_description,'')) > 1000 THEN RETURN jsonb_build_object('error','description_too_long'); END IF;
  SELECT user_id INTO target FROM public.profiles WHERE lower(handle) = lower(btrim(_handle)) LIMIT 1;
  IF target IS NULL THEN RETURN jsonb_build_object('error','handle_not_found'); END IF;
  IF target = uid THEN RETURN jsonb_build_object('error','cannot_report_self'); END IF;

  SELECT count(*)::int INTO recent FROM public.user_reports
   WHERE reporter_id = uid AND created_at > now() - interval '24 hours';
  IF recent >= 10 THEN RETURN jsonb_build_object('error','daily_limit_reached'); END IF;

  IF EXISTS (SELECT 1 FROM public.user_reports
              WHERE reporter_id = uid AND reported_user_id = target AND status = 'open') THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;

  INSERT INTO public.user_reports (reporter_id, reported_user_id, reason, description)
  VALUES (uid, target, _reason, NULLIF(btrim(coalesce(_description,'')),''));
  RETURN jsonb_build_object('ok', true);
END; $$;

-- blocking a member also removes the connection
CREATE OR REPLACE FUNCTION public.block_heartify_user(_handle text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); target uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  SELECT user_id INTO target FROM public.profiles WHERE lower(handle) = lower(btrim(_handle)) LIMIT 1;
  IF target IS NULL THEN RETURN jsonb_build_object('error','handle_not_found'); END IF;
  IF target = uid THEN RETURN jsonb_build_object('error','cannot_block_self'); END IF;
  INSERT INTO public.user_blocks (blocker_id, blocked_user_id) VALUES (uid, target)
    ON CONFLICT DO NOTHING;
  DELETE FROM public.user_connections
   WHERE least(requester_id, addressee_id) = least(uid, target)
     AND greatest(requester_id, addressee_id) = greatest(uid, target);
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ADMIN SUMMARY ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.social_admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE total int; pending int; accepted int; ch int; ch_active int; ch_done int;
        pokes int; reports int; blocks int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error','forbidden');
  END IF;
  SELECT count(*) FILTER (WHERE status='accepted'),
         count(*) FILTER (WHERE status='pending'),
         count(*) INTO accepted, pending, total FROM public.user_connections;
  SELECT count(*), count(*) FILTER (WHERE status='active'), count(*) FILTER (WHERE status='completed')
    INTO ch, ch_active, ch_done FROM public.challenges;
  SELECT count(*) INTO pokes FROM public.nudges;
  SELECT count(*) INTO reports FROM public.user_reports WHERE status='open';
  SELECT count(*) INTO blocks FROM public.user_blocks;
  RETURN jsonb_build_object(
    'connections', accepted, 'pending_requests', pending,
    'acceptance_rate', CASE WHEN total > 0 THEN round(accepted::numeric * 100 / total, 1) ELSE 0 END,
    'challenges', ch, 'challenges_active', ch_active, 'challenges_completed', ch_done,
    'challenge_completion_rate', CASE WHEN ch > 0 THEN round(ch_done::numeric * 100 / ch, 1) ELSE 0 END,
    'pokes', pokes, 'open_reports', reports, 'blocked_users', blocks
  );
END; $$;

-- lock down execution: signed-in members only
REVOKE ALL ON FUNCTION public.social_is_blocked(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.are_connected(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.social_can_view(uuid, uuid, public.visibility_level) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_activity_stats(uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_progress_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_heartify_users(text, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_connection_request(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_connection_request(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_connections() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_connection_requests() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_challenge(text, text, int, int, text[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_challenge_invite(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_challenge(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_challenges() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.friends_leaderboard(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.report_heartify_user(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.block_heartify_user(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.social_admin_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_challenge_member(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.my_progress_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_heartify_users(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_connection_request(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_connection_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_connection_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_challenge(text, text, int, int, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_challenge_invite(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_challenge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.friends_leaderboard(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_heartify_user(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_heartify_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.social_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_progress(text) TO authenticated, anon;