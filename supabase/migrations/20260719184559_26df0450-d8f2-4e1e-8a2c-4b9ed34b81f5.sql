
-- 1) SECURITY DEFINER logger — guarantees writes for anon + auth callers,
--    bypasses any silent-failure path where service_role client write was dropped.
CREATE OR REPLACE FUNCTION public.log_recommendation_event(
  _video_id text,
  _event_type text,
  _user_id uuid DEFAULT NULL,
  _score real DEFAULT NULL,
  _reasons jsonb DEFAULT '[]'::jsonb,
  _signals jsonb DEFAULT '{}'::jsonb,
  _surface text DEFAULT NULL,
  _session_id text DEFAULT NULL,
  _provider text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _event_type NOT IN ('impression','click','dismiss','convert') THEN
    RAISE EXCEPTION 'invalid event_type: %', _event_type;
  END IF;
  INSERT INTO public.recommendation_events
    (user_id, video_id, event_type, score, reasons, signals, surface, session_id, provider)
  VALUES
    (_user_id, _video_id, _event_type, _score, COALESCE(_reasons,'[]'::jsonb),
     COALESCE(_signals,'{}'::jsonb), _surface, _session_id, _provider);
END;
$$;
REVOKE ALL ON FUNCTION public.log_recommendation_event(text,text,uuid,real,jsonb,jsonb,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_recommendation_event(text,text,uuid,real,jsonb,jsonb,text,text,text) TO anon, authenticated, service_role;

-- 2) Retriever health snapshot — one row per retriever. Cheap, cached-friendly.
CREATE OR REPLACE FUNCTION public.rec_retriever_health()
RETURNS TABLE(
  retriever text,
  pool_size int,
  distinct_channels int,
  distinct_categories int,
  distinct_languages int,
  top_channel_pct numeric,
  channel_entropy_bits numeric,
  pct_fresh_7d numeric,
  pct_trusted numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
BEGIN
  RETURN QUERY
  WITH universe AS (
    SELECT video_id, channel_title, category, content_language, published_at, is_trusted_channel
    FROM curated_videos
    WHERE moderation_state IN ('approved','auto_approved') AND is_hidden=false AND is_archived=false
  ),
  fresh_raw AS (
    SELECT * FROM universe ORDER BY published_at DESC NULLS LAST LIMIT 900
  ),
  fresh_capped AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY channel_title ORDER BY published_at DESC) rn FROM fresh_raw
  ),
  freshness AS (SELECT * FROM fresh_capped WHERE rn <= 6 LIMIT 300),
  trending14 AS (
    SELECT u.* FROM universe u JOIN get_trending_video_ids(200, 336) t USING(video_id)
  ),
  trending72 AS (
    SELECT u.* FROM universe u JOIN get_heartify_trending_ids(200, 72) t USING(video_id)
  ),
  gems AS (
    SELECT u.* FROM universe u JOIN get_hidden_gem_ids(120, 300) t USING(video_id)
  ),
  all_pools AS (
    SELECT 'universe'::text r, * FROM universe UNION ALL
    SELECT 'freshness', video_id, channel_title, category, content_language, published_at, is_trusted_channel FROM freshness UNION ALL
    SELECT 'trending_14d', video_id, channel_title, category, content_language, published_at, is_trusted_channel FROM trending14 UNION ALL
    SELECT 'heartify_trending_72h', video_id, channel_title, category, content_language, published_at, is_trusted_channel FROM trending72 UNION ALL
    SELECT 'hidden_gems', video_id, channel_title, category, content_language, published_at, is_trusted_channel FROM gems
  ),
  agg AS (
    SELECT r,
           COUNT(*)::int AS pool_size,
           COUNT(DISTINCT channel_title)::int AS distinct_channels,
           COUNT(DISTINCT category)::int AS distinct_categories,
           COUNT(DISTINCT COALESCE(content_language,'unknown'))::int AS distinct_languages,
           ROUND(100.0*COUNT(*) FILTER (WHERE published_at > now()-interval '7 days')::numeric/NULLIF(COUNT(*),0),2) AS pct_fresh_7d,
           ROUND(100.0*COUNT(*) FILTER (WHERE is_trusted_channel)::numeric/NULLIF(COUNT(*),0),2) AS pct_trusted
    FROM all_pools GROUP BY r
  ),
  top_ch AS (
    SELECT r, ROUND(100.0*MAX(cnt)::numeric/NULLIF(SUM(cnt),0),2) AS top_channel_pct,
           ROUND(SUM(-((cnt::numeric/SUM(cnt) OVER (PARTITION BY r))) *
                   LN(GREATEST(1e-9,(cnt::numeric/SUM(cnt) OVER (PARTITION BY r)))))/LN(2),3) AS entropy_bits
    FROM (
      SELECT r, channel_title, COUNT(*) cnt FROM all_pools GROUP BY r, channel_title
    ) x GROUP BY r
  )
  SELECT a.r, a.pool_size, a.distinct_channels, a.distinct_categories, a.distinct_languages,
         t.top_channel_pct, t.entropy_bits, a.pct_fresh_7d, a.pct_trusted
  FROM agg a LEFT JOIN top_ch t USING(r)
  ORDER BY CASE a.r WHEN 'universe' THEN 0 WHEN 'freshness' THEN 1 WHEN 'trending_14d' THEN 2 WHEN 'heartify_trending_72h' THEN 3 WHEN 'hidden_gems' THEN 4 ELSE 5 END;
END; $$;
GRANT EXECUTE ON FUNCTION public.rec_retriever_health() TO authenticated, service_role;

-- 3) Assembled-feed health snapshot from recorded impressions (last 24h).
CREATE OR REPLACE FUNCTION public.rec_feed_health(_hours int DEFAULT 24)
RETURNS TABLE(
  total_impressions int,
  distinct_videos int,
  distinct_channels int,
  distinct_categories int,
  top_channel_pct numeric,
  top_category_pct numeric,
  duplicate_rate_pct numeric,
  channel_entropy_bits numeric,
  pct_fresh_7d numeric,
  pct_trusted numeric,
  personalized_ratio_pct numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  RETURN QUERY
  WITH imp AS (
    SELECT re.video_id, re.user_id, cv.channel_title, cv.category, cv.published_at, cv.is_trusted_channel
    FROM recommendation_events re
    LEFT JOIN curated_videos cv USING(video_id)
    WHERE re.event_type='impression' AND re.created_at > now() - make_interval(hours => _hours)
  ),
  ch AS (SELECT channel_title, COUNT(*) c FROM imp GROUP BY 1),
  ca AS (SELECT category, COUNT(*) c FROM imp GROUP BY 1),
  ent AS (
    SELECT ROUND(SUM(-((c::numeric/SUM(c) OVER ())) *
               LN(GREATEST(1e-9,(c::numeric/SUM(c) OVER ()))))/LN(2),3) e FROM ch LIMIT 1
  )
  SELECT
    COUNT(*)::int AS total_impressions,
    COUNT(DISTINCT video_id)::int AS distinct_videos,
    COUNT(DISTINCT channel_title)::int AS distinct_channels,
    COUNT(DISTINCT category)::int AS distinct_categories,
    (SELECT ROUND(100.0*MAX(c)::numeric/NULLIF(SUM(c),0),2) FROM ch) AS top_channel_pct,
    (SELECT ROUND(100.0*MAX(c)::numeric/NULLIF(SUM(c),0),2) FROM ca) AS top_category_pct,
    ROUND(100.0 * (COUNT(*) - COUNT(DISTINCT video_id))::numeric / NULLIF(COUNT(*),0), 2) AS duplicate_rate_pct,
    (SELECT e FROM ent) AS channel_entropy_bits,
    ROUND(100.0*COUNT(*) FILTER (WHERE published_at > now()-interval '7 days')::numeric/NULLIF(COUNT(*),0),2) AS pct_fresh_7d,
    ROUND(100.0*COUNT(*) FILTER (WHERE is_trusted_channel)::numeric/NULLIF(COUNT(*),0),2) AS pct_trusted,
    ROUND(100.0*COUNT(*) FILTER (WHERE user_id IS NOT NULL)::numeric/NULLIF(COUNT(*),0),2) AS personalized_ratio_pct
  FROM imp;
END; $$;
GRANT EXECUTE ON FUNCTION public.rec_feed_health(int) TO authenticated, service_role;
