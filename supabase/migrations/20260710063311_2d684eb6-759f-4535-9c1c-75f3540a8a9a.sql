
DROP POLICY IF EXISTS "Members view co-members" ON public.team_streak_members;

CREATE POLICY "Members view co-members"
  ON public.team_streak_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_streak_members m2
      WHERE m2.team_id = team_streak_members.team_id
        AND m2.user_id = auth.uid()
    )
  );
