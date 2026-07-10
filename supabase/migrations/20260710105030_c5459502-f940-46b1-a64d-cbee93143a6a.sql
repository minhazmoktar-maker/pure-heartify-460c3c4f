
-- 1) dua_ameens: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view ameens" ON public.dua_ameens;

CREATE POLICY "View ameens on non-anonymous or own duas"
ON public.dua_ameens
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.dua_requests d
    WHERE d.id = dua_ameens.dua_id
      AND (d.is_anonymous = false OR d.user_id = auth.uid())
  )
);

-- 2) leaderboard_snapshots: hide user_id from anon
DROP POLICY IF EXISTS "public leaderboard read" ON public.leaderboard_snapshots;

CREATE POLICY "Authenticated leaderboard read"
ON public.leaderboard_snapshots
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.leaderboard_snapshots FROM anon;

CREATE OR REPLACE VIEW public.leaderboard_public
WITH (security_invoker = true) AS
SELECT id, scope, metric, period, group_id, display_name, score, rank, computed_at
FROM public.leaderboard_snapshots;

GRANT SELECT ON public.leaderboard_public TO anon, authenticated;
