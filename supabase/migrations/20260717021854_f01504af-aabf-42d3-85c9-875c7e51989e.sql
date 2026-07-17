
REVOKE ALL ON FUNCTION public.on_channel_sample_recorded() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_moderation_learned_signals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.on_channel_sample_recorded() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_moderation_learned_signals() TO service_role;
