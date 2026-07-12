
REVOKE EXECUTE ON FUNCTION public.seed_default_notification_prefs(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_default_notification_prefs(UUID) TO authenticated, service_role;
