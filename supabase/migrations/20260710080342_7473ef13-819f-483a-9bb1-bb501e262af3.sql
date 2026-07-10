
CREATE OR REPLACE FUNCTION public.get_public_team_streak(_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'invite_code', t.invite_code,
    'current_streak', t.current_streak,
    'longest_streak', t.longest_streak,
    'member_count', (SELECT count(*) FROM public.team_streak_members m WHERE m.team_id = t.id),
    'member_limit', t.member_limit,
    'created_at', t.created_at
  )
  FROM public.team_streaks t
  WHERE t.id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_team_streak(uuid) TO anon, authenticated;
