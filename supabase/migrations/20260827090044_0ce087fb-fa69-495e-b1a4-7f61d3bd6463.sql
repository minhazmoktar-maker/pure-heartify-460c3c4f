-- 1) Serving coverage / unchecked-backlog report -------------------------
CREATE OR REPLACE FUNCTION public.admin_serving_coverage()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total', count(*),
    'approved', count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')),
    'rejected', count(*) FILTER (WHERE moderation_state IN ('rejected','blocked')),
    'moderation_pending', count(*) FILTER (WHERE moderation_state IN ('pending_review','ai_review_required','human_review_required')),
    'visual_unchecked_approved', count(*) FILTER (
      WHERE moderation_state IN ('approved','auto_approved')
        AND (visual_state IS NULL OR visual_state NOT IN ('clean','flagged','rejected'))),
    'dedup_pending_approved', count(*) FILTER (
      WHERE moderation_state IN ('approved','auto_approved')
        AND visual_state = 'clean' AND duplicate_group_id IS NULL),
    'servable', count(*) FILTER (
      WHERE moderation_state IN ('approved','auto_approved')
        AND visual_state = 'clean' AND is_duplicate_canonical IS TRUE
        AND is_hidden = false AND is_archived = false),
    'checked_pct', round(
      100.0 * count(*) FILTER (WHERE visual_state IN ('clean','flagged','rejected')
                                  OR moderation_state IN ('rejected','blocked'))
      / GREATEST(count(*), 1), 2)
  )
  INTO _r
  FROM public.curated_videos;

  RETURN _r;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_serving_coverage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_serving_coverage() TO authenticated, service_role;

-- 2) Feed-quality dip alerts ---------------------------------------------
CREATE OR REPLACE FUNCTION public.check_feed_quality_alerts(
  p_min_novelty numeric DEFAULT 60,
  p_min_coverage numeric DEFAULT 0.5,
  p_min_channel_diversity numeric DEFAULT 0.35,
  p_min_sessions integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sessions bigint := 0;
  _exposures bigint := 0;
  _unique_videos bigint := 0;
  _novelty numeric;
  _coverage numeric;
  _channel_div numeric;
  _eligible bigint;
  _alerts integer := 0;
BEGIN
  SELECT count(*), count(DISTINCT e.video_id), count(DISTINCT e.session_key)
    INTO _exposures, _unique_videos, _sessions
  FROM public.feed_exposures e
  WHERE e.served_at >= now() - interval '24 hours';

  IF _sessions < GREATEST(p_min_sessions, 1) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'insufficient_traffic', 'sessions', _sessions);
  END IF;

  _novelty := round(100.0 * _unique_videos / GREATEST(_exposures, 1), 2);

  SELECT count(*) INTO _eligible
  FROM public.curated_videos
  WHERE moderation_state IN ('approved','auto_approved')
    AND visual_state = 'clean' AND is_duplicate_canonical IS TRUE
    AND is_hidden = false AND is_archived = false;
  _coverage := round(100.0 * _unique_videos / GREATEST(_eligible, 1), 3);

  SELECT round(avg(d), 3) INTO _channel_div FROM (
    SELECT count(DISTINCT e.channel_id)::numeric / GREATEST(count(*), 1) AS d
    FROM public.feed_exposures e
    WHERE e.served_at >= now() - interval '24 hours'
      AND e.channel_id IS NOT NULL
    GROUP BY e.session_key
    HAVING count(*) >= 5
  ) s;

  IF _novelty < p_min_novelty THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'feed_novelty_dip', 'warning',
      format('Feed novelty dipped to %s%% over the last 24h (threshold %s%%)', _novelty, p_min_novelty),
      jsonb_build_object('novelty_pct', _novelty, 'threshold', p_min_novelty,
                         'sessions', _sessions, 'exposures', _exposures),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'feed_novelty_dip' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours');
    _alerts := _alerts + 1;
  END IF;

  IF _coverage < p_min_coverage THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'feed_coverage_dip', 'warning',
      format('Feed item coverage dipped to %s%% of the eligible catalog over 24h (threshold %s%%)', _coverage, p_min_coverage),
      jsonb_build_object('coverage_pct', _coverage, 'threshold', p_min_coverage,
                         'unique_videos', _unique_videos, 'eligible', _eligible),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'feed_coverage_dip' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours');
    _alerts := _alerts + 1;
  END IF;

  IF _channel_div IS NOT NULL AND _channel_div < p_min_channel_diversity THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'feed_diversity_dip', 'warning',
      format('Per-session creator diversity dipped to %s distinct channels per served item (threshold %s)', _channel_div, p_min_channel_diversity),
      jsonb_build_object('channel_diversity', _channel_div, 'threshold', p_min_channel_diversity,
                         'sessions', _sessions),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'feed_diversity_dip' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours');
    _alerts := _alerts + 1;
  END IF;

  RETURN jsonb_build_object(
    'sessions', _sessions, 'exposures', _exposures, 'unique_videos', _unique_videos,
    'novelty_pct', _novelty, 'coverage_pct', _coverage,
    'channel_diversity', _channel_div, 'alerts_raised', _alerts);
END;
$$;

REVOKE ALL ON FUNCTION public.check_feed_quality_alerts(numeric, numeric, numeric, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_feed_quality_alerts(numeric, numeric, numeric, integer) TO service_role;

-- 3) Cold-start taste profile seeding ------------------------------------
CREATE OR REPLACE FUNCTION public.seed_cold_start_profile(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _topics jsonb := '{}'::jsonb;
  _langs jsonb := '{}'::jsonb;
  _existing integer;
  _r record;
BEGIN
  IF _user_id IS NULL OR (_user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT signal_count INTO _existing FROM public.user_taste_profiles WHERE user_id = _user_id;
  IF _existing IS NOT NULL AND _existing > 0 THEN
    RETURN jsonb_build_object('seeded', false, 'reason', 'profile_has_signals');
  END IF;

  -- Declared onboarding interests carry the strongest cold-start weight.
  FOR _r IN
    SELECT primary_interest AS c, 1.6::numeric AS w FROM public.user_interests WHERE user_id = _user_id AND primary_interest IS NOT NULL
    UNION ALL
    SELECT secondary_interest, 1.1 FROM public.user_interests WHERE user_id = _user_id AND secondary_interest IS NOT NULL
    UNION ALL
    SELECT exploration_interest, 0.7 FROM public.user_interests WHERE user_id = _user_id AND exploration_interest IS NOT NULL
  LOOP
    _topics := _topics || jsonb_build_object(_r.c, _r.w);
  END LOOP;

  -- High-quality global topics fill the rest, drawn only from the strict
  -- halal serving floor (approved + visually clean + canonical).
  FOR _r IN
    SELECT category AS c, count(*) AS n
    FROM public.curated_videos
    WHERE moderation_state IN ('approved','auto_approved')
      AND visual_state = 'clean' AND is_duplicate_canonical IS TRUE
      AND is_hidden = false AND is_archived = false
      AND category IS NOT NULL
      AND coalesce(halal_score, 0) >= 90
      AND is_trusted_channel IS TRUE
    GROUP BY category
    ORDER BY count(*) DESC
    LIMIT 8
  LOOP
    IF NOT (_topics ? _r.c) THEN
      _topics := _topics || jsonb_build_object(_r.c, 0.35);
    END IF;
  END LOOP;

  SELECT coalesce(jsonb_object_agg(l, w), '{}'::jsonb) INTO _langs FROM (
    SELECT lang AS l, CASE WHEN ord = 1 THEN 1.2 ELSE 0.5 END::numeric AS w
    FROM (
      SELECT lang, row_number() OVER () AS ord
      FROM public.user_locale_preferences p,
           unnest(coalesce(p.content_languages, ARRAY[]::text[])) AS lang
      WHERE p.user_id = _user_id
      LIMIT 4
    ) t
  ) x;

  INSERT INTO public.user_taste_profiles (user_id, topic_affinity, language_affinity, signal_count, updated_at)
  VALUES (_user_id, _topics, _langs, 0, now())
  ON CONFLICT (user_id) DO UPDATE
    SET topic_affinity = CASE WHEN public.user_taste_profiles.signal_count > 0
                              THEN public.user_taste_profiles.topic_affinity ELSE EXCLUDED.topic_affinity END,
        language_affinity = CASE WHEN public.user_taste_profiles.signal_count > 0
                                 THEN public.user_taste_profiles.language_affinity ELSE EXCLUDED.language_affinity END,
        updated_at = now();

  RETURN jsonb_build_object('seeded', true, 'topics', _topics, 'languages', _langs);
END;
$$;

REVOKE ALL ON FUNCTION public.seed_cold_start_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_cold_start_profile(uuid) TO authenticated, service_role;

-- 4) Schedule the quality-dip check --------------------------------------
SELECT cron.unschedule('feed-quality-dip-check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'feed-quality-dip-check');

SELECT cron.schedule(
  'feed-quality-dip-check',
  '*/30 * * * *',
  $cron$ SELECT public.check_feed_quality_alerts(); $cron$
);
