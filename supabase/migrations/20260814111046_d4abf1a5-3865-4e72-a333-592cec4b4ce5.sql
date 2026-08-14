-- ============================================================================
-- AUTONOMOUS GROWTH SYSTEM
-- Heartify keeps expanding its beneficial corpus on its own: the discovery
-- query bank learns which searches actually yield approved channels, grows
-- itself from real signals (zero-result user searches, newly approved
-- channels, in-language recombination), prunes barren queries, and a
-- controller loop adapts throughput toward explicit growth targets.
-- No human/agent intervention required.
-- ============================================================================

-- ---------------------------------------------------------------- 1. yield --
ALTER TABLE public.discovery_topic_queries
  ADD COLUMN IF NOT EXISTS runs int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS candidates_found int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_found int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_yield_at timestamptz,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'seed';

-- Dedupe before enforcing uniqueness so self-expansion can rely on upsert.
DELETE FROM public.discovery_topic_queries t
USING public.discovery_topic_queries k
WHERE t.ctid > k.ctid
  AND lower(t.language) = lower(k.language)
  AND lower(btrim(t.query)) = lower(btrim(k.query));

CREATE UNIQUE INDEX IF NOT EXISTS discovery_topic_queries_lang_query_uidx
  ON public.discovery_topic_queries (lower(language), lower(btrim(query)));

CREATE INDEX IF NOT EXISTS discovery_topic_queries_yield_idx
  ON public.discovery_topic_queries (enabled, runs, approved_found);

CREATE OR REPLACE FUNCTION public.record_topic_query_yield(
  p_query_id uuid,
  p_candidates int DEFAULT 0,
  p_approved int DEFAULT 0
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.discovery_topic_queries
     SET runs = runs + 1,
         candidates_found = candidates_found + GREATEST(COALESCE(p_candidates, 0), 0),
         approved_found = approved_found + GREATEST(COALESCE(p_approved, 0), 0),
         last_run_at = now(),
         last_yield_at = CASE WHEN COALESCE(p_candidates, 0) > 0 THEN now() ELSE last_yield_at END,
         updated_at = now()
   WHERE id = p_query_id;
$$;

REVOKE ALL ON FUNCTION public.record_topic_query_yield(uuid, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_topic_query_yield(uuid, int, int) TO service_role;

-- ------------------------------------------------- 2. autonomy config + log --
CREATE TABLE IF NOT EXISTS public.autonomy_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.autonomy_config TO authenticated;
GRANT ALL ON public.autonomy_config TO service_role;
ALTER TABLE public.autonomy_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS autonomy_config_admin_read ON public.autonomy_config;
CREATE POLICY autonomy_config_admin_read ON public.autonomy_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.autonomy_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS autonomy_log_created_idx ON public.autonomy_log (created_at DESC);

GRANT SELECT ON public.autonomy_log TO authenticated;
GRANT ALL ON public.autonomy_log TO service_role;
ALTER TABLE public.autonomy_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS autonomy_log_admin_read ON public.autonomy_log;
CREATE POLICY autonomy_log_admin_read ON public.autonomy_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.autonomy_config (key, value, description) VALUES
  ('growth_targets',
   jsonb_build_object('videos_per_day', 150000, 'channels_per_day', 40, 'language_target', 20000),
   'Daily growth objectives the controller steers toward.'),
  ('discovery_throughput',
   jsonb_build_object('queries_per_run', 16, 'min', 8, 'max', 64),
   'Self-tuned number of topic queries per discovery run.'),
  ('query_bank',
   jsonb_build_object('min_enabled', 3000, 'grow_batch', 250, 'prune_min_runs', 6),
   'Self-expansion and pruning limits for the discovery query bank.')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------ 3. self-expanding queries --
CREATE OR REPLACE FUNCTION public.grow_topic_queries(p_limit int DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_target int;
  v_added int := 0;
  v_from_search int := 0;
  v_from_channels int := 0;
  v_from_recombine int := 0;
BEGIN
  SELECT COALESCE(p_limit, (value->>'grow_batch')::int, 250)
    INTO v_limit FROM public.autonomy_config WHERE key = 'query_bank';
  v_limit := GREATEST(COALESCE(v_limit, 250), 10);

  SELECT COALESCE((value->>'language_target')::int, 20000)
    INTO v_target FROM public.autonomy_config WHERE key = 'growth_targets';
  v_target := COALESCE(v_target, 20000);

  -- (a) Real demand the corpus could not answer: user searches that returned
  --     nothing become discovery queries in that user's own languages.
  WITH gaps AS (
    SELECT DISTINCT ON (lower(btrim(s.normalized_query)), lower(lang))
           btrim(s.normalized_query) AS q,
           lower(lang) AS lang
    FROM public.search_queries s
    LEFT JOIN public.user_locale_preferences p ON p.user_id = s.user_id,
    LATERAL unnest(COALESCE(p.content_languages, ARRAY['en'])) AS lang
    WHERE s.created_at > now() - interval '14 days'
      AND COALESCE(s.result_count, 0) = 0
      AND length(btrim(COALESCE(s.normalized_query, ''))) BETWEEN 4 AND 90
    LIMIT GREATEST(v_limit / 3, 10)
  )
  INSERT INTO public.discovery_topic_queries (language, topic, query, priority, enabled, origin)
  SELECT lang, 'search-gap', q, 7, true, 'search_gap' FROM gaps
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_from_search = ROW_COUNT;

  -- (b) Whatever just passed moderation is proof of a productive niche:
  --     turn approved channels' topics into fresh in-language queries.
  WITH wins AS (
    SELECT DISTINCT ON (lower(topic_text), lang)
           topic_text, lang
    FROM (
      SELECT COALESCE(NULLIF(btrim(c.halal_topic_hint), ''), NULLIF(btrim(c.category), '')) AS topic_text,
             lower(COALESCE(NULLIF(c.language_detected, ''), NULLIF(c.language, ''), 'en')) AS lang
      FROM public.channel_candidates c
      WHERE c.status IN ('approved', 'promoted')
        AND COALESCE(c.promoted_at, c.updated_at) > now() - interval '14 days'
    ) s
    WHERE topic_text IS NOT NULL AND length(topic_text) BETWEEN 3 AND 80
    LIMIT GREATEST(v_limit / 3, 10)
  )
  INSERT INTO public.discovery_topic_queries (language, topic, query, priority, enabled, origin)
  SELECT lang, topic_text, topic_text || ' lecture', 6, true, 'approved_topic' FROM wins
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_from_channels = ROW_COUNT;

  -- (c) Language equity: recombine proven in-language phrasing for the
  --     languages furthest from target, so thin languages get new surface
  --     area in their own script instead of English spillover.
  WITH deficit_langs AS (
    SELECT lower(t.language) AS lang
    FROM (SELECT DISTINCT lower(language) AS language FROM public.discovery_topic_queries WHERE enabled) t
    LEFT JOIN public.language_corpus_health h ON h.language = lower(t.language)
    WHERE COALESCE(h.live_videos, 0) < v_target
    ORDER BY COALESCE(h.live_videos, 0) ASC
    LIMIT 12
  ),
  productive AS (
    SELECT lower(q.language) AS language, q.query, q.topic,
           ROW_NUMBER() OVER (PARTITION BY lower(q.language)
             ORDER BY (q.candidates_found + 3 * q.approved_found) DESC, q.runs ASC) AS rnk
    FROM public.discovery_topic_queries q
    JOIN deficit_langs d ON d.lang = lower(q.language)
    WHERE q.enabled
  ),
  combos AS (
    SELECT a.language AS lang,
           COALESCE(NULLIF(btrim(b.topic), ''), 'general') AS topic,
           btrim(a.query) || ' ' || btrim(b.query) AS query
    FROM productive a
    JOIN productive b
      ON b.language = a.language AND b.rnk = a.rnk + 1
    WHERE a.rnk <= 24
      AND length(btrim(a.query) || ' ' || btrim(b.query)) <= 110
    LIMIT GREATEST(v_limit / 3, 10)
  )
  INSERT INTO public.discovery_topic_queries (language, topic, query, priority, enabled, origin)
  SELECT lang, topic, query, 4, true, 'recombination' FROM combos
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_from_recombine = ROW_COUNT;

  v_added := v_from_search + v_from_channels + v_from_recombine;

  INSERT INTO public.autonomy_log (kind, detail)
  VALUES ('query_bank_grown', jsonb_build_object(
    'added', v_added,
    'from_search_gaps', v_from_search,
    'from_approved_topics', v_from_channels,
    'from_recombination', v_from_recombine,
    'limit', v_limit
  ));

  RETURN v_added;
END;
$$;

REVOKE ALL ON FUNCTION public.grow_topic_queries(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grow_topic_queries(int) TO service_role;

-- ------------------------------------------------------------- 4. pruning ---
CREATE OR REPLACE FUNCTION public.prune_topic_queries()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_runs int;
  v_disabled int := 0;
BEGIN
  SELECT COALESCE((value->>'prune_min_runs')::int, 6)
    INTO v_min_runs FROM public.autonomy_config WHERE key = 'query_bank';
  v_min_runs := GREATEST(COALESCE(v_min_runs, 6), 3);

  -- A query that has been searched repeatedly and never surfaced a single
  -- candidate is dead weight: stop spending quota on it. Seeds are kept
  -- enabled longer than generated queries because they anchor coverage.
  UPDATE public.discovery_topic_queries
     SET enabled = false, updated_at = now()
   WHERE enabled
     AND candidates_found = 0
     AND approved_found = 0
     AND runs >= CASE WHEN origin = 'seed' THEN v_min_runs * 2 ELSE v_min_runs END;
  GET DIAGNOSTICS v_disabled = ROW_COUNT;

  INSERT INTO public.autonomy_log (kind, detail)
  VALUES ('query_bank_pruned', jsonb_build_object('disabled', v_disabled, 'min_runs', v_min_runs));

  RETURN v_disabled;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_topic_queries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_topic_queries() TO service_role;

-- --------------------------------------------------- 5. growth controller ---
CREATE OR REPLACE FUNCTION public.growth_controller_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_videos_24h int;
  v_channels_24h int;
  v_target_videos int;
  v_target_channels int;
  v_enabled_queries int;
  v_min_enabled int;
  v_qpr int;
  v_min int;
  v_max int;
  v_next int;
  v_grown int := 0;
  v_result jsonb;
BEGIN
  SELECT COALESCE((value->>'videos_per_day')::int, 150000),
         COALESCE((value->>'channels_per_day')::int, 40)
    INTO v_target_videos, v_target_channels
  FROM public.autonomy_config WHERE key = 'growth_targets';
  v_target_videos := COALESCE(v_target_videos, 150000);
  v_target_channels := COALESCE(v_target_channels, 40);

  SELECT COALESCE((value->>'queries_per_run')::int, 16),
         COALESCE((value->>'min')::int, 8),
         COALESCE((value->>'max')::int, 64)
    INTO v_qpr, v_min, v_max
  FROM public.autonomy_config WHERE key = 'discovery_throughput';
  v_qpr := COALESCE(v_qpr, 16);
  v_min := COALESCE(v_min, 8);
  v_max := COALESCE(v_max, 64);

  SELECT COALESCE((value->>'min_enabled')::int, 3000)
    INTO v_min_enabled FROM public.autonomy_config WHERE key = 'query_bank';
  v_min_enabled := COALESCE(v_min_enabled, 3000);

  SELECT count(*) INTO v_videos_24h
  FROM public.curated_videos WHERE ingested_at > now() - interval '24 hours';

  SELECT count(*) INTO v_channels_24h
  FROM public.channel_candidates
  WHERE status IN ('approved', 'promoted')
    AND COALESCE(promoted_at, updated_at) > now() - interval '24 hours';

  SELECT count(*) INTO v_enabled_queries
  FROM public.discovery_topic_queries WHERE enabled;

  -- Proportional controller: widen the discovery front when behind target,
  -- ease off when comfortably ahead so quota is not burned needlessly.
  v_next := v_qpr;
  IF v_videos_24h < v_target_videos * 0.6 OR v_channels_24h < v_target_channels THEN
    v_next := LEAST(v_max, CEIL(v_qpr * 1.5)::int);
  ELSIF v_videos_24h > v_target_videos * 1.5 AND v_channels_24h > v_target_channels * 2 THEN
    v_next := GREATEST(v_min, FLOOR(v_qpr * 0.8)::int);
  END IF;

  IF v_next <> v_qpr THEN
    UPDATE public.autonomy_config
       SET value = jsonb_set(value, '{queries_per_run}', to_jsonb(v_next)),
           updated_at = now()
     WHERE key = 'discovery_throughput';
  END IF;

  -- Keep the query bank above its floor by generating more from live signals.
  IF v_enabled_queries < v_min_enabled THEN
    v_grown := public.grow_topic_queries(NULL);
  END IF;

  v_result := jsonb_build_object(
    'videos_24h', v_videos_24h,
    'target_videos', v_target_videos,
    'channels_24h', v_channels_24h,
    'target_channels', v_target_channels,
    'enabled_queries', v_enabled_queries,
    'queries_per_run', v_next,
    'queries_per_run_before', v_qpr,
    'queries_generated', v_grown
  );

  INSERT INTO public.autonomy_log (kind, detail) VALUES ('controller_tick', v_result);

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.growth_controller_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.growth_controller_tick() TO service_role;

-- ------------------------------------- 6. yield-aware discovery scheduling ---
DROP FUNCTION IF EXISTS public.next_topic_queries(int, int);

CREATE OR REPLACE FUNCTION public.next_topic_queries(
  p_limit int DEFAULT NULL,
  p_target int DEFAULT NULL
)
RETURNS TABLE (id uuid, query text, language text, deficit numeric, score numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cfg AS (
    SELECT
      COALESCE(p_limit, (SELECT (value->>'queries_per_run')::int FROM public.autonomy_config WHERE key = 'discovery_throughput'), 16) AS lim,
      COALESCE(p_target, (SELECT (value->>'language_target')::int FROM public.autonomy_config WHERE key = 'growth_targets'), 20000) AS target
  ),
  demand AS (
    SELECT lower(lang) AS language, count(*)::numeric AS users
    FROM public.user_locale_preferences p,
         LATERAL unnest(COALESCE(p.content_languages, ARRAY[]::text[])) AS lang
    GROUP BY 1
  ),
  demand_norm AS (
    SELECT language, users / GREATEST((SELECT max(users) FROM demand), 1) AS demand
    FROM demand
  ),
  health AS (
    SELECT q.language, COALESCE(h.live_videos, 0) AS live_videos
    FROM (SELECT DISTINCT lower(language) AS language FROM public.discovery_topic_queries WHERE enabled) q
    LEFT JOIN public.language_corpus_health h ON h.language = q.language
  ),
  scored AS (
    SELECT t.id, t.query, lower(t.language) AS language,
           GREATEST(0::numeric, 1::numeric - (h.live_videos::numeric / GREATEST((SELECT target FROM cfg), 1)::numeric)) AS deficit,
           GREATEST(0::numeric, 1::numeric - (h.live_videos::numeric / GREATEST((SELECT target FROM cfg), 1)::numeric))
             * (0.25 + COALESCE(d.demand, 0))
             * (1 + LEAST(COALESCE(t.priority, 0), 10)::numeric / 10)
             * (1 + LEAST(2::numeric,
                 (t.candidates_found + 3 * t.approved_found)::numeric
                   / GREATEST(t.runs, 1)::numeric)) AS score,
           ROW_NUMBER() OVER (
             PARTITION BY lower(t.language)
             ORDER BY t.last_run_at ASC NULLS FIRST, t.priority DESC, t.id
           ) AS lang_rank
    FROM public.discovery_topic_queries t
    JOIN health h ON h.language = lower(t.language)
    LEFT JOIN demand_norm d ON d.language = lower(t.language)
    WHERE t.enabled
  )
  SELECT id, query, language, deficit, score
  FROM scored
  WHERE lang_rank <= GREATEST(1, CEIL((SELECT lim FROM cfg)::numeric / 4))
  ORDER BY lang_rank ASC, score DESC, random()
  LIMIT GREATEST(1, LEAST((SELECT lim FROM cfg), 200));
$$;

REVOKE ALL ON FUNCTION public.next_topic_queries(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_topic_queries(int, int) TO service_role;

-- ---------------------------------------------------------- 7. autonomy view --
CREATE OR REPLACE VIEW public.autonomy_health
WITH (security_invoker = true) AS
  SELECT
    (SELECT count(*) FROM public.discovery_topic_queries WHERE enabled) AS enabled_queries,
    (SELECT count(*) FROM public.discovery_topic_queries WHERE enabled AND runs = 0) AS unexplored_queries,
    (SELECT count(*) FROM public.discovery_topic_queries WHERE NOT enabled) AS pruned_queries,
    (SELECT count(*) FROM public.discovery_topic_queries WHERE origin <> 'seed') AS self_generated_queries,
    (SELECT count(*) FROM public.curated_videos WHERE ingested_at > now() - interval '24 hours') AS videos_24h,
    (SELECT count(*) FROM public.channel_candidates
      WHERE status IN ('approved','promoted') AND COALESCE(promoted_at, updated_at) > now() - interval '24 hours') AS channels_24h,
    (SELECT max(created_at) FROM public.autonomy_log WHERE kind = 'controller_tick') AS last_controller_tick;

GRANT SELECT ON public.autonomy_health TO authenticated;
GRANT SELECT ON public.autonomy_health TO service_role;

-- ------------------------------------------------------------ 8. schedule ---
SELECT cron.unschedule(jobid) FROM cron.job
 WHERE jobname IN ('growth-controller-hourly', 'query-bank-grow-6h', 'query-bank-prune-daily');

SELECT cron.schedule('growth-controller-hourly', '40 * * * *', $$SELECT public.growth_controller_tick();$$);
SELECT cron.schedule('query-bank-grow-6h', '15 */6 * * *', $$SELECT public.grow_topic_queries(NULL);$$);
SELECT cron.schedule('query-bank-prune-daily', '50 2 * * *', $$SELECT public.prune_topic_queries();$$);