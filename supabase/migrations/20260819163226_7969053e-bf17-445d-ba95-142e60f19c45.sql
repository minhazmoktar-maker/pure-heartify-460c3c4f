CREATE TABLE IF NOT EXISTS public.function_metrics (
  id BIGSERIAL PRIMARY KEY,
  fn_name TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  ok BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  release TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.function_metrics TO authenticated;
GRANT ALL ON public.function_metrics TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.function_metrics_id_seq TO service_role;

ALTER TABLE public.function_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read function metrics" ON public.function_metrics;
CREATE POLICY "Admins read function metrics"
  ON public.function_metrics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS function_metrics_fn_time_idx
  ON public.function_metrics (fn_name, created_at DESC);
CREATE INDEX IF NOT EXISTS function_metrics_errors_idx
  ON public.function_metrics (created_at DESC) WHERE ok = FALSE;

CREATE OR REPLACE FUNCTION public.function_health(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  fn_name TEXT,
  requests BIGINT,
  errors BIGINT,
  error_rate NUMERIC,
  p50_ms NUMERIC,
  p95_ms NUMERIC,
  max_ms INTEGER,
  last_seen TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  SELECT
    m.fn_name,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE NOT m.ok)::BIGINT,
    ROUND((COUNT(*) FILTER (WHERE NOT m.ok))::NUMERIC / GREATEST(COUNT(*), 1), 4),
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.duration_ms)::NUMERIC, 0),
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.duration_ms)::NUMERIC, 0),
    MAX(m.duration_ms),
    MAX(m.created_at)
  FROM public.function_metrics m
  WHERE m.created_at > now() - make_interval(hours => GREATEST(p_hours, 1))
  GROUP BY m.fn_name
  ORDER BY 2 DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.function_health(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.function_health(INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.function_health(INTEGER) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.purge_function_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_deleted INTEGER;
BEGIN
  DELETE FROM public.function_metrics WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_function_metrics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_function_metrics() FROM anon;
REVOKE ALL ON FUNCTION public.purge_function_metrics() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_function_metrics() TO service_role;