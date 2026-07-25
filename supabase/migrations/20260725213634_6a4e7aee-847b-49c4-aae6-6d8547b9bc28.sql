
-- 1. Fix SECURITY DEFINER view (linter ERROR 0010)
ALTER VIEW public.channel_discovery_progress SET (security_invoker = true);

-- 2. Revoke anon/public EXECUTE on personalization / write functions.
-- Keep authenticated + service_role EXECUTE intact.
REVOKE EXECUTE ON FUNCTION public.log_feed_impressions(text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pool_because_you_watched(uuid, integer, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pool_continue_watching(uuid, integer) FROM PUBLIC, anon;

-- Reaffirm authenticated + service_role EXECUTE for these 3 (idempotent, safe).
GRANT EXECUTE ON FUNCTION public.log_feed_impressions(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pool_because_you_watched(uuid, integer, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pool_continue_watching(uuid, integer) TO authenticated, service_role;
