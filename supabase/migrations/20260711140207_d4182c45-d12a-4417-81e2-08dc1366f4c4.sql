
-- 1) dua_anon_ameens: revoke public read of fingerprints
DROP POLICY IF EXISTS "Anyone can view anon ameens" ON public.dua_anon_ameens;
REVOKE SELECT ON public.dua_anon_ameens FROM anon, authenticated;
-- No SELECT policy = no client reads. Triggers still maintain dua_requests.ameen_count,
-- and add_anon_ameen() (SECURITY DEFINER) still returns the total.

-- 2) leaderboard_snapshots: scope group rows to members only
CREATE OR REPLACE FUNCTION public.is_khatm_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.khatm_group_members
    WHERE group_id = _group_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_streak_member(_team_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_streak_members
    WHERE team_id = _team_id AND user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "Authenticated leaderboard read" ON public.leaderboard_snapshots;

CREATE POLICY "Leaderboard read scoped"
ON public.leaderboard_snapshots
FOR SELECT
TO authenticated
USING (
  scope = 'global'
  OR (
    scope = 'group'
    AND group_id IS NOT NULL
    AND (
      public.is_khatm_member(group_id, auth.uid())
      OR public.is_team_streak_member(group_id, auth.uid())
    )
  )
);
