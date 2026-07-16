
-- Discovery quota allocations -----------------------------------------------
CREATE TABLE public.discovery_quota_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL UNIQUE,
  share_percent NUMERIC(5,2) NOT NULL CHECK (share_percent >= 0 AND share_percent <= 100),
  enabled BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discovery_quota_allocations TO authenticated;
GRANT ALL ON public.discovery_quota_allocations TO service_role;
ALTER TABLE public.discovery_quota_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view allocations" ON public.discovery_quota_allocations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "owners manage allocations" ON public.discovery_quota_allocations
  FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

INSERT INTO public.discovery_quota_allocations (source, share_percent, notes) VALUES
  ('topic_search', 50, 'Highest-signal discovery: multilingual topic queries'),
  ('playlist_collab', 25, 'Playlist collaborator graph from approved seeds'),
  ('description_mention', 25, 'Channel handles/UC IDs mentioned in seed descriptions');

-- Dead letter queue ---------------------------------------------------------
CREATE TABLE public.dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.dead_letter_queue TO authenticated;
GRANT ALL ON public.dead_letter_queue TO service_role;
ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view dlq" ON public.dead_letter_queue
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "owners resolve dlq" ON public.dead_letter_queue
  FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));
CREATE INDEX idx_dlq_unresolved ON public.dead_letter_queue (created_at DESC) WHERE resolved_at IS NULL;

-- Ops metrics ---------------------------------------------------------------
CREATE TABLE public.ops_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  tags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ops_metrics TO authenticated;
GRANT ALL ON public.ops_metrics TO service_role;
ALTER TABLE public.ops_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read metrics" ON public.ops_metrics
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));
CREATE INDEX idx_ops_metrics_metric_ts ON public.ops_metrics (metric, ts DESC);
CREATE INDEX idx_ops_metrics_ts ON public.ops_metrics (ts DESC);

-- Stuck-job reaper ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reap_stuck_discovery_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reaped INTEGER;
BEGIN
  WITH stuck AS (
    UPDATE public.discovery_jobs
       SET status = 'failed',
           finished_at = now(),
           error = COALESCE(error, 'stuck: heartbeat timeout')
     WHERE status IN ('queued','running')
       AND COALESCE(heartbeat_at, started_at, created_at) < now() - interval '10 minutes'
     RETURNING id, mode, quota_used, seeds_processed
  )
  INSERT INTO public.dead_letter_queue (job_type, payload, error)
  SELECT 'discovery_job', to_jsonb(stuck), 'stuck: heartbeat timeout'
    FROM stuck;
  GET DIAGNOSTICS reaped = ROW_COUNT;
  INSERT INTO public.ops_metrics (metric, value, tags)
    VALUES ('reliability.jobs.reaped', reaped, jsonb_build_object('kind','discovery'));
  RETURN reaped;
END;
$$;
REVOKE ALL ON FUNCTION public.reap_stuck_discovery_jobs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reap_stuck_discovery_jobs() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('reap-stuck-discovery-jobs');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule(
  'reap-stuck-discovery-jobs',
  '*/5 * * * *',
  $$SELECT public.reap_stuck_discovery_jobs();$$
);

-- Ops dashboard snapshot ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ops_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'jobs', (
      SELECT jsonb_build_object(
        'active', COUNT(*) FILTER (WHERE status IN ('queued','running')),
        'succeeded_24h', COUNT(*) FILTER (WHERE status='succeeded' AND finished_at > now() - interval '24 hours'),
        'failed_24h', COUNT(*) FILTER (WHERE status IN ('failed','timed_out') AND finished_at > now() - interval '24 hours'),
        'cancelled_24h', COUNT(*) FILTER (WHERE status='cancelled' AND finished_at > now() - interval '24 hours'),
        'last_10', COALESCE((SELECT jsonb_agg(row_to_json(j)) FROM (
          SELECT id, status, mode, quota_used, seeds_processed, enqueued_count, api_failures,
                 created_at, started_at, finished_at, error
          FROM public.discovery_jobs
          ORDER BY created_at DESC LIMIT 10
        ) j), '[]'::jsonb)
      )
      FROM public.discovery_jobs
    ),
    'quota', (
      SELECT jsonb_build_object(
        'today_units', COALESCE(SUM(units_used),0),
        'per_api', COALESCE(jsonb_object_agg(api_name, units_used) FILTER (WHERE api_name IS NOT NULL), '{}'::jsonb)
      )
      FROM public.discovery_quota_ledger
      WHERE day = CURRENT_DATE
    ),
    'allocations', COALESCE((SELECT jsonb_agg(row_to_json(a)) FROM (
      SELECT source, share_percent, enabled, updated_at
      FROM public.discovery_quota_allocations
      ORDER BY share_percent DESC
    ) a), '[]'::jsonb),
    'candidates', (
      SELECT jsonb_build_object(
        'pending', COUNT(*) FILTER (WHERE status='pending'),
        'approved_24h', COUNT(*) FILTER (WHERE status='approved' AND updated_at > now() - interval '24 hours'),
        'rejected_24h', COUNT(*) FILTER (WHERE status='rejected' AND updated_at > now() - interval '24 hours')
      )
      FROM public.channel_candidates
    ),
    'moderation', (
      SELECT jsonb_build_object(
        'pending_reports', COUNT(*) FILTER (WHERE status='pending'),
        'resolved_24h',   COUNT(*) FILTER (WHERE status IN ('resolved','dismissed') AND updated_at > now() - interval '24 hours')
      )
      FROM public.video_reports
    ),
    'alerts_open', (
      SELECT COALESCE(COUNT(*),0) FROM public.production_alerts WHERE resolved_at IS NULL
    ),
    'dlq_open', (
      SELECT COALESCE(COUNT(*),0) FROM public.dead_letter_queue WHERE resolved_at IS NULL
    ),
    'users', (
      SELECT jsonb_build_object(
        'dau', (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events WHERE created_at > now() - interval '24 hours' AND user_id IS NOT NULL),
        'wau', (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events WHERE created_at > now() - interval '7 days' AND user_id IS NOT NULL)
      )
    ),
    'metrics_recent', COALESCE((SELECT jsonb_agg(row_to_json(m)) FROM (
      SELECT metric, value, tags, ts FROM public.ops_metrics
      WHERE ts > now() - interval '24 hours'
      ORDER BY ts DESC LIMIT 200
    ) m), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_ops_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ops_dashboard() TO authenticated;

-- Ops alerts checker --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_ops_alerts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  used BIGINT;
  cap  INTEGER := 4000;
  pend BIGINT;
  dlq  BIGINT;
BEGIN
  SELECT COALESCE(SUM(units_used),0) INTO used
    FROM public.discovery_quota_ledger
   WHERE day = CURRENT_DATE AND api_name = 'youtube_v3';

  IF used >= cap * 0.9 THEN
    INSERT INTO public.production_alerts (kind, severity, message, context)
    SELECT 'quota_near_cap','warn',
           'YouTube discovery quota at ' || round(used::numeric*100/cap,1) || '% of daily cap',
           jsonb_build_object('used',used,'cap',cap)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
       WHERE kind='quota_near_cap' AND created_at > now() - interval '6 hours' AND resolved_at IS NULL
    );
  END IF;

  SELECT COUNT(*) INTO pend FROM public.channel_candidates WHERE status='pending';
  IF pend >= 500 THEN
    INSERT INTO public.production_alerts (kind, severity, message, context)
    SELECT 'discovery_backlog','warn','Discovery candidate backlog high: ' || pend,
           jsonb_build_object('pending',pend)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
       WHERE kind='discovery_backlog' AND created_at > now() - interval '12 hours' AND resolved_at IS NULL
    );
  END IF;

  SELECT COUNT(*) INTO dlq FROM public.dead_letter_queue WHERE resolved_at IS NULL;
  IF dlq >= 20 THEN
    INSERT INTO public.production_alerts (kind, severity, message, context)
    SELECT 'dlq_growth','error','Dead letter queue has ' || dlq || ' unresolved entries',
           jsonb_build_object('open',dlq)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
       WHERE kind='dlq_growth' AND created_at > now() - interval '6 hours' AND resolved_at IS NULL
    );
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.check_ops_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ops_alerts() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('check-ops-alerts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule(
  'check-ops-alerts',
  '*/10 * * * *',
  $$SELECT public.check_ops_alerts();$$
);
