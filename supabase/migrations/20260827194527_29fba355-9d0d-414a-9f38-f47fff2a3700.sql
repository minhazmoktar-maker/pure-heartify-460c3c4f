REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_entitlement(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_premium(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_entitlement(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid) TO authenticated, service_role;