
REVOKE ALL ON FUNCTION public.upsert_reciter(text, text, text, text, text, text, boolean, text, text, integer, text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_reciter_alias(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.backfill_reciter_alias_variants() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_alias_variants(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.upsert_reciter(text, text, text, text, text, text, boolean, text, text, integer, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_reciter_alias(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.backfill_reciter_alias_variants() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_alias_variants(text) TO service_role;
