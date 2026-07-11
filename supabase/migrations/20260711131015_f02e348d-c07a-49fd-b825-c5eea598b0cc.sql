
-- Gate premium-only curated videos behind an active entitlement.

CREATE OR REPLACE FUNCTION public.has_active_entitlement(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entitlements e
    WHERE e.user_id = _user_id
      AND (e.expires_at IS NULL OR e.expires_at > now())
      AND (
        (to_jsonb(e) ? 'status'   AND (to_jsonb(e)->>'status')   IN ('active','trialing','grace')) OR
        (to_jsonb(e) ? 'is_active' AND (to_jsonb(e)->>'is_active')::boolean = true) OR
        (NOT (to_jsonb(e) ? 'status') AND NOT (to_jsonb(e) ? 'is_active'))
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_active_entitlement(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can view approved curated videos" ON public.curated_videos;
CREATE POLICY "Anyone can view approved curated videos"
ON public.curated_videos
FOR SELECT
USING (
  moderation_state IN ('approved'::moderation_state, 'auto_approved'::moderation_state)
  AND COALESCE(is_hidden, false) = false
  AND COALESCE(is_archived, false) = false
  AND (
    COALESCE(is_premium_only, false) = false
    OR (auth.uid() IS NOT NULL AND public.has_active_entitlement(auth.uid()))
  )
);
