
-- Configurable data retention for high-volume analytics tables.
CREATE TABLE IF NOT EXISTS public.retention_policies (
  table_name TEXT PRIMARY KEY,
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT ON public.retention_policies TO authenticated;
GRANT ALL ON public.retention_policies TO service_role;

ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view retention policies" ON public.retention_policies;
CREATE POLICY "Admins can view retention policies"
  ON public.retention_policies FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));

DROP POLICY IF EXISTS "Owners can manage retention policies" ON public.retention_policies;
CREATE POLICY "Owners can manage retention policies"
  ON public.retention_policies FOR ALL
  TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

-- Seed defaults (safe to re-run).
INSERT INTO public.retention_policies (table_name, retention_days) VALUES
  ('analytics_events', 90),
  ('search_queries', 180),
  ('recommendation_events', 90)
ON CONFLICT (table_name) DO NOTHING;

-- Purge function honoring the configured TTL.
CREATE OR REPLACE FUNCTION public.enforce_retention_policies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  removed BIGINT;
  totals jsonb := '{}'::jsonb;
BEGIN
  FOR r IN SELECT table_name, retention_days FROM public.retention_policies LOOP
    IF r.table_name = 'analytics_events' THEN
      DELETE FROM public.analytics_events WHERE created_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSIF r.table_name = 'search_queries' THEN
      DELETE FROM public.search_queries WHERE created_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSIF r.table_name = 'recommendation_events' THEN
      DELETE FROM public.recommendation_events WHERE created_at < now() - make_interval(days => r.retention_days);
      GET DIAGNOSTICS removed = ROW_COUNT;
    ELSE
      removed := 0;
    END IF;
    totals := totals || jsonb_build_object(r.table_name, removed);
  END LOOP;
  RETURN totals;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_retention_policies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_retention_policies() TO service_role;

-- Index support for retention deletes on the high-volume tables.
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON public.search_queries (created_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_created_at ON public.recommendation_events (created_at);
