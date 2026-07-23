
-- Revoke EXECUTE from anon on trigger functions (never meant to be RPC-callable)
REVOKE EXECUTE ON FUNCTION public._enforce_no_female_no_music() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_female_content_block() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_dhikr_circles_counters() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_streak_stats() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_team_streak_stats() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_video_comment_counters() FROM anon, PUBLIC;

-- Revoke EXECUTE from anon on admin/auth-only helpers
REVOKE EXECUTE ON FUNCTION public._run_channel_id_backfill(integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rec_feed_health(integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rec_retriever_health() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_trust_stats() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_recommendation_event(text, text, uuid, real, jsonb, jsonb, text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_listen_seconds(integer) FROM anon, PUBLIC;

-- Ensure authenticated role retains access where appropriate
GRANT EXECUTE ON FUNCTION public.log_recommendation_event(text, text, uuid, real, jsonb, jsonb, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_listen_seconds(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rec_feed_health(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rec_retriever_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trust_stats() TO authenticated;
