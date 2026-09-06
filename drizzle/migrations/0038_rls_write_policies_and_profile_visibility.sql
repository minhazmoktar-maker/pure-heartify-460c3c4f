-- 1) creator_uploads: explicit least-privilege INSERT policy (owner, draft only).
DROP POLICY IF EXISTS creator_uploads_owner_insert_draft ON public.creator_uploads;
CREATE POLICY creator_uploads_owner_insert_draft
ON public.creator_uploads
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'draft'
  AND coalesce(visual_state, 'pending') <> 'clean'
);

-- 2) user_connections: explicit INSERT / UPDATE policies.
DROP POLICY IF EXISTS user_connections_requester_insert ON public.user_connections;
CREATE POLICY user_connections_requester_insert
ON public.user_connections
FOR INSERT
TO authenticated
WITH CHECK (
  requester_id = auth.uid()
  AND addressee_id <> auth.uid()
  AND status = 'pending'
);

DROP POLICY IF EXISTS user_connections_addressee_respond ON public.user_connections;
CREATE POLICY user_connections_addressee_respond
ON public.user_connections
FOR UPDATE
TO authenticated
USING (addressee_id = auth.uid() AND status = 'pending')
WITH CHECK (
  addressee_id = auth.uid()
  AND status IN ('accepted', 'declined')
);

-- 3) profiles: enforce the stored visibility settings in the public read path
--    (get_public_profile previously ignored discoverable / profile_visibility).
CREATE OR REPLACE FUNCTION public.get_public_profile(_handle text)
RETURNS TABLE (
  handle text,
  display_name text,
  avatar_url text,
  bio text,
  current_streak int,
  longest_streak int,
  badge_count int,
  referrals_redeemed int,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.handle,
    p.display_name,
    p.avatar_url,
    p.bio,
    CASE WHEN p.streak_visibility = 'everyone'
      THEN COALESCE(s.current_streak, 0) ELSE 0 END::int AS current_streak,
    CASE WHEN p.streak_visibility = 'everyone'
      THEN COALESCE(s.longest_streak, 0) ELSE 0 END::int AS longest_streak,
    COALESCE((SELECT count(*) FROM public.user_badges b WHERE b.user_id = p.user_id), 0)::int AS badge_count,
    COALESCE((SELECT count(*) FROM public.referrals r
              WHERE r.inviter_id = p.user_id AND r.status = 'redeemed'), 0)::int AS referrals_redeemed,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.streaks s ON s.user_id = p.user_id
  WHERE lower(p.handle) = lower(trim(_handle))
    AND COALESCE(p.discoverable, true) IS TRUE
    AND p.profile_visibility = 'everyone'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;