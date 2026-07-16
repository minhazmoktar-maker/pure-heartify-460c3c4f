
-- Phase P1.2: Feed Intelligence & Discovery Engine (service-role RPCs)
-- Adds three helpers used by the recommendations edge function:
--   * get_heartify_trending_ids  — Heartify-native trending (clicks + converts + completions weighted)
--   * get_hidden_gem_ids         — surfaces high-halal, low-exposure content
--   * get_recent_impression_ids  — anti-repeat memory for a user
-- All are SECURITY DEFINER but only granted to service_role (called from
-- edge functions). This preserves the strict RPC allowlist established in
-- migration 20260716070704 and does not widen anon/authenticated surface.

-- Supporting indexes (idempotent) -------------------------------------------
CREATE INDEX IF NOT EXISTS recommendation_events_user_recent_idx
  ON public.recommendation_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS recommendation_events_video_type_time_idx
  ON public.recommendation_events (video_id, event_type, created_at DESC);

-- 1) Heartify-native trending ----------------------------------------------
-- Weights events: convert=4, click=1, impression=0. Bounded to the window.
-- We intentionally do NOT rely on YouTube view counts here — this is our
-- own popularity signal, sourced from the moderation-safe engagement ledger.
CREATE OR REPLACE FUNCTION public.get_heartify_trending_ids(
  _limit int DEFAULT 200,
  _window_hours int DEFAULT 72
)
RETURNS TABLE (video_id text, score numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT re.video_id,
         sum(
           CASE re.event_type
             WHEN 'convert' THEN 4.0
             WHEN 'click'   THEN 1.0
             ELSE 0.0
           END
         )::numeric AS score
  FROM public.recommendation_events re
  WHERE re.created_at > now() - make_interval(hours => _window_hours)
    AND re.event_type IN ('click','convert')
  GROUP BY re.video_id
  HAVING sum(CASE re.event_type WHEN 'convert' THEN 4.0 WHEN 'click' THEN 1.0 ELSE 0.0 END) > 0
  ORDER BY score DESC
  LIMIT _limit;
$$;
REVOKE ALL ON FUNCTION public.get_heartify_trending_ids(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_heartify_trending_ids(int, int) TO service_role;

-- 2) Hidden Gems ------------------------------------------------------------
-- High halal score + trusted or high-confidence moderation + fewer than
-- _max_impressions impressions in the last 30 days. Restricted to items
-- published in the last 180 days so promotion doesn't surface stale content.
CREATE OR REPLACE FUNCTION public.get_hidden_gem_ids(
  _limit int DEFAULT 100,
  _max_impressions int DEFAULT 300
)
RETURNS TABLE (video_id text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH impressions AS (
    SELECT re.video_id, count(*) AS n
    FROM public.recommendation_events re
    WHERE re.event_type = 'impression'
      AND re.created_at > now() - interval '30 days'
    GROUP BY re.video_id
  )
  SELECT cv.video_id
  FROM public.curated_videos cv
  LEFT JOIN impressions i ON i.video_id = cv.video_id
  WHERE cv.moderation_state IN ('approved','auto_approved')
    AND cv.published_at > now() - interval '180 days'
    AND coalesce(cv.halal_score, 0) >= 80
    AND (cv.is_trusted_channel = true OR coalesce(cv.moderation_confidence, 0) >= 85)
    AND coalesce(i.n, 0) < _max_impressions
  ORDER BY cv.halal_score DESC NULLS LAST, cv.published_at DESC
  LIMIT _limit;
$$;
REVOKE ALL ON FUNCTION public.get_hidden_gem_ids(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_hidden_gem_ids(int, int) TO service_role;

-- 3) Per-user recent impressions (anti-repeat memory) ----------------------
CREATE OR REPLACE FUNCTION public.get_recent_impression_ids(
  _user_id uuid,
  _hours int DEFAULT 24,
  _limit int DEFAULT 400
)
RETURNS TABLE (video_id text, shown_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT re.video_id, count(*) AS shown_count
  FROM public.recommendation_events re
  WHERE re.user_id = _user_id
    AND re.event_type = 'impression'
    AND re.created_at > now() - make_interval(hours => _hours)
  GROUP BY re.video_id
  ORDER BY count(*) DESC, max(re.created_at) DESC
  LIMIT _limit;
$$;
REVOKE ALL ON FUNCTION public.get_recent_impression_ids(uuid, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_impression_ids(uuid, int, int) TO service_role;

-- 4) Per-user dismissed ("Not Interested") memory --------------------------
CREATE OR REPLACE FUNCTION public.get_user_dismissed_video_ids(
  _user_id uuid,
  _limit int DEFAULT 500
)
RETURNS TABLE (video_id text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT re.video_id
  FROM public.recommendation_events re
  WHERE re.user_id = _user_id
    AND re.event_type = 'dismiss'
  ORDER BY re.video_id
  LIMIT _limit;
$$;
REVOKE ALL ON FUNCTION public.get_user_dismissed_video_ids(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_dismissed_video_ids(uuid, int) TO service_role;
