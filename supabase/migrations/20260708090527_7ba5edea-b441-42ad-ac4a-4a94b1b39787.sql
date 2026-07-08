
-- ================================================================
-- Business Intelligence RPCs
-- All functions: aggregate-only, admin-only, security definer.
-- ================================================================

-- Internal guard used by every analytics function.
CREATE OR REPLACE FUNCTION public._analytics_assert_admin()
RETURNS void
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid())) THEN
    RAISE EXCEPTION 'analytics: forbidden';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public._analytics_assert_admin() FROM public;
GRANT EXECUTE ON FUNCTION public._analytics_assert_admin() TO authenticated;

-- 1. Active users (DAU + rolling 7-day WAU + rolling 30-day MAU per day).
CREATE OR REPLACE FUNCTION public.analytics_active_users(_from timestamptz, _to timestamptz)
RETURNS TABLE(day date, dau bigint, wau bigint, mau bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public._analytics_assert_admin();
  RETURN QUERY
  WITH days AS (
    SELECT generate_series(date_trunc('day', _from), date_trunc('day', _to), interval '1 day')::date AS day
  ),
  ev AS (
    SELECT date_trunc('day', created_at)::date AS d, user_id
    FROM public.analytics_events
    WHERE created_at BETWEEN _from - interval '30 days' AND _to
      AND user_id IS NOT NULL
  )
  SELECT
    d.day,
    (SELECT count(DISTINCT user_id) FROM ev WHERE ev.d = d.day),
    (SELECT count(DISTINCT user_id) FROM ev WHERE ev.d BETWEEN d.day - interval '6 days' AND d.day),
    (SELECT count(DISTINCT user_id) FROM ev WHERE ev.d BETWEEN d.day - interval '29 days' AND d.day)
  FROM days d
  ORDER BY d.day;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_active_users(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_active_users(timestamptz, timestamptz) TO authenticated;

-- 2. Retention: signup-week cohorts x N following weeks.
CREATE OR REPLACE FUNCTION public.analytics_retention(_cohort_from timestamptz, _weeks integer DEFAULT 8)
RETURNS TABLE(cohort_week date, week_offset integer, cohort_size bigint, retained bigint, retention_pct numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public._analytics_assert_admin();
  RETURN QUERY
  WITH cohorts AS (
    SELECT date_trunc('week', p.created_at)::date AS cohort_week, p.user_id
    FROM public.profiles p
    WHERE p.created_at >= _cohort_from
  ),
  sizes AS (
    SELECT cohort_week, count(*)::bigint AS cohort_size FROM cohorts GROUP BY cohort_week
  ),
  activity AS (
    SELECT c.cohort_week,
           GREATEST(0, EXTRACT(WEEK FROM ae.created_at)::int
             - EXTRACT(WEEK FROM c.cohort_week)::int) AS w,
           c.user_id
    FROM cohorts c
    JOIN public.analytics_events ae ON ae.user_id = c.user_id
    WHERE ae.created_at >= c.cohort_week
  ),
  buckets AS (
    SELECT cohort_week, w AS week_offset, count(DISTINCT user_id)::bigint AS retained
    FROM activity
    WHERE w BETWEEN 0 AND _weeks
    GROUP BY cohort_week, w
  )
  SELECT b.cohort_week, b.week_offset, s.cohort_size, b.retained,
         ROUND((b.retained::numeric / NULLIF(s.cohort_size,0)) * 100, 1)
  FROM buckets b JOIN sizes s USING (cohort_week)
  ORDER BY b.cohort_week, b.week_offset;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_retention(timestamptz, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_retention(timestamptz, integer) TO authenticated;

-- 3. Session stats derived from session_id activity spans.
CREATE OR REPLACE FUNCTION public.analytics_session_stats(_from timestamptz, _to timestamptz)
RETURNS TABLE(day date, sessions bigint, avg_seconds numeric, median_seconds numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public._analytics_assert_admin();
  RETURN QUERY
  WITH s AS (
    SELECT session_id,
           date_trunc('day', min(created_at))::date AS day,
           EXTRACT(EPOCH FROM (max(created_at) - min(created_at)))::numeric AS secs
    FROM public.analytics_events
    WHERE created_at BETWEEN _from AND _to AND session_id IS NOT NULL
    GROUP BY session_id
    HAVING count(*) > 1
  )
  SELECT day, count(*)::bigint,
         ROUND(avg(secs),1),
         ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY secs)::numeric,1)
  FROM s GROUP BY day ORDER BY day;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_session_stats(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_session_stats(timestamptz, timestamptz) TO authenticated;

-- 4. Search success rate (session-based click-through inside search sessions).
CREATE OR REPLACE FUNCTION public.analytics_search_stats(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public._analytics_assert_admin();
  SELECT jsonb_build_object(
    'total', count(*),
    'zero_result_rate', ROUND((count(*) FILTER (WHERE result_count = 0)::numeric / NULLIF(count(*),0)) * 100, 2),
    'click_through_rate', ROUND((count(*) FILTER (WHERE clicked_video_id IS NOT NULL)::numeric / NULLIF(count(*),0)) * 100, 2),
    'unique_queries', count(DISTINCT normalized_query),
    'daily', COALESCE((
      SELECT jsonb_agg(row_to_json(d)) FROM (
        SELECT date_trunc('day', created_at)::date AS day,
               count(*) AS searches,
               count(*) FILTER (WHERE result_count = 0) AS zero_results,
               count(*) FILTER (WHERE clicked_video_id IS NOT NULL) AS clicked
        FROM public.search_queries
        WHERE created_at BETWEEN _from AND _to
        GROUP BY 1 ORDER BY 1
      ) d
    ), '[]'::jsonb),
    'top_queries', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT normalized_query AS query, count(*) AS hits
        FROM public.search_queries
        WHERE created_at BETWEEN _from AND _to
        GROUP BY normalized_query ORDER BY hits DESC LIMIT 25
      ) t
    ), '[]'::jsonb)
  ) INTO result
  FROM public.search_queries WHERE created_at BETWEEN _from AND _to;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_search_stats(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_search_stats(timestamptz, timestamptz) TO authenticated;

-- 5. Recommendation CTR (impressions / clicks / conversions per day).
CREATE OR REPLACE FUNCTION public.analytics_recommendation_stats(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public._analytics_assert_admin();
  SELECT jsonb_build_object(
    'impressions', count(*) FILTER (WHERE event_type = 'impression'),
    'clicks',      count(*) FILTER (WHERE event_type = 'click'),
    'dismisses',   count(*) FILTER (WHERE event_type = 'dismiss'),
    'conversions', count(*) FILTER (WHERE event_type = 'convert'),
    'ctr',    ROUND((count(*) FILTER (WHERE event_type = 'click')::numeric
                     / NULLIF(count(*) FILTER (WHERE event_type = 'impression'),0)) * 100, 2),
    'convert_rate', ROUND((count(*) FILTER (WHERE event_type = 'convert')::numeric
                     / NULLIF(count(*) FILTER (WHERE event_type = 'click'),0)) * 100, 2),
    'daily', COALESCE((
      SELECT jsonb_agg(row_to_json(d)) FROM (
        SELECT date_trunc('day', created_at)::date AS day,
               count(*) FILTER (WHERE event_type = 'impression') AS impressions,
               count(*) FILTER (WHERE event_type = 'click') AS clicks,
               count(*) FILTER (WHERE event_type = 'convert') AS conversions
        FROM public.recommendation_events
        WHERE created_at BETWEEN _from AND _to
        GROUP BY 1 ORDER BY 1
      ) d
    ), '[]'::jsonb)
  ) INTO result
  FROM public.recommendation_events WHERE created_at BETWEEN _from AND _to;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_recommendation_stats(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_recommendation_stats(timestamptz, timestamptz) TO authenticated;

-- 6. Daily Dose completion (uses dose_completions vs daily_dose).
CREATE OR REPLACE FUNCTION public.analytics_dose_stats(_from timestamptz, _to timestamptz)
RETURNS TABLE(day date, dose_users bigint, completions bigint, completion_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public._analytics_assert_admin();
  RETURN QUERY
  WITH doses AS (
    SELECT date_trunc('day', created_at)::date AS day, count(DISTINCT user_id) AS users
    FROM public.daily_dose WHERE created_at BETWEEN _from AND _to GROUP BY 1
  ),
  comps AS (
    SELECT date_trunc('day', created_at)::date AS day, count(*) AS c
    FROM public.dose_completions WHERE created_at BETWEEN _from AND _to GROUP BY 1
  )
  SELECT d.day, d.users, coalesce(c.c,0),
         ROUND((coalesce(c.c,0)::numeric / NULLIF(d.users,0)) * 100, 1)
  FROM doses d LEFT JOIN comps c USING (day) ORDER BY d.day;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_dose_stats(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_dose_stats(timestamptz, timestamptz) TO authenticated;

-- 7. Favorites growth.
CREATE OR REPLACE FUNCTION public.analytics_favorites_stats(_from timestamptz, _to timestamptz)
RETURNS TABLE(day date, new_favorites bigint, cumulative bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public._analytics_assert_admin();
  RETURN QUERY
  WITH per_day AS (
    SELECT date_trunc('day', created_at)::date AS day, count(*)::bigint AS c
    FROM public.favorites WHERE created_at BETWEEN _from AND _to GROUP BY 1
  )
  SELECT day, c, sum(c) OVER (ORDER BY day) FROM per_day ORDER BY day;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_favorites_stats(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_favorites_stats(timestamptz, timestamptz) TO authenticated;

-- 8. Watch trends & top categories.
CREATE OR REPLACE FUNCTION public.analytics_watch_stats(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public._analytics_assert_admin();
  SELECT jsonb_build_object(
    'daily', COALESCE((
      SELECT jsonb_agg(row_to_json(d)) FROM (
        SELECT date_trunc('day', watched_at)::date AS day, count(*) AS watches, count(DISTINCT user_id) AS viewers
        FROM public.watch_history WHERE watched_at BETWEEN _from AND _to
        GROUP BY 1 ORDER BY 1
      ) d
    ), '[]'::jsonb),
    'top_channels', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT wh.channel_title, count(*) AS watches
        FROM public.watch_history wh
        WHERE wh.watched_at BETWEEN _from AND _to AND wh.channel_title IS NOT NULL
        GROUP BY wh.channel_title ORDER BY watches DESC LIMIT 20
      ) t
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_watch_stats(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_watch_stats(timestamptz, timestamptz) TO authenticated;

-- 9. Moderation accuracy + FP/FN rates.
CREATE OR REPLACE FUNCTION public.analytics_moderation_stats(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public._analytics_assert_admin();
  SELECT jsonb_build_object(
    'by_state', COALESCE((
      SELECT jsonb_agg(row_to_json(s)) FROM (
        SELECT state::text AS state, count(*) AS total
        FROM public.moderation_decisions
        WHERE created_at BETWEEN _from AND _to
        GROUP BY state ORDER BY total DESC
      ) s
    ), '[]'::jsonb),
    'total_decisions', (SELECT count(*) FROM public.moderation_decisions WHERE created_at BETWEEN _from AND _to),
    'false_positive', (SELECT count(*) FROM public.channel_trust_events WHERE source = 'false_positive' AND created_at BETWEEN _from AND _to),
    'false_negative', (SELECT count(*) FROM public.channel_trust_events WHERE source = 'false_negative' AND created_at BETWEEN _from AND _to),
    'manual_overrides', (SELECT count(*) FROM public.moderation_overrides WHERE created_at BETWEEN _from AND _to),
    'accuracy_pct', (
      SELECT ROUND((count(*) FILTER (WHERE state IN ('approved','auto_approved','rejected','blocked'))::numeric
                    / NULLIF(count(*),0)) * 100, 2)
      FROM public.moderation_decisions WHERE created_at BETWEEN _from AND _to
    )
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_moderation_stats(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_moderation_stats(timestamptz, timestamptz) TO authenticated;

-- 10. AI confidence histogram (10-point buckets).
CREATE OR REPLACE FUNCTION public.analytics_ai_confidence_histogram(_from timestamptz, _to timestamptz)
RETURNS TABLE(bucket int, count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public._analytics_assert_admin();
  RETURN QUERY
  SELECT (floor(coalesce(confidence,0)::numeric / 10) * 10)::int AS bucket, count(*)
  FROM public.moderation_decisions
  WHERE created_at BETWEEN _from AND _to
  GROUP BY 1 ORDER BY 1;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_ai_confidence_histogram(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_ai_confidence_histogram(timestamptz, timestamptz) TO authenticated;

-- 11. Channel growth & trust distribution.
CREATE OR REPLACE FUNCTION public.analytics_channel_growth(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public._analytics_assert_admin();
  SELECT jsonb_build_object(
    'daily', COALESCE((
      SELECT jsonb_agg(row_to_json(d)) FROM (
        SELECT date_trunc('day', created_at)::date AS day, count(*) AS added
        FROM public.approved_channels
        WHERE created_at BETWEEN _from AND _to AND status = 'active'
        GROUP BY 1 ORDER BY 1
      ) d
    ), '[]'::jsonb),
    'risk_distribution', COALESCE((
      SELECT jsonb_agg(row_to_json(r)) FROM (
        SELECT risk_level::text AS risk, count(*) AS n
        FROM public.channel_trust_profiles GROUP BY 1 ORDER BY 1
      ) r
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_channel_growth(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_channel_growth(timestamptz, timestamptz) TO authenticated;

-- 12. Category popularity (watch + search).
CREATE OR REPLACE FUNCTION public.analytics_category_popularity(_from timestamptz, _to timestamptz)
RETURNS TABLE(category text, watches bigint, searches bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public._analytics_assert_admin();
  RETURN QUERY
  WITH w AS (
    SELECT coalesce(category,'Unknown') AS category, count(*)::bigint AS watches
    FROM public.watch_history WHERE watched_at BETWEEN _from AND _to GROUP BY 1
  ),
  s AS (
    SELECT coalesce(intent->>'category','Unknown') AS category, count(*)::bigint AS searches
    FROM public.search_queries WHERE created_at BETWEEN _from AND _to GROUP BY 1
  )
  SELECT coalesce(w.category, s.category), coalesce(w.watches,0), coalesce(s.searches,0)
  FROM w FULL OUTER JOIN s USING (category)
  ORDER BY coalesce(w.watches,0) + coalesce(s.searches,0) DESC LIMIT 40;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_category_popularity(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_category_popularity(timestamptz, timestamptz) TO authenticated;

-- 13. Engagement (events per user percentiles).
CREATE OR REPLACE FUNCTION public.analytics_engagement(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public._analytics_assert_admin();
  WITH per_user AS (
    SELECT user_id, count(*)::numeric AS n
    FROM public.analytics_events
    WHERE created_at BETWEEN _from AND _to AND user_id IS NOT NULL
    GROUP BY user_id
  )
  SELECT jsonb_build_object(
    'active_users', (SELECT count(*) FROM per_user),
    'avg_events',   (SELECT ROUND(avg(n),1) FROM per_user),
    'p50', (SELECT ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY n)::numeric,1) FROM per_user),
    'p90', (SELECT ROUND(percentile_cont(0.9) WITHIN GROUP (ORDER BY n)::numeric,1) FROM per_user),
    'p99', (SELECT ROUND(percentile_cont(0.99) WITHIN GROUP (ORDER BY n)::numeric,1) FROM per_user),
    'top_events', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT event_name, count(*) AS n FROM public.analytics_events
        WHERE created_at BETWEEN _from AND _to GROUP BY 1 ORDER BY n DESC LIMIT 15
      ) t
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_engagement(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_engagement(timestamptz, timestamptz) TO authenticated;

-- 14. Geo distribution (from properties.country — never IPs).
CREATE OR REPLACE FUNCTION public.analytics_geo_distribution(_from timestamptz, _to timestamptz)
RETURNS TABLE(country text, sessions bigint, users bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public._analytics_assert_admin();
  RETURN QUERY
  SELECT coalesce(properties->>'country','Unknown') AS country,
         count(DISTINCT session_id)::bigint AS sessions,
         count(DISTINCT user_id)::bigint AS users
  FROM public.analytics_events
  WHERE created_at BETWEEN _from AND _to
  GROUP BY 1 ORDER BY sessions DESC LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_geo_distribution(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_geo_distribution(timestamptz, timestamptz) TO authenticated;

-- 15. Device / platform / viewport stats.
CREATE OR REPLACE FUNCTION public.analytics_device_stats(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public._analytics_assert_admin();
  SELECT jsonb_build_object(
    'device', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT coalesce(properties->>'device','unknown') AS device, count(DISTINCT session_id) AS n
        FROM public.analytics_events WHERE created_at BETWEEN _from AND _to
        GROUP BY 1 ORDER BY n DESC LIMIT 20
      ) t
    ), '[]'::jsonb),
    'platform', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT coalesce(properties->>'platform','web') AS platform, count(DISTINCT session_id) AS n
        FROM public.analytics_events WHERE created_at BETWEEN _from AND _to
        GROUP BY 1 ORDER BY n DESC LIMIT 20
      ) t
    ), '[]'::jsonb),
    'viewport', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT coalesce(properties->>'viewport','unknown') AS viewport, count(DISTINCT session_id) AS n
        FROM public.analytics_events WHERE created_at BETWEEN _from AND _to
        GROUP BY 1 ORDER BY n DESC LIMIT 20
      ) t
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_device_stats(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_device_stats(timestamptz, timestamptz) TO authenticated;

-- 16. Client-reported performance (latency, LCP if provided).
CREATE OR REPLACE FUNCTION public.analytics_performance(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public._analytics_assert_admin();
  WITH lat AS (
    SELECT ((properties->>'latency_ms')::numeric) AS ms
    FROM public.analytics_events
    WHERE created_at BETWEEN _from AND _to
      AND properties ? 'latency_ms'
      AND (properties->>'latency_ms') ~ '^[0-9]+(\.[0-9]+)?$'
  )
  SELECT jsonb_build_object(
    'samples', (SELECT count(*) FROM lat),
    'avg_ms', (SELECT ROUND(avg(ms),1) FROM lat),
    'p50_ms', (SELECT ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY ms)::numeric,1) FROM lat),
    'p90_ms', (SELECT ROUND(percentile_cont(0.9) WITHIN GROUP (ORDER BY ms)::numeric,1) FROM lat),
    'p99_ms', (SELECT ROUND(percentile_cont(0.99) WITHIN GROUP (ORDER BY ms)::numeric,1) FROM lat)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_performance(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_performance(timestamptz, timestamptz) TO authenticated;
