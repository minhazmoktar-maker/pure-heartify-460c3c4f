
CREATE OR REPLACE FUNCTION public.rec_retriever_health()
RETURNS TABLE(
  retriever text, pool_size int, distinct_channels int, distinct_categories int,
  distinct_languages int, top_channel_pct numeric, channel_entropy_bits numeric,
  pct_fresh_7d numeric, pct_trusted numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  RETURN QUERY
  WITH universe AS (
    SELECT video_id, channel_title, category, content_language, published_at, is_trusted_channel
    FROM curated_videos
    WHERE moderation_state IN ('approved','auto_approved') AND is_hidden=false AND is_archived=false
  ),
  fresh_raw AS (SELECT * FROM universe ORDER BY published_at DESC NULLS LAST LIMIT 900),
  fresh_capped AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY channel_title ORDER BY published_at DESC) rn FROM fresh_raw),
  freshness AS (SELECT video_id, channel_title, category, content_language, published_at, is_trusted_channel FROM fresh_capped WHERE rn <= 6 LIMIT 300),
  trending14 AS (SELECT u.* FROM universe u JOIN get_trending_video_ids(200, 336) t USING(video_id)),
  trending72 AS (SELECT u.* FROM universe u JOIN get_heartify_trending_ids(200, 72) t USING(video_id)),
  gems AS (SELECT u.* FROM universe u JOIN get_hidden_gem_ids(120, 300) t USING(video_id)),
  all_pools AS (
    SELECT 'universe'::text r, * FROM universe UNION ALL
    SELECT 'freshness', * FROM freshness UNION ALL
    SELECT 'trending_14d', * FROM trending14 UNION ALL
    SELECT 'heartify_trending_72h', * FROM trending72 UNION ALL
    SELECT 'hidden_gems', * FROM gems
  ),
  agg AS (
    SELECT r, COUNT(*)::int AS pool_size,
           COUNT(DISTINCT channel_title)::int AS distinct_channels,
           COUNT(DISTINCT category)::int AS distinct_categories,
           COUNT(DISTINCT COALESCE(content_language,'unknown'))::int AS distinct_languages,
           ROUND(100.0*COUNT(*) FILTER (WHERE published_at > now()-interval '7 days')::numeric/NULLIF(COUNT(*),0),2) AS pct_fresh_7d,
           ROUND(100.0*COUNT(*) FILTER (WHERE is_trusted_channel)::numeric/NULLIF(COUNT(*),0),2) AS pct_trusted
    FROM all_pools GROUP BY r
  ),
  ch_counts AS (SELECT r, channel_title, COUNT(*)::numeric cnt FROM all_pools GROUP BY r, channel_title),
  ch_freq AS (SELECT r, cnt, SUM(cnt) OVER (PARTITION BY r) tot FROM ch_counts),
  ch_terms AS (SELECT r, cnt, tot, (cnt/NULLIF(tot,0))::numeric p FROM ch_freq),
  ch_stats AS (
    SELECT r,
           ROUND(100.0*MAX(cnt)/NULLIF(MAX(tot),0),2) AS top_channel_pct,
           ROUND((SUM(-p*LN(GREATEST(1e-9,p)))/LN(2))::numeric,3) AS entropy_bits
    FROM ch_terms GROUP BY r
  )
  SELECT a.r, a.pool_size, a.distinct_channels, a.distinct_categories, a.distinct_languages,
         c.top_channel_pct, c.entropy_bits, a.pct_fresh_7d, a.pct_trusted
  FROM agg a LEFT JOIN ch_stats c USING(r)
  ORDER BY CASE a.r WHEN 'universe' THEN 0 WHEN 'freshness' THEN 1 WHEN 'trending_14d' THEN 2 WHEN 'heartify_trending_72h' THEN 3 WHEN 'hidden_gems' THEN 4 ELSE 5 END;
END; $$;

CREATE OR REPLACE FUNCTION public.rec_feed_health(_hours int DEFAULT 24)
RETURNS TABLE(
  total_impressions int, distinct_videos int, distinct_channels int, distinct_categories int,
  top_channel_pct numeric, top_category_pct numeric, duplicate_rate_pct numeric,
  channel_entropy_bits numeric, pct_fresh_7d numeric, pct_trusted numeric, personalized_ratio_pct numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  RETURN QUERY
  WITH imp AS (
    SELECT re.video_id, re.user_id, cv.channel_title, cv.category, cv.published_at, cv.is_trusted_channel
    FROM recommendation_events re
    LEFT JOIN curated_videos cv USING(video_id)
    WHERE re.event_type='impression' AND re.created_at > now() - make_interval(hours => _hours)
  ),
  base AS (
    SELECT COUNT(*)::int total_impressions,
           COUNT(DISTINCT video_id)::int distinct_videos,
           COUNT(DISTINCT channel_title)::int distinct_channels,
           COUNT(DISTINCT category)::int distinct_categories,
           ROUND(100.0 * (COUNT(*) - COUNT(DISTINCT video_id))::numeric / NULLIF(COUNT(*),0), 2) duplicate_rate_pct,
           ROUND(100.0*COUNT(*) FILTER (WHERE published_at > now()-interval '7 days')::numeric/NULLIF(COUNT(*),0),2) pct_fresh_7d,
           ROUND(100.0*COUNT(*) FILTER (WHERE is_trusted_channel)::numeric/NULLIF(COUNT(*),0),2) pct_trusted,
           ROUND(100.0*COUNT(*) FILTER (WHERE user_id IS NOT NULL)::numeric/NULLIF(COUNT(*),0),2) personalized_ratio_pct
    FROM imp
  ),
  ch AS (SELECT channel_title, COUNT(*)::numeric c FROM imp GROUP BY 1),
  ch_tot AS (SELECT SUM(c) tot FROM ch),
  ch_terms AS (SELECT c, (c/NULLIF((SELECT tot FROM ch_tot),0))::numeric p FROM ch),
  ch_ent AS (SELECT ROUND((SUM(-p*LN(GREATEST(1e-9,p)))/LN(2))::numeric,3) e FROM ch_terms),
  top_ch AS (SELECT ROUND(100.0*MAX(c)/NULLIF((SELECT tot FROM ch_tot),0),2) v FROM ch),
  ca AS (SELECT category, COUNT(*)::numeric c FROM imp GROUP BY 1),
  ca_tot AS (SELECT SUM(c) tot FROM ca),
  top_ca AS (SELECT ROUND(100.0*MAX(c)/NULLIF((SELECT tot FROM ca_tot),0),2) v FROM ca)
  SELECT b.total_impressions, b.distinct_videos, b.distinct_channels, b.distinct_categories,
         (SELECT v FROM top_ch), (SELECT v FROM top_ca),
         b.duplicate_rate_pct, (SELECT e FROM ch_ent),
         b.pct_fresh_7d, b.pct_trusted, b.personalized_ratio_pct
  FROM base b;
END; $$;
