CREATE OR REPLACE FUNCTION public.enforce_retention_policies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  removed BIGINT;
  totals jsonb := '{}'::jsonb;
BEGIN
  FOR r IN SELECT table_name, retention_days FROM public.retention_policies LOOP
    removed := 0;
    IF r.table_name = 'analytics_events' THEN
      DELETE FROM public.analytics_events WHERE created_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSIF r.table_name = 'search_queries' THEN
      DELETE FROM public.search_queries WHERE created_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSIF r.table_name = 'recommendation_events' THEN
      DELETE FROM public.recommendation_events WHERE created_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSIF r.table_name = 'moderation_log' THEN
      DELETE FROM public.moderation_log WHERE created_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSIF r.table_name = 'moderation_decisions' THEN
      DELETE FROM public.moderation_decisions WHERE created_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSIF r.table_name = 'channel_moderation_decisions' THEN
      DELETE FROM public.channel_moderation_decisions WHERE created_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSIF r.table_name = 'ingestion_log' THEN
      DELETE FROM public.ingestion_log WHERE created_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSIF r.table_name = 'bn_ingest_verifications' THEN
      DELETE FROM public.bn_ingest_verifications WHERE created_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSIF r.table_name = 'ops_metrics' THEN
      DELETE FROM public.ops_metrics WHERE ts < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSIF r.table_name = 'lane_events' THEN
      DELETE FROM public.lane_events WHERE occurred_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    END IF;
    totals := totals || jsonb_build_object(r.table_name, removed);
  END LOOP;
  RETURN totals;
END;
$function$;

-- created_at indexes so each nightly purge is a cheap range scan, not a seq scan
CREATE INDEX IF NOT EXISTS idx_moderation_decisions_created ON public.moderation_decisions (created_at);
CREATE INDEX IF NOT EXISTS idx_channel_mod_decisions_created ON public.channel_moderation_decisions (created_at);
CREATE INDEX IF NOT EXISTS idx_ingestion_log_created ON public.ingestion_log (created_at);
CREATE INDEX IF NOT EXISTS idx_bn_ingest_verifications_created ON public.bn_ingest_verifications (created_at);