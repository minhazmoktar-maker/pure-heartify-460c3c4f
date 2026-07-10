
-- weekly_recaps
CREATE TABLE public.weekly_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  minutes_watched INT NOT NULL DEFAULT 0,
  favorites_added INT NOT NULL DEFAULT 0,
  dhikr_count INT NOT NULL DEFAULT 0,
  juz_completed INT NOT NULL DEFAULT 0,
  streak_length INT NOT NULL DEFAULT 0,
  highlights JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);
GRANT SELECT ON public.weekly_recaps TO authenticated;
GRANT ALL ON public.weekly_recaps TO service_role;
ALTER TABLE public.weekly_recaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recap read" ON public.weekly_recaps
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin recap read" ON public.weekly_recaps
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_weekly_recaps_user_week ON public.weekly_recaps(user_id, week_start DESC);

-- leaderboard_snapshots
CREATE TABLE public.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('global','group')),
  metric TEXT NOT NULL CHECK (metric IN ('streak','khatm_juz','dhikr','minutes')),
  period TEXT NOT NULL CHECK (period IN ('daily','weekly','all_time')),
  group_id UUID NULL REFERENCES public.khatm_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  score INT NOT NULL DEFAULT 0,
  rank INT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leaderboard_snapshots TO anon, authenticated;
GRANT ALL ON public.leaderboard_snapshots TO service_role;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public leaderboard read" ON public.leaderboard_snapshots
  FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX idx_lb_lookup ON public.leaderboard_snapshots(scope, metric, period, group_id, rank);

-- share_events
CREATE TABLE public.share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  ref_id TEXT,
  channel TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.share_events TO authenticated;
GRANT ALL ON public.share_events TO service_role;
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own share read" ON public.share_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own share insert" ON public.share_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_share_events_user ON public.share_events(user_id, created_at DESC);

-- RPC: compute leaderboard snapshot for a metric+period
CREATE OR REPLACE FUNCTION public.refresh_leaderboards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Global streak all_time
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

  -- Global khatm juz weekly
  DELETE FROM public.leaderboard_snapshots
    WHERE scope='global' AND metric='khatm_juz' AND period='weekly';
  INSERT INTO public.leaderboard_snapshots (scope, metric, period, user_id, display_name, score, rank)
  SELECT 'global','khatm_juz','weekly', c.claimed_by, p.display_name,
         COUNT(*)::int,
         ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC)
  FROM public.khatm_juz_claims c
  LEFT JOIN public.profiles p ON p.id = c.claimed_by
  WHERE c.completed_at >= date_trunc('week', now())
  GROUP BY c.claimed_by, p.display_name
  ORDER BY 6 DESC
  LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_leaderboards() FROM public;
GRANT EXECUTE ON FUNCTION public.refresh_leaderboards() TO service_role;

-- RPC: compute and upsert a user's weekly recap
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
  WHERE claimed_by = _user_id
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
REVOKE ALL ON FUNCTION public.compute_weekly_recap(UUID, DATE) FROM public;
GRANT EXECUTE ON FUNCTION public.compute_weekly_recap(UUID, DATE) TO authenticated, service_role;

-- Seed feature flags for batch 2
INSERT INTO public.feature_flags (key, enabled, rollout_percent, description)
VALUES
  ('viral.shareable_milestones', true, 100, 'Show share buttons on streak/khatm milestones'),
  ('viral.weekly_recap', true, 100, 'Show weekly recap card on Achievements'),
  ('viral.leaderboards', true, 100, 'Show global and group leaderboards'),
  ('viral.invite_hooks', true, 100, 'Prompt invites at high-intent moments')
ON CONFLICT (key) DO NOTHING;
