
-- Team Streaks: small groups share a streak that advances only when every member completes their daily dose that day.

CREATE TABLE IF NOT EXISTS public.team_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(encode(gen_random_bytes(6), 'base64'), 1, 8)),
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_all_completed_date DATE,
  member_limit INT NOT NULL DEFAULT 5 CHECK (member_limit BETWEEN 2 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_streak_members (
  team_id UUID NOT NULL REFERENCES public.team_streaks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_streak_members_user ON public.team_streak_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_streaks_invite_code ON public.team_streaks(invite_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_streaks TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.team_streak_members TO authenticated;
GRANT ALL ON public.team_streaks TO service_role;
GRANT ALL ON public.team_streak_members TO service_role;

ALTER TABLE public.team_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_streak_members ENABLE ROW LEVEL SECURITY;

-- SELECT: members of the team can see the team row
CREATE POLICY "Members view their teams"
  ON public.team_streaks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_streak_members m WHERE m.team_id = id AND m.user_id = auth.uid()));

-- INSERT/UPDATE/DELETE via RPC only (creator can update name; delete cascades from user delete)
CREATE POLICY "Creator updates team name"
  ON public.team_streaks FOR UPDATE TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator deletes team"
  ON public.team_streaks FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Members can see co-members
CREATE POLICY "Members view co-members"
  ON public.team_streak_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_streak_members m2 WHERE m2.team_id = team_id AND m2.user_id = auth.uid()));

-- A user may leave their own membership
CREATE POLICY "User leaves team"
  ON public.team_streak_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER trg_team_streaks_updated_at
  BEFORE UPDATE ON public.team_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: create team (creator auto-joins)
CREATE OR REPLACE FUNCTION public.create_team_streak(_name TEXT)
RETURNS public.team_streaks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _team public.team_streaks;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _name IS NULL OR char_length(trim(_name)) < 1 THEN RAISE EXCEPTION 'name required'; END IF;

  INSERT INTO public.team_streaks(name, created_by)
    VALUES (trim(_name), _uid) RETURNING * INTO _team;
  INSERT INTO public.team_streak_members(team_id, user_id) VALUES (_team.id, _uid);
  RETURN _team;
END;
$$;

-- RPC: join by invite code
CREATE OR REPLACE FUNCTION public.join_team_streak(_code TEXT)
RETURNS public.team_streaks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _team public.team_streaks;
  _count INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO _team FROM public.team_streaks WHERE invite_code = upper(_code);
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid invite code'; END IF;

  SELECT count(*) INTO _count FROM public.team_streak_members WHERE team_id = _team.id;
  IF _count >= _team.member_limit THEN RAISE EXCEPTION 'team is full'; END IF;

  INSERT INTO public.team_streak_members(team_id, user_id)
    VALUES (_team.id, _uid)
    ON CONFLICT DO NOTHING;
  RETURN _team;
END;
$$;

-- RPC: get my teams with today's completion progress
CREATE OR REPLACE FUNCTION public.list_my_team_streaks()
RETURNS TABLE (
  id UUID,
  name TEXT,
  invite_code TEXT,
  current_streak INT,
  longest_streak INT,
  last_all_completed_date DATE,
  member_count INT,
  member_limit INT,
  completed_today_count INT,
  i_completed_today BOOLEAN,
  is_creator BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH mine AS (
    SELECT t.*
    FROM public.team_streaks t
    JOIN public.team_streak_members m ON m.team_id = t.id
    WHERE m.user_id = auth.uid()
  )
  SELECT
    t.id, t.name, t.invite_code, t.current_streak, t.longest_streak,
    t.last_all_completed_date,
    (SELECT count(*)::INT FROM public.team_streak_members WHERE team_id = t.id) AS member_count,
    t.member_limit,
    (SELECT count(*)::INT
       FROM public.team_streak_members mm
       JOIN public.streaks s ON s.user_id = mm.user_id
      WHERE mm.team_id = t.id
        AND s.last_completed_date = CURRENT_DATE) AS completed_today_count,
    EXISTS (
      SELECT 1 FROM public.streaks s
       WHERE s.user_id = auth.uid()
         AND s.last_completed_date = CURRENT_DATE
    ) AS i_completed_today,
    (t.created_by = auth.uid()) AS is_creator
  FROM mine t
  ORDER BY t.current_streak DESC, t.created_at DESC;
$$;

-- RPC: settle team streaks the caller belongs to for TODAY.
-- If every member of a team has completed today, advance the team streak (idempotent).
CREATE OR REPLACE FUNCTION public.settle_team_streaks()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _t RECORD;
  _all_done BOOLEAN;
  _advanced INT := 0;
  _new_current INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  FOR _t IN
    SELECT t.*
      FROM public.team_streaks t
      JOIN public.team_streak_members m ON m.team_id = t.id
     WHERE m.user_id = _uid
       AND (t.last_all_completed_date IS NULL OR t.last_all_completed_date < CURRENT_DATE)
     FOR UPDATE OF t
  LOOP
    SELECT NOT EXISTS (
      SELECT 1 FROM public.team_streak_members mm
      LEFT JOIN public.streaks s ON s.user_id = mm.user_id
      WHERE mm.team_id = _t.id
        AND (s.last_completed_date IS DISTINCT FROM CURRENT_DATE)
    ) INTO _all_done;

    IF _all_done THEN
      IF _t.last_all_completed_date = CURRENT_DATE - 1 THEN
        _new_current := _t.current_streak + 1;
      ELSE
        _new_current := 1;
      END IF;
      UPDATE public.team_streaks
         SET current_streak = _new_current,
             longest_streak = GREATEST(longest_streak, _new_current),
             last_all_completed_date = CURRENT_DATE
       WHERE id = _t.id;
      _advanced := _advanced + 1;
    END IF;
  END LOOP;
  RETURN _advanced;
END;
$$;

-- Feature flag
INSERT INTO public.feature_flags(key, enabled, rollout_percent, description)
  VALUES ('team_streaks', true, 100, 'Shared streak groups of 2–10 members')
  ON CONFLICT (key) DO NOTHING;
