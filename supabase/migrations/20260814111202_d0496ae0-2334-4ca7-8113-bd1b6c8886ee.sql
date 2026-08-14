-- Smoke-run the autonomous loop once so scheduling starts from a known-good state.
SELECT public.growth_controller_tick();
SELECT public.grow_topic_queries(60);
SELECT public.prune_topic_queries();
SELECT count(*) FROM public.next_topic_queries(16, 20000);