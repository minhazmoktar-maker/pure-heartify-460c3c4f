
REVOKE EXECUTE ON FUNCTION public.user_household_id(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_household_owner(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_household_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_household_owner(UUID, UUID) TO authenticated, service_role;
