-- 1. Segment + trace columns
ALTER TABLE public.feed_diversity_metrics
  ADD COLUMN IF NOT EXISTS ui_language text,
  ADD COLUMN IF NOT EXISTS device_class text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS cold_start_strategy text,
  ADD COLUMN IF NOT EXISTS config_version text,
  ADD COLUMN IF NOT EXISTS trace jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS feed_diversity_metrics_user_created_idx
  ON public.feed_diversity_metrics (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feed_diversity_metrics_created_idx
  ON public.feed_diversity_metrics (created_at DESC);

-- 2. Filtered dashboard
CREATE OR REPLACE FUNCTION public.feed_diversity_dashboard_filtered(
  _hours integer DEFAULT 24,
  _cohort_id uuid DEFAULT NULL,
  _min_diversity integer DEFAULT NULL,
  _max_diversity integer DEFAULT NULL,
  _language text DEFAULT NULL,
  _surface text DEFAULT NULL,
  _variant text DEFAULT NULL,
  _device_class text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _since timestamptz := now() - make_interval(hours => greatest(1, least(720, coalesce(_hours, 24))));
  _out jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH base AS (
    SELECT m.*
    FROM public.feed_diversity_metrics m
    WHERE m.created_at >= _since
      AND (_surface IS NULL OR m.surface = _surface)
      AND (_variant IS NULL OR m.variant = _variant)
      AND (_device_class IS NULL OR m.device_class = _device_class)
      AND (_language IS NULL OR m.ui_language = _language)
      AND (_min_diversity IS NULL OR coalesce(m.diversity_level, 50) >= _min_diversity)
      AND (_max_diversity IS NULL OR coalesce(m.diversity_level, 50) <= _max_diversity)
      AND (
        _cohort_id IS NULL OR EXISTS (
          SELECT 1 FROM public.user_cohort_members c
          WHERE c.cohort_id = _cohort_id AND c.user_id = m.user_id
        )
      )
  ),
  overall AS (
    SELECT jsonb_build_object(
      'requests', count(*),
      'users', count(DISTINCT user_id),
      'avg_items', round(coalesce(avg(item_count), 0)::numeric, 2),
      'duplicate_rate', round((count(*) FILTER (WHERE duplicate_count > 0))::numeric / greatest(count(*), 1), 4),
      'cold_start_rate', round((count(*) FILTER (WHERE cold_start))::numeric / greatest(count(*), 1), 4),
      'avg_distinct_channels', round(coalesce(avg(distinct_channels), 0)::numeric, 2),
      'avg_distinct_categories', round(coalesce(avg(distinct_categories), 0)::numeric, 2),
      'avg_distinct_languages', round(coalesce(avg(distinct_languages), 0)::numeric, 2),
      'avg_fresh_share', round(coalesce(avg(fresh_share), 0)::numeric, 3),
      'avg_self_overlap', round(coalesce(avg(self_overlap), 0)::numeric, 4),
      'p50_took_ms', coalesce(percentile_disc(0.5) WITHIN GROUP (ORDER BY took_ms), 0),
      'p95_took_ms', coalesce(percentile_disc(0.95) WITHIN GROUP (ORDER BY took_ms), 0),
      'guarantee_pass_rate', round(
        (count(*) FILTER (WHERE NOT (guarantees::text LIKE '%false%')))::numeric / greatest(count(*), 1), 4)
    ) AS j FROM base
  ),
  by_variant AS (
    SELECT coalesce(jsonb_agg(x ORDER BY x->>'key'), '[]'::jsonb) AS j FROM (
      SELECT jsonb_build_object(
        'key', variant,
        'requests', count(*),
        'users', count(DISTINCT user_id),
        'avg_distinct_channels', round(coalesce(avg(distinct_channels), 0)::numeric, 2),
        'avg_self_overlap', round(coalesce(avg(self_overlap), 0)::numeric, 4),
        'avg_fresh_share', round(coalesce(avg(fresh_share), 0)::numeric, 3),
        'p95_took_ms', coalesce(percentile_disc(0.95) WITHIN GROUP (ORDER BY took_ms), 0)
      ) AS x FROM base GROUP BY variant
    ) s
  ),
  by_surface AS (
    SELECT coalesce(jsonb_agg(x ORDER BY x->>'key'), '[]'::jsonb) AS j FROM (
      SELECT jsonb_build_object(
        'key', surface,
        'requests', count(*),
        'avg_items', round(coalesce(avg(item_count), 0)::numeric, 2),
        'avg_distinct_channels', round(coalesce(avg(distinct_channels), 0)::numeric, 2),
        'guarantee_pass_rate', round(
          (count(*) FILTER (WHERE NOT (guarantees::text LIKE '%false%')))::numeric / greatest(count(*), 1), 4)
      ) AS x FROM base GROUP BY surface
    ) s
  ),
  by_language AS (
    SELECT coalesce(jsonb_agg(x ORDER BY x->>'key'), '[]'::jsonb) AS j FROM (
      SELECT jsonb_build_object(
        'key', coalesce(ui_language, 'unknown'),
        'requests', count(*),
        'users', count(DISTINCT user_id),
        'avg_distinct_languages', round(coalesce(avg(distinct_languages), 0)::numeric, 2),
        'avg_self_overlap', round(coalesce(avg(self_overlap), 0)::numeric, 4)
      ) AS x FROM base GROUP BY coalesce(ui_language, 'unknown')
    ) s
  ),
  by_device AS (
    SELECT coalesce(jsonb_agg(x ORDER BY x->>'key'), '[]'::jsonb) AS j FROM (
      SELECT jsonb_build_object(
        'key', coalesce(device_class, 'unknown'),
        'requests', count(*),
        'avg_distinct_channels', round(coalesce(avg(distinct_channels), 0)::numeric, 2),
        'p95_took_ms', coalesce(percentile_disc(0.95) WITHIN GROUP (ORDER BY took_ms), 0)
      ) AS x FROM base GROUP BY coalesce(device_class, 'unknown')
    ) s
  ),
  by_diversity AS (
    SELECT coalesce(jsonb_agg(x ORDER BY x->>'key'), '[]'::jsonb) AS j FROM (
      SELECT jsonb_build_object(
        'key', bucket,
        'requests', count(*),
        'users', count(DISTINCT user_id),
        'avg_distinct_channels', round(coalesce(avg(distinct_channels), 0)::numeric, 2),
        'avg_distinct_categories', round(coalesce(avg(distinct_categories), 0)::numeric, 2),
        'avg_self_overlap', round(coalesce(avg(self_overlap), 0)::numeric, 4)
      ) AS x
      FROM (
        SELECT *, CASE
          WHEN coalesce(diversity_level, 50) < 25 THEN '0-24'
          WHEN coalesce(diversity_level, 50) < 50 THEN '25-49'
          WHEN coalesce(diversity_level, 50) < 75 THEN '50-74'
          ELSE '75-100' END AS bucket
        FROM base
      ) b GROUP BY bucket
    ) s
  )
  SELECT jsonb_build_object(
    'since', _since,
    'filters', jsonb_build_object(
      'hours', _hours, 'cohort_id', _cohort_id, 'min_diversity', _min_diversity,
      'max_diversity', _max_diversity, 'language', _language, 'surface', _surface,
      'variant', _variant, 'device_class', _device_class),
    'overall', (SELECT j FROM overall),
    'by_variant', (SELECT j FROM by_variant),
    'by_surface', (SELECT j FROM by_surface),
    'by_language', (SELECT j FROM by_language),
    'by_device', (SELECT j FROM by_device),
    'by_diversity_bucket', (SELECT j FROM by_diversity)
  ) INTO _out;

  RETURN _out;
END;
$function$;

REVOKE ALL ON FUNCTION public.feed_diversity_dashboard_filtered(integer, uuid, integer, integer, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feed_diversity_dashboard_filtered(integer, uuid, integer, integer, text, text, text, text) TO authenticated, service_role;

-- 3. Per-user feed trace listing
CREATE OR REPLACE FUNCTION public.admin_feed_traces(
  _hours integer DEFAULT 24,
  _user_id uuid DEFAULT NULL,
  _session_id text DEFAULT NULL,
  _surface text DEFAULT NULL,
  _limit integer DEFAULT 50
)
RETURNS TABLE (
  id bigint,
  created_at timestamptz,
  user_id uuid,
  session_id text,
  surface text,
  variant text,
  cold_start boolean,
  cold_start_strategy text,
  diversity_level smallint,
  ui_language text,
  device_class text,
  browser text,
  config_version text,
  item_count integer,
  pool_size integer,
  distinct_channels integer,
  distinct_categories integer,
  distinct_languages integer,
  max_per_channel integer,
  duplicate_count integer,
  self_overlap numeric,
  fresh_share numeric,
  took_ms integer,
  guarantees jsonb,
  trace jsonb,
  item_ids text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT m.id, m.created_at, m.user_id, m.session_id, m.surface, m.variant,
         m.cold_start, m.cold_start_strategy, m.diversity_level, m.ui_language,
         m.device_class, m.browser, m.config_version, m.item_count, m.pool_size,
         m.distinct_channels, m.distinct_categories, m.distinct_languages,
         m.max_per_channel, m.duplicate_count, m.self_overlap, m.fresh_share,
         m.took_ms, m.guarantees, m.trace, m.item_ids
  FROM public.feed_diversity_metrics m
  WHERE m.created_at >= now() - make_interval(hours => greatest(1, least(720, coalesce(_hours, 24))))
    AND (_user_id IS NULL OR m.user_id = _user_id)
    AND (_session_id IS NULL OR m.session_id = _session_id)
    AND (_surface IS NULL OR m.surface = _surface)
  ORDER BY m.created_at DESC
  LIMIT greatest(1, least(200, coalesce(_limit, 50)));
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_feed_traces(integer, uuid, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_feed_traces(integer, uuid, text, text, integer) TO authenticated, service_role;

-- 4. Runtime feed config flag (rollback / bucketing weights without redeploy)
INSERT INTO public.feature_flags (key, enabled, kill_switch, rollout_percent, description, targeting_rules)
VALUES (
  'feed.slider_personalization',
  true, false, 100,
  'Slider-personalized feed. Kill switch instantly reverts to the legacy non-personalized assembly. targeting_rules holds bucketing weights.',
  jsonb_build_object(
    'version', 'v4',
    'weights', jsonb_build_object(
      'diversity_slider', 1.0,
      'novelty', 0.35,
      'affinity', 0.45,
      'freshness', 0.2,
      'cold_start_topic', 0.6,
      'cold_start_device_jitter', 0.25
    ),
    'per_channel_cap', jsonb_build_object('low', 3, 'mid', 2, 'high', 1),
    'cold_start', jsonb_build_object('enabled', true, 'min_signals', 3, 'topic_share', 0.5)
  )
)
ON CONFLICT (key) DO NOTHING;