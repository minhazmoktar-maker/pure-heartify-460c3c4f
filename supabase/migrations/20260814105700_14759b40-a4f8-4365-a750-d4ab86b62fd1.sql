-- ── Language corpus health ────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.language_corpus_health
WITH (security_invoker = true) AS
SELECT
  lower(v.content_language)                        AS language,
  count(*) FILTER (
    WHERE v.is_hidden = false AND v.is_archived = false
      AND v.moderation_state IN ('approved','auto_approved')
  )::int                                            AS live_videos,
  count(DISTINCT v.channel_id) FILTER (
    WHERE v.is_hidden = false AND v.is_archived = false
      AND v.moderation_state IN ('approved','auto_approved')
  )::int                                            AS live_channels,
  count(*)::int                                     AS total_videos
FROM public.curated_videos v
WHERE v.content_language IS NOT NULL AND v.content_language <> ''
GROUP BY 1;

GRANT SELECT ON public.language_corpus_health TO authenticated, service_role;

COMMENT ON VIEW public.language_corpus_health IS
  'Per-language live corpus depth. Drives language-equity discovery scheduling.';

-- ── Fair, deficit-weighted discovery scheduling ───────────────────────────
-- Target live videos per supported language. Under-served languages get
-- scheduled first so a user who picks Bengali/Malay/Hindi/Persian does not
-- land on a near-empty feed and churn.
CREATE OR REPLACE FUNCTION public.next_topic_queries(
  p_limit int DEFAULT 16,
  p_target int DEFAULT 20000
)
RETURNS TABLE (id uuid, query text, language text, deficit numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH health AS (
    SELECT q.language,
           COALESCE(h.live_videos, 0) AS live_videos
    FROM (SELECT DISTINCT lower(language) AS language FROM public.discovery_topic_queries WHERE enabled) q
    LEFT JOIN public.language_corpus_health h ON h.language = q.language
  ),
  scored AS (
    SELECT t.id, t.query, lower(t.language) AS language,
           -- 1.0 = no content at all, 0.0 = target reached.
           GREATEST(0::numeric, 1::numeric - (h.live_videos::numeric / GREATEST(p_target, 1)::numeric)) AS deficit,
           ROW_NUMBER() OVER (
             PARTITION BY lower(t.language)
             ORDER BY t.last_run_at ASC NULLS FIRST, t.priority DESC, t.id
           ) AS lang_rank
    FROM public.discovery_topic_queries t
    JOIN health h ON h.language = lower(t.language)
    WHERE t.enabled
  )
  SELECT id, query, language, deficit
  FROM scored
  -- Round-robin across languages first (lang_rank), so a single language can
  -- never occupy more than ceil(p_limit / distinct_languages) slots, and
  -- within each round the neediest language goes first.
  WHERE lang_rank <= GREATEST(1, CEIL(p_limit::numeric / 4))
  ORDER BY lang_rank ASC, deficit DESC, random()
  LIMIT GREATEST(1, LEAST(p_limit, 200));
$$;

REVOKE ALL ON FUNCTION public.next_topic_queries(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_topic_queries(int, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_topic_queries(int, int) TO service_role;

COMMENT ON FUNCTION public.next_topic_queries(int, int) IS
  'Language-equity discovery scheduler: round-robins topic queries across languages, neediest corpus first.';