-- Postgres grants EXECUTE to PUBLIC by default, so revoking from `anon` alone
-- leaves these callable without signing in. Revoke PUBLIC and re-grant to the
-- narrowest role that actually needs each function.

-- Personalized pools: only ever invoked with the service role from edge
-- functions, and they take an explicit _user_id (impersonation risk).
REVOKE ALL ON FUNCTION public.pool_for_you_v2(uuid, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pool_because_you_watched(uuid, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pool_beneficial_v1(uuid, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pool_continue_watching(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pool_for_you_v2(uuid, integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.pool_because_you_watched(uuid, integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.pool_beneficial_v1(uuid, integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.pool_continue_watching(uuid, integer) TO service_role, authenticated;

-- Partner API-key cosigning: server-side only.
REVOKE ALL ON FUNCTION public.institution_cosign(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.institution_cosign(text, text, text, text) TO service_role;

-- Writes and viewer identity: signed-in users only.
REVOKE ALL ON FUNCTION public.set_learning_step_progress(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_learning_step_progress(text, text, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_benefit_label(uuid, text, boolean, boolean, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_benefit_label(uuid, text, boolean, boolean, text, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.social_display_name(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.social_display_name(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.viewer_has_active_entitlement() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.viewer_has_active_entitlement() TO authenticated, service_role;