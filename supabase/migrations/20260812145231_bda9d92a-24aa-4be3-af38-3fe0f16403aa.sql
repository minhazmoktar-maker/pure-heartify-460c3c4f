-- Privacy-first sadaqah signal: counts only, never amounts.
CREATE TABLE IF NOT EXISTS public.sadaqah_acts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  acts int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sadaqah_acts_uniq UNIQUE (user_id, day),
  CONSTRAINT sadaqah_acts_count_chk CHECK (acts BETWEEN 0 AND 50)
);
CREATE INDEX IF NOT EXISTS sadaqah_acts_user_day_idx ON public.sadaqah_acts (user_id, day DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sadaqah_acts TO authenticated;
GRANT ALL ON public.sadaqah_acts TO service_role;
ALTER TABLE public.sadaqah_acts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage their own sadaqah acts" ON public.sadaqah_acts;
CREATE POLICY "Members manage their own sadaqah acts"
  ON public.sadaqah_acts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS sadaqah_acts_touch ON public.sadaqah_acts;
CREATE TRIGGER sadaqah_acts_touch BEFORE UPDATE ON public.sadaqah_acts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Log one giving act for a day. Amounts are never sent to the server.
CREATE OR REPLACE FUNCTION public.log_sadaqah_act(_day date DEFAULT NULL, _delta int DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); d date; n int; total int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  d := COALESCE(_day, (now() AT TIME ZONE 'UTC')::date);
  IF d > (now() AT TIME ZONE 'UTC')::date OR d < (now() AT TIME ZONE 'UTC')::date - 365 THEN
    RETURN jsonb_build_object('error','invalid_day');
  END IF;
  n := LEAST(GREATEST(COALESCE(_delta, 1), -50), 50);

  INSERT INTO public.sadaqah_acts (user_id, day, acts)
  VALUES (uid, d, LEAST(GREATEST(n, 0), 50))
  ON CONFLICT (user_id, day) DO UPDATE
    SET acts = LEAST(GREATEST(public.sadaqah_acts.acts + n, 0), 50), updated_at = now()
  RETURNING acts INTO total;

  PERFORM public.social_sync_challenge_progress(uid);
  RETURN jsonb_build_object('ok', true, 'day', d, 'acts', total);
END; $$;

REVOKE ALL ON FUNCTION public.log_sadaqah_act(date, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_sadaqah_act(date, int) TO authenticated;

-- Aggregate sadaqah signals for a window (counts only).
CREATE OR REPLACE FUNCTION public.user_sadaqah_stats(_user_id uuid, _since timestamptz)
RETURNS TABLE(acts int, days int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(sum(a.acts), 0)::int AS acts,
         COALESCE(count(*) FILTER (WHERE a.acts > 0), 0)::int AS days
    FROM public.sadaqah_acts a
   WHERE a.user_id = _user_id AND a.day >= (_since AT TIME ZONE 'UTC')::date;
$$;

REVOKE ALL ON FUNCTION public.user_sadaqah_stats(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_sadaqah_stats(uuid, timestamptz) TO authenticated, service_role;

-- Allow the two new challenge types.
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_type_chk;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_type_chk
  CHECK (type IN ('minutes','doses','videos','sessions','sadaqah_days','sadaqah_acts'));

CREATE OR REPLACE FUNCTION public.create_challenge(
  _type text, _title text, _goal int, _days int, _handles text[], _description text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); cid uuid; h text; target uuid; invited int := 0; active int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthenticated'); END IF;
  IF _type NOT IN ('minutes','doses','videos','sessions','sadaqah_days','sadaqah_acts')
    THEN RETURN jsonb_build_object('error','invalid_type'); END IF;
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
END; $$;

REVOKE ALL ON FUNCTION public.create_challenge(text, text, int, int, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_challenge(text, text, int, int, text[], text) TO authenticated;

-- Progress computation: explicit per type, sadaqah uses counts only.
CREATE OR REPLACE FUNCTION public.social_sync_challenge_progress(_user_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; st record; sd record; prog int; peer record; hits int := 0; shared boolean;
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
    SELECT * INTO sd FROM public.user_sadaqah_stats(_user_id, c.start_at);
    prog := CASE c.type
              WHEN 'minutes'      THEN st.minutes
              WHEN 'doses'        THEN st.doses
              WHEN 'videos'       THEN st.videos
              WHEN 'sessions'     THEN st.days
              WHEN 'sadaqah_days' THEN sd.days
              WHEN 'sadaqah_acts' THEN sd.acts
              ELSE st.days END;
    CONTINUE WHEN prog IS NULL OR prog < c.goal;

    UPDATE public.challenge_members SET completed = true, updated_at = now()
     WHERE id = c.member_id AND completed = false;
    hits := hits + 1;

    PERFORM public.social_notify(
      _user_id, 'challenge_completed', 'Challenge goal reached 🌿',
      'You reached the goal of "' || c.title || '".',
      jsonb_build_object('challenge_id', c.id), 10);

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
END; $$;

REVOKE ALL ON FUNCTION public.social_sync_challenge_progress(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_sync_challenge_progress(uuid) TO service_role;

-- Roster: sadaqah rows expose counts only, never amounts.
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
                 'progress', prog.v,
                 'completed', prog.v >= c.goal
               ) ORDER BY p.handle), '[]'::jsonb)
        FROM public.challenge_members m
        JOIN public.profiles p ON p.user_id = m.user_id
        LEFT JOIN LATERAL public.user_activity_stats(m.user_id, c.start_at) st ON true
        LEFT JOIN LATERAL public.user_sadaqah_stats(m.user_id, c.start_at) sd ON true
        LEFT JOIN LATERAL (SELECT CASE c.type
                    WHEN 'minutes'      THEN st.minutes
                    WHEN 'doses'        THEN st.doses
                    WHEN 'videos'       THEN st.videos
                    WHEN 'sessions'     THEN st.days
                    WHEN 'sadaqah_days' THEN sd.days
                    WHEN 'sadaqah_acts' THEN sd.acts
                    ELSE st.days END AS v) prog ON true
        WHERE m.challenge_id = c.id AND m.state IN ('joined','invited')
      )
    ) AS x
    FROM public.challenges c
    JOIN public.challenge_members me ON me.challenge_id = c.id AND me.user_id = uid
    WHERE me.state IN ('invited','joined') AND c.status <> 'cancelled'
  ) s;
  RETURN out;
END; $$;

REVOKE ALL ON FUNCTION public.list_my_challenges() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_challenges() TO authenticated;