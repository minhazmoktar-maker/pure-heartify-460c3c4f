-- khatm_groups: anon read limited to non-identifying columns of public groups
REVOKE ALL ON public.khatm_groups FROM anon;
GRANT SELECT (id, name, description, invite_code, intention, target_completion_at, completed_at, is_public, created_at, updated_at) ON public.khatm_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.khatm_groups TO authenticated;
GRANT ALL ON public.khatm_groups TO service_role;

-- attributions: anon may only insert unowned first-touch rows
DROP POLICY IF EXISTS "attribution first-touch insert" ON public.attributions;
CREATE POLICY "attribution anon insert" ON public.attributions
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "attribution user insert" ON public.attributions
  FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
REVOKE ALL ON public.attributions FROM anon;
GRANT INSERT ON public.attributions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.attributions TO authenticated;
GRANT ALL ON public.attributions TO service_role;

-- gift_codes: no client write path; redemption stays service-role only
REVOKE ALL ON public.gift_codes FROM anon;
REVOKE ALL ON public.gift_codes FROM authenticated;
GRANT SELECT ON public.gift_codes TO authenticated;
GRANT ALL ON public.gift_codes TO service_role;