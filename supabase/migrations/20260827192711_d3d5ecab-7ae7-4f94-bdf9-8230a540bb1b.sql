-- 1. Return digest: honour real locale preferences ------------------------
CREATE OR REPLACE FUNCTION public.return_digest(p_limit integer DEFAULT 6)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_last timestamptz;
  v_langs text[];
  v_ui text;
  v_country text;
  v_items jsonb := '[]'::jsonb;
  v_limit integer := least(greatest(coalesce(p_limit, 6), 1), 12);
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'last_seen', NULL, 'away_hours', NULL);
  END IF;

  SELECT max(watched_at) INTO v_last FROM public.watch_history WHERE user_id = v_uid;
  IF v_last IS NULL THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'last_seen', NULL, 'away_hours', NULL);
  END IF;

  -- Canonical source of truth for language/region is user_locale_preferences.
  SELECT ulp.content_languages, ulp.ui_language, coalesce(ulp.country_code, ulp.detected_country)
    INTO v_langs, v_ui, v_country
  FROM public.user_locale_preferences ulp
  WHERE ulp.user_id = v_uid;

  -- Legacy fallback, then a safe default. An empty list previously meant
  -- "no filter", which surfaced content in languages the user cannot read.
  IF v_langs IS NULL OR cardinality(v_langs) = 0 THEN
    SELECT coalesce(array_agg(DISTINCT x) FILTER (WHERE x IS NOT NULL), ARRAY[]::text[])
      INTO v_langs
      FROM (
        SELECT jsonb_array_elements_text(coalesce(p.preferences->'content_languages', '[]'::jsonb)) AS x
        FROM public.profiles p WHERE p.user_id = v_uid
      ) s;
  END IF;

  IF v_ui IS NOT NULL AND v_ui <> '' AND NOT (v_ui = ANY (coalesce(v_langs, ARRAY[]::text[]))) THEN
    v_langs := coalesce(v_langs, ARRAY[]::text[]) || v_ui;
  END IF;

  IF v_langs IS NULL OR cardinality(v_langs) = 0 THEN
    v_langs := ARRAY['en'];
  END IF;

  WITH base AS (
    SELECT v.*
    FROM public.curated_videos v
    WHERE v.is_hidden = false
      AND v.is_archived = false
      AND coalesce(v.embeddable, true) = true
      AND v.moderation_state IN ('approved', 'auto_approved')
      AND coalesce(v.is_premium_only, false) = false
  ),
  resume AS (
    SELECT b.video_id, b.title, b.channel_title, b.thumbnail_url, b.category,
           'resume'::text AS kind,
           'Pick up where you left off'::text AS reason,
           w.progress_seconds AS progress_seconds,
           w.watched_at AS sort_at
    FROM public.watch_history w
    JOIN base b ON b.video_id = w.video_id
    WHERE w.user_id = v_uid
      AND coalesce(w.completed, false) = false
      AND coalesce(w.progress_seconds, 0) > 30
      AND (w.duration_seconds IS NULL OR w.progress_seconds < w.duration_seconds * 0.9)
    ORDER BY w.watched_at DESC
    LIMIT 2
  ),
  follows AS (
    SELECT b.video_id, b.title, b.channel_title, b.thumbnail_url, b.category,
           'follow_upload'::text AS kind,
           'New from a creator you follow'::text AS reason,
           NULL::integer AS progress_seconds,
           coalesce(b.published_at, b.ingested_at) AS sort_at
    FROM public.channel_follows f
    JOIN public.approved_channels c ON c.id = f.channel_id
    JOIN base b ON b.channel_id = c.youtube_channel_id
    WHERE f.follower_id = v_uid
      AND coalesce(b.ingested_at, b.published_at) > v_last
      AND NOT EXISTS (
        SELECT 1 FROM public.watch_history wh
        WHERE wh.user_id = v_uid AND wh.video_id = b.video_id
      )
    ORDER BY coalesce(b.published_at, b.ingested_at) DESC
    LIMIT 3
  ),
  gems AS (
    SELECT b.video_id, b.title, b.channel_title, b.thumbnail_url, b.category,
           'fresh_gem'::text AS kind,
           'A hidden gem since your last visit'::text AS reason,
           NULL::integer AS progress_seconds,
           coalesce(b.ingested_at, b.published_at) AS sort_at
    FROM base b
    WHERE coalesce(b.ingested_at, b.published_at) > v_last
      AND coalesce(b.halal_score, 0) >= 85
      AND coalesce(b.is_trusted_channel, false) = true
      AND b.content_language = ANY (v_langs)
      AND NOT EXISTS (
        SELECT 1 FROM public.watch_history wh
        WHERE wh.user_id = v_uid AND wh.video_id = b.video_id
      )
    -- Prefer the app language, then the user's other content languages.
    ORDER BY (b.content_language = coalesce(v_ui, 'en')) DESC,
             coalesce(b.view_count, 0) ASC,
             coalesce(b.ingested_at, b.published_at) DESC
    LIMIT 3
  ),
  merged AS (
    SELECT DISTINCT ON (video_id) *
    FROM (
      SELECT * FROM resume
      UNION ALL SELECT * FROM follows
      UNION ALL SELECT * FROM gems
    ) u
  )
  SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY
            CASE m.kind WHEN 'resume' THEN 0 WHEN 'follow_upload' THEN 1 ELSE 2 END,
            m.sort_at DESC), '[]'::jsonb)
    INTO v_items
  FROM (SELECT * FROM merged LIMIT v_limit) m;

  RETURN jsonb_build_object(
    'items', v_items,
    'last_seen', v_last,
    'away_hours', round(extract(epoch FROM (now() - v_last)) / 3600.0)
  );
END;
$function$;

-- 2. Support telemetry columns -------------------------------------------
ALTER TABLE public.support_ai_usage
  ADD COLUMN IF NOT EXISTS cache_hit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scrub_violation boolean NOT NULL DEFAULT false;

ALTER TABLE public.support_message_feedback
  ADD COLUMN IF NOT EXISTS reason text;

CREATE INDEX IF NOT EXISTS support_ai_usage_health_idx
  ON public.support_ai_usage (created_at DESC)
  INCLUDE (escalated, cache_hit, scrub_violation, llm_called);

-- 3. Reliability report --------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_support_reliability(p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days integer := least(greatest(coalesce(p_days, 7), 1), 90);
  v_totals jsonb;
  v_series jsonb;
  v_layers jsonb;
  v_scrubs jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
           'turns', count(*),
           'escalations', count(*) FILTER (WHERE escalated),
           'escalation_rate', round(100.0 * count(*) FILTER (WHERE escalated) / greatest(count(*), 1), 2),
           'cache_hits', count(*) FILTER (WHERE cache_hit),
           'cache_hit_rate', round(100.0 * count(*) FILTER (WHERE cache_hit) / greatest(count(*), 1), 2),
           'llm_calls', count(*) FILTER (WHERE llm_called),
           'zero_cost_rate', round(100.0 * count(*) FILTER (WHERE NOT llm_called) / greatest(count(*), 1), 2),
           'scrub_violations', count(*) FILTER (WHERE scrub_violation),
           'scrub_violation_rate', round(100.0 * count(*) FILTER (WHERE scrub_violation) / greatest(count(*), 1), 3),
           'validation_failures', count(*) FILTER (WHERE validation_failed),
           'degraded', count(*) FILTER (WHERE degraded),
           'injection_blocked', count(*) FILTER (WHERE injection_blocked)
         )
    INTO v_totals
  FROM public.support_ai_usage
  WHERE created_at >= now() - make_interval(days => v_days);

  SELECT coalesce(jsonb_agg(t ORDER BY t->>'day'), '[]'::jsonb) INTO v_series
  FROM (
    SELECT jsonb_build_object(
             'day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
             'turns', count(*),
             'escalation_rate', round(100.0 * count(*) FILTER (WHERE escalated) / greatest(count(*), 1), 2),
             'cache_hit_rate', round(100.0 * count(*) FILTER (WHERE cache_hit) / greatest(count(*), 1), 2),
             'scrub_violations', count(*) FILTER (WHERE scrub_violation)
           ) AS t
    FROM public.support_ai_usage
    WHERE created_at >= now() - make_interval(days => v_days)
    GROUP BY date_trunc('day', created_at)
  ) s;

  SELECT coalesce(jsonb_agg(t ORDER BY (t->>'turns')::bigint DESC), '[]'::jsonb) INTO v_layers
  FROM (
    SELECT jsonb_build_object(
             'layer', layer,
             'turns', count(*),
             'escalation_rate', round(100.0 * count(*) FILTER (WHERE escalated) / greatest(count(*), 1), 2),
             'avg_latency_ms', round(avg(latency_ms))
           ) AS t
    FROM public.support_ai_usage
    WHERE created_at >= now() - make_interval(days => v_days)
    GROUP BY layer
  ) s;

  SELECT coalesce(jsonb_agg(t ORDER BY t->>'created_at' DESC), '[]'::jsonb) INTO v_scrubs
  FROM (
    SELECT jsonb_build_object(
             'created_at', created_at,
             'layer', layer,
             'locale', locale,
             'topic', topic,
             'conversation_id', conversation_id
           ) AS t
    FROM public.support_ai_usage
    WHERE scrub_violation AND created_at >= now() - make_interval(days => v_days)
    ORDER BY created_at DESC
    LIMIT 25
  ) s;

  RETURN jsonb_build_object(
    'days', v_days,
    'totals', v_totals,
    'series', v_series,
    'layers', v_layers,
    'scrub_events', v_scrubs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_support_reliability(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_support_reliability(integer) TO authenticated;

-- 4. Health alerts -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_support_health(
  p_max_escalation_rate numeric DEFAULT 25,
  p_min_cache_hit_rate numeric DEFAULT 20,
  p_min_turns integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _turns bigint := 0;
  _esc numeric;
  _cache numeric;
  _scrubs bigint := 0;
  _alerts integer := 0;
BEGIN
  SELECT count(*),
         round(100.0 * count(*) FILTER (WHERE escalated) / greatest(count(*), 1), 2),
         round(100.0 * count(*) FILTER (WHERE cache_hit) / greatest(count(*), 1), 2),
         count(*) FILTER (WHERE scrub_violation)
    INTO _turns, _esc, _cache, _scrubs
  FROM public.support_ai_usage
  WHERE created_at >= now() - interval '24 hours';

  -- A scrub violation means an outgoing answer contained internal detail.
  -- It is never acceptable, so it alerts regardless of traffic volume.
  IF _scrubs > 0 THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'support_scrub_violation', 'critical',
      format('%s support answer(s) required internal-detail scrubbing in the last 24h', _scrubs),
      jsonb_build_object('violations', _scrubs, 'turns', _turns),
      '/admin/support-ai'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'support_scrub_violation' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours');
    _alerts := _alerts + 1;
  END IF;

  IF _turns < greatest(p_min_turns, 1) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'insufficient_traffic',
                              'turns', _turns, 'alerts', _alerts);
  END IF;

  IF _esc > p_max_escalation_rate THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'support_escalation_spike', 'warning',
      format('Support escalation rate is %s%% over 24h (threshold %s%%)', _esc, p_max_escalation_rate),
      jsonb_build_object('escalation_rate', _esc, 'threshold', p_max_escalation_rate, 'turns', _turns),
      '/admin/support-ai'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'support_escalation_spike' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours');
    _alerts := _alerts + 1;
  END IF;

  IF _cache < p_min_cache_hit_rate THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'support_cache_hit_drop', 'warning',
      format('Support cache hit rate fell to %s%% over 24h (threshold %s%%)', _cache, p_min_cache_hit_rate),
      jsonb_build_object('cache_hit_rate', _cache, 'threshold', p_min_cache_hit_rate, 'turns', _turns),
      '/admin/support-ai'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'support_cache_hit_drop' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours');
    _alerts := _alerts + 1;
  END IF;

  RETURN jsonb_build_object('turns', _turns, 'escalation_rate', _esc,
                            'cache_hit_rate', _cache, 'scrub_violations', _scrubs,
                            'alerts', _alerts);
END;
$$;

REVOKE ALL ON FUNCTION public.check_support_health(numeric, numeric, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.check_support_health(numeric, numeric, integer) TO service_role;

SELECT cron.schedule('support-health-check', '*/30 * * * *',
                     $cron$SELECT public.check_support_health();$cron$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'support-health-check');

-- 5. Answer feedback -> queued FAQ drafts --------------------------------
CREATE OR REPLACE FUNCTION public.support_feedback_submit(
  p_message_id uuid,
  p_helpful boolean,
  p_reason text DEFAULT NULL,
  p_comment text DEFAULT NULL,
  p_anon_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_conv uuid;
  v_owner uuid;
  v_anon text;
  v_locale text;
  v_topic text;
  v_question text;
  v_norm text;
  v_gap uuid;
  v_reason text := nullif(left(coalesce(p_reason, ''), 40), '');
BEGIN
  SELECT m.conversation_id, c.user_id, c.anon_key, coalesce(c.locale, 'en'), m.intent
    INTO v_conv, v_owner, v_anon, v_locale, v_topic
  FROM public.support_messages m
  JOIN public.support_conversations c ON c.id = m.conversation_id
  WHERE m.id = p_message_id AND m.role = 'assistant';

  IF v_conv IS NULL THEN
    RAISE EXCEPTION 'answer not found';
  END IF;

  -- Only the owner of the thread may rate it: signed-in by user id,
  -- signed-out by the device key that created the thread.
  IF v_uid IS NOT NULL THEN
    IF v_owner IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'not authorized'; END IF;
  ELSE
    IF p_anon_key IS NULL OR v_anon IS DISTINCT FROM p_anon_key THEN
      RAISE EXCEPTION 'not authorized';
    END IF;
  END IF;

  INSERT INTO public.support_message_feedback (message_id, user_id, anon_key, helpful, reason, comment)
  VALUES (p_message_id, v_uid, CASE WHEN v_uid IS NULL THEN p_anon_key ELSE NULL END,
          p_helpful, v_reason, nullif(left(coalesce(p_comment, ''), 500), ''))
  ON CONFLICT DO NOTHING;

  IF p_helpful THEN
    RETURN jsonb_build_object('ok', true, 'queued_draft', false);
  END IF;

  -- A wrong answer is a knowledge signal: capture the question that produced
  -- it and queue a draft for admin approval, grouped by category.
  SELECT content INTO v_question
  FROM public.support_messages
  WHERE conversation_id = v_conv AND role = 'user'
    AND created_at <= (SELECT created_at FROM public.support_messages WHERE id = p_message_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_question IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'queued_draft', false);
  END IF;

  v_norm := lower(regexp_replace(v_question, '[^a-z0-9\s]', '', 'gi'));
  v_norm := btrim(regexp_replace(v_norm, '\s+', ' ', 'g'));

  INSERT INTO public.support_knowledge_gaps
    (question_norm, sample_question, topic, locale, ask_count, best_confidence, status)
  VALUES (v_norm, left(v_question, 500), coalesce(v_topic, 'general'), v_locale, 1, NULL, 'open')
  ON CONFLICT (question_norm) DO UPDATE
    SET ask_count = public.support_knowledge_gaps.ask_count + 1,
        last_seen_at = now(),
        status = CASE WHEN public.support_knowledge_gaps.status = 'resolved'
                      THEN 'open' ELSE public.support_knowledge_gaps.status END
  RETURNING id INTO v_gap;

  INSERT INTO public.support_faq_drafts
    (gap_id, question, question_norm, category, locale, ask_count, status, origin)
  VALUES (v_gap, left(v_question, 500), v_norm, coalesce(v_topic, 'general'), v_locale, 1,
          'needs_approval', 'negative_feedback')
  ON CONFLICT (question_norm, locale) DO UPDATE
    SET ask_count = public.support_faq_drafts.ask_count + 1,
        status = CASE WHEN public.support_faq_drafts.status = 'published'
                      THEN 'needs_approval' ELSE public.support_faq_drafts.status END,
        updated_at = now();

  RETURN jsonb_build_object('ok', true, 'queued_draft', true,
                            'category', coalesce(v_topic, 'general'));
END;
$$;

REVOKE ALL ON FUNCTION public.support_feedback_submit(uuid, boolean, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.support_feedback_submit(uuid, boolean, text, text, text) TO anon, authenticated;