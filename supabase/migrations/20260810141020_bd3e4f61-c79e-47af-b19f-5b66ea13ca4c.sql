-- 1) Truthful system reporting -------------------------------------------------
CREATE OR REPLACE FUNCTION public.pipeline_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'corpus', jsonb_build_object(
      'total_videos', (SELECT count(*) FROM curated_videos),
      'approved', (SELECT count(*) FROM curated_videos WHERE moderation_state IN ('approved','auto_approved') AND NOT is_archived),
      'pending_review', (SELECT count(*) FROM curated_videos WHERE moderation_state::text LIKE '%review%'),
      'rejected', (SELECT count(*) FROM curated_videos WHERE moderation_state = 'rejected'),
      'archived', (SELECT count(*) FROM curated_videos WHERE is_archived),
      'orphan_no_channel_id', (SELECT count(*) FROM curated_videos WHERE channel_id IS NULL),
      'distinct_channel_ids', (SELECT count(DISTINCT channel_id) FROM curated_videos WHERE channel_id IS NOT NULL),
      'distinct_channel_titles', (SELECT count(DISTINCT channel_title) FROM curated_videos),
      'added_today', (SELECT count(*) FROM curated_videos WHERE ingested_at > now() - interval '1 day'),
      'added_7d', (SELECT count(*) FROM curated_videos WHERE ingested_at > now() - interval '7 days'),
      'added_30d', (SELECT count(*) FROM curated_videos WHERE ingested_at > now() - interval '30 days'),
      'last_ingested_at', (SELECT max(ingested_at) FROM curated_videos)
    ),
    'channels', jsonb_build_object(
      'approved_channels', (SELECT count(*) FROM approved_channels WHERE status IS DISTINCT FROM 'removed'),
      'candidates_total', (SELECT count(*) FROM channel_candidates),
      'candidates_pending', (SELECT count(*) FROM channel_candidates WHERE status = 'pending'),
      'candidates_added_7d', (SELECT count(*) FROM channel_candidates WHERE created_at > now() - interval '7 days'),
      'last_candidate_at', (SELECT max(created_at) FROM channel_candidates),
      'last_approved_channel_at', (SELECT max(created_at) FROM approved_channels)
    ),
    'discovery', jsonb_build_object(
      'topic_queries_total', (SELECT count(*) FROM discovery_topic_queries),
      'topic_queries_run', (SELECT count(*) FROM discovery_topic_queries WHERE last_run_at IS NOT NULL),
      'last_job_at', (SELECT max(created_at) FROM discovery_jobs),
      'jobs_running', (SELECT count(*) FROM discovery_jobs WHERE status IN ('queued','running')),
      'jobs_failed_7d', (SELECT count(*) FROM discovery_jobs WHERE status = 'failed' AND created_at > now() - interval '7 days')
    ),
    'reliability', jsonb_build_object(
      'dlq_7d', (SELECT count(*) FROM dead_letter_queue WHERE created_at > now() - interval '7 days'),
      'open_alerts', (SELECT count(*) FROM production_alerts WHERE resolved_at IS NULL),
      'cron_jobs_active', (SELECT count(*) FROM cron.job WHERE active)
    )
  ) INTO v;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.pipeline_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pipeline_health() TO authenticated, service_role;

-- 2) Drain the review backlog for already-approved channels --------------------
CREATE OR REPLACE FUNCTION public.promote_trusted_pending_videos(_limit integer DEFAULT 5000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '5min'
AS $$
DECLARE
  v_pattern text := public._inappropriate_pattern();
  v_promoted int := 0;
BEGIN
  WITH cand AS (
    SELECT cv.id
    FROM public.curated_videos cv
    JOIN public.approved_channels ac
      ON ac.youtube_channel_id = cv.channel_id
     AND ac.status IS DISTINCT FROM 'removed'
    WHERE cv.moderation_state::text LIKE '%review%'
      AND cv.is_archived = false
      AND lower(COALESCE(cv.title,'')) !~* v_pattern
      AND lower(COALESCE(cv.channel_title,'')) !~* v_pattern
      AND NOT EXISTS (
        SELECT 1 FROM public.blocked_creators bc
        WHERE lower(COALESCE(cv.channel_title,'') || ' ' || COALESCE(cv.title,''))
              LIKE '%' || lower(bc.pattern) || '%'
      )
    LIMIT GREATEST(1, LEAST(_limit, 20000))
  ), upd AS (
    UPDATE public.curated_videos cv
    SET moderation_state = 'auto_approved',
        moderation_stage = 'channel_reputation',
        moderation_provider = COALESCE(moderation_provider, 'channel_reputation_promotion'),
        moderation_confidence = LEAST(COALESCE(moderation_confidence, 0), 85),
        moderation_updated_at = now(),
        is_trusted_channel = true,
        moderation_reasoning = COALESCE(moderation_reasoning,'')
          || ' | promoted: approved channel + strict metadata policy pass'
    FROM cand
    WHERE cv.id = cand.id
    RETURNING 1
  )
  SELECT count(*) INTO v_promoted FROM upd;

  BEGIN
    INSERT INTO public.ops_metrics (metric, value, tags)
    VALUES ('pending_promotion', v_promoted, jsonb_build_object('ran_at', now()));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('promoted', v_promoted);
END;
$$;

REVOKE ALL ON FUNCTION public.promote_trusted_pending_videos(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_trusted_pending_videos(integer) TO service_role;

-- 3) Watchdog: never let the pipeline die silently ------------------------------
CREATE OR REPLACE FUNCTION public.check_pipeline_watchdog()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_alerts int := 0;

  PROCEDURE_PLACEHOLDER boolean;
  v_last_candidate timestamptz;
  v_last_ingest timestamptz;
  v_pending_cand int;
  v_orphans int;
BEGIN
  SELECT max(created_at) INTO v_last_candidate FROM channel_candidates;
  SELECT max(ingested_at) INTO v_last_ingest FROM curated_videos;
  SELECT count(*) INTO v_pending_cand FROM channel_candidates WHERE status = 'pending';
  SELECT count(*) INTO v_orphans FROM curated_videos WHERE channel_id IS NULL;

  IF v_last_candidate IS NULL OR v_last_candidate < now() - interval '12 hours' THEN
    INSERT INTO public.production_alerts (kind, severity, message, context)
    SELECT 'pipeline_discovery_stalled', 'high',
           'Channel discovery has produced no new candidates in over 12 hours',
           jsonb_build_object('last_candidate_at', v_last_candidate)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'pipeline_discovery_stalled' AND resolved_at IS NULL
        AND created_at > now() - interval '12 hours'
    );
    v_alerts := v_alerts + 1;
  END IF;

  IF v_last_ingest IS NULL OR v_last_ingest < now() - interval '3 hours' THEN
    INSERT INTO public.production_alerts (kind, severity, message, context)
    SELECT 'pipeline_ingestion_stalled', 'high',
           'Video ingestion has not written a new row in over 3 hours',
           jsonb_build_object('last_ingested_at', v_last_ingest)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'pipeline_ingestion_stalled' AND resolved_at IS NULL
        AND created_at > now() - interval '3 hours'
    );
    v_alerts := v_alerts + 1;
  END IF;

  IF v_pending_cand > 750 THEN
    INSERT INTO public.production_alerts (kind, severity, message, context)
    SELECT 'pipeline_candidate_backlog', 'medium',
           'Channel candidate review queue is unusually large',
           jsonb_build_object('pending_candidates', v_pending_cand)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'pipeline_candidate_backlog' AND resolved_at IS NULL
        AND created_at > now() - interval '24 hours'
    );
    v_alerts := v_alerts + 1;
  END IF;

  IF v_orphans > 50000 THEN
    INSERT INTO public.production_alerts (kind, severity, message, context)
    SELECT 'pipeline_orphan_videos', 'medium',
           'Large number of videos have no resolved channel id (invisible to feeds and diversity caps)',
           jsonb_build_object('orphan_videos', v_orphans)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'pipeline_orphan_videos' AND resolved_at IS NULL
        AND created_at > now() - interval '24 hours'
    );
    v_alerts := v_alerts + 1;
  END IF;

  BEGIN
    INSERT INTO public.ops_metrics (metric, value, tags)
    VALUES ('pipeline_watchdog', v_alerts, jsonb_build_object(
      'pending_candidates', v_pending_cand,
      'orphan_videos', v_orphans,
      'last_candidate_at', v_last_candidate,
      'last_ingested_at', v_last_ingest));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('alerts_raised', v_alerts, 'pending_candidates', v_pending_cand, 'orphan_videos', v_orphans);
END;
$$;

REVOKE ALL ON FUNCTION public.check_pipeline_watchdog() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_pipeline_watchdog() TO service_role;