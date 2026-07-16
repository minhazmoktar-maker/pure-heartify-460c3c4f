-- Allow anon to evaluate helpers used inside public-facing RLS policies.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_active_entitlement(uuid) TO anon;

-- Public transparency page
GRANT EXECUTE ON FUNCTION public.get_transparency_appeals() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_transparency_report() TO anon, authenticated;