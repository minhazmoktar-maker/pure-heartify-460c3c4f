
-- 1) has_min_role: reject anonymous callers unless tier explicitly 'anon'
CREATE OR REPLACE FUNCTION public.has_min_role(_user_id uuid, _min_tier text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  effective_rank INT := 0;
  required_rank INT;
  tier TEXT := lower(coalesce(_min_tier, ''));
BEGIN
  required_rank := CASE tier
    WHEN 'anon'      THEN 0
    WHEN 'owner'     THEN 4
    WHEN 'admin'     THEN 3
    WHEN 'moderator' THEN 2
    ELSE 1  -- 'authenticated' / default
  END;

  -- Anonymous callers never satisfy any tier above 'anon'.
  IF _user_id IS NULL THEN
    RETURN tier = 'anon';
  END IF;

  IF public.is_owner(_user_id) THEN
    effective_rank := 4;
  ELSIF public.has_role(_user_id, 'admin'::app_role) THEN
    effective_rank := 3;
  ELSE
    effective_rank := 1; -- signed-in user
  END IF;

  RETURN effective_rank >= required_rank;
END;
$function$;

-- 2) variant_assignments: remove overly permissive anon SELECT (all anon rows readable).
-- Anonymous assignment reads must go through an edge function that verifies anon_key.
DROP POLICY IF EXISTS "assignments read own anon" ON public.variant_assignments;

-- 3) comment_reactions: scope SELECT to reactions on comments the caller can see,
-- plus the caller's own reactions. Drop the wide "USING (true)" policy.
DROP POLICY IF EXISTS "reactions read authed" ON public.comment_reactions;

CREATE POLICY "reactions read own"
ON public.comment_reactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "reactions read on visible comments"
ON public.comment_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.video_comments c
    WHERE c.id = comment_reactions.comment_id
      AND c.status = 'visible'
      AND c.deleted_at IS NULL
  )
);
