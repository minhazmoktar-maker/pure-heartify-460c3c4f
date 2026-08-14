CREATE OR REPLACE FUNCTION public.viewer_has_active_entitlement()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND public.has_active_entitlement(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.viewer_has_active_entitlement() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.viewer_has_active_entitlement() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can view approved curated videos" ON public.curated_videos;
CREATE POLICY "Anyone can view approved curated videos"
ON public.curated_videos
FOR SELECT
USING (
  moderation_state = ANY (ARRAY['approved'::moderation_state, 'auto_approved'::moderation_state])
  AND COALESCE(is_hidden, false) = false
  AND COALESCE(is_archived, false) = false
  AND (COALESCE(is_premium_only, false) = false OR public.viewer_has_active_entitlement())
);
