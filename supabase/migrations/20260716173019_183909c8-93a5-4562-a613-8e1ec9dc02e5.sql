GRANT EXECUTE ON FUNCTION public.has_active_entitlement(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_household_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_household_owner(uuid, uuid) TO authenticated;