-- Malay corpus is the emptiest of the target markets (9 videos, 3 channels) but
-- was not in the launch boost set, so its 158 enabled queries almost never ran.
CREATE OR REPLACE FUNCTION public.next_topic_queries(p_limit integer DEFAULT 16, p_target integer DEFAULT 20000)
 RETURNS TABLE(id uuid, query text, language text, deficit numeric, score numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH demand AS (
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
           GREATEST(0::numeric, 1::numeric - (h.live_videos::numeric / GREATEST(p_target, 1)::numeric)) AS deficit,
           GREATEST(0::numeric, 1::numeric - (h.live_videos::numeric / GREATEST(p_target, 1)::numeric))
             * (0.25 + COALESCE(d.demand, 0))
             * (1 + LEAST(COALESCE(t.priority, 0), 100)::numeric / 20)
             * (CASE WHEN lower(t.language) IN ('bn','ur','hi','ms') THEN 3.0 ELSE 1.0 END) AS score,
           (lower(t.language) IN ('bn','ur','hi','ms')) AS is_launch,
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
  WHERE lang_rank <= CASE
      WHEN is_launch THEN GREATEST(4, CEIL(p_limit::numeric / 2))
      ELSE GREATEST(1, CEIL(p_limit::numeric / 4))
    END
  ORDER BY is_launch DESC, lang_rank ASC, score DESC, random()
  LIMIT GREATEST(1, LEAST(p_limit, 200));
$function$;