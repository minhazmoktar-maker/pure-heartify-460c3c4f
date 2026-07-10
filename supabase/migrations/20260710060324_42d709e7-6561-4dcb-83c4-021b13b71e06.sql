
-- 1) Handle column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_key
  ON public.profiles (lower(handle))
  WHERE handle IS NOT NULL;

-- 2) Claim / rename handle (self-only). Enforces format.
CREATE OR REPLACE FUNCTION public.set_profile_handle(_handle text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  clean text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  clean := lower(trim(_handle));
  IF clean !~ '^[a-z0-9_]{3,24}$' THEN
    RAISE EXCEPTION 'invalid_handle';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(handle) = clean AND user_id <> uid
  ) THEN
    RAISE EXCEPTION 'handle_taken';
  END IF;

  INSERT INTO public.profiles (user_id, handle)
  VALUES (uid, clean)
  ON CONFLICT (user_id) DO UPDATE SET handle = EXCLUDED.handle, updated_at = now();

  RETURN clean;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_profile_handle(text) TO authenticated;

-- 3) Public profile snapshot (no auth required).
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
    COALESCE(s.current_streak, 0)::int    AS current_streak,
    COALESCE(s.longest_streak, 0)::int    AS longest_streak,
    COALESCE((SELECT count(*) FROM public.user_badges b WHERE b.user_id = p.user_id), 0)::int AS badge_count,
    COALESCE((SELECT count(*) FROM public.referrals r
              WHERE r.inviter_id = p.user_id AND r.status = 'redeemed'), 0)::int AS referrals_redeemed,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.streaks s ON s.user_id = p.user_id
  WHERE lower(p.handle) = lower(trim(_handle))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;
