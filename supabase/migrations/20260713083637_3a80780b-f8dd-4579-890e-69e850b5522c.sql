
-- Fix recursive RLS policies by replacing self-referential subqueries with SECURITY DEFINER helpers

CREATE OR REPLACE FUNCTION public.is_team_streak_member(_team_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_streak_members
    WHERE team_id = _team_id AND user_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_team_streak_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_streak_member(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_dhikr_circle_member(_circle_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dhikr_circle_members
    WHERE circle_id = _circle_id AND user_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_dhikr_circle_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_dhikr_circle_member(uuid, uuid) TO authenticated, service_role;

-- Replace recursive policies
DROP POLICY IF EXISTS "Members view co-members" ON public.team_streak_members;
CREATE POLICY "Members view co-members"
ON public.team_streak_members
FOR SELECT
TO authenticated
USING (public.is_team_streak_member(team_id, auth.uid()));

DROP POLICY IF EXISTS "Members view co-members of joined circles" ON public.dhikr_circle_members;
CREATE POLICY "Members view co-members of joined circles"
ON public.dhikr_circle_members
FOR SELECT
TO authenticated
USING (public.is_dhikr_circle_member(circle_id, auth.uid()));
