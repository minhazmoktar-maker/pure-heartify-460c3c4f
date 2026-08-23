UPDATE public.discovery_topic_queries
SET priority = 100, enabled = true
WHERE lower(language) IN ('bn','ur','hi');

INSERT INTO public.discovery_topic_queries (query, topic, language, priority, enabled, origin)
SELECT v.q, v.topic, 'hi', 100, true, 'seed'
FROM (VALUES
  ('इस्लामिक बयान', 'lectures'),
  ('कुरान की तिलावत', 'quran'),
  ('इस्लामिक लेक्चर हिंदी', 'lectures'),
  ('सीरत उन नबी हिंदी', 'seerah'),
  ('हदीस हिंदी', 'hadith'),
  ('इस्लामिक तारीख डॉक्यूमेंट्री', 'history'),
  ('नमाज़ का तरीका', 'fiqh'),
  ('रमजान बयान हिंदी', 'ramadan'),
  ('इस्लामिक मोटिवेशन हिंदी', 'self-improvement'),
  ('तफ़सीर कुरान हिंदी', 'tafsir'),
  ('दुआ और अज़कार हिंदी', 'duas'),
  ('इस्लामिक सवाल जवाब हिंदी', 'fiqh'),
  ('मुस्लिम प्रोडक्टिविटी हिंदी', 'self-improvement'),
  ('इस्लामिक इतिहास हिंदी', 'history'),
  ('बच्चों के लिए इस्लामिक कहानी', 'kids')
) AS v(q, topic)
WHERE NOT EXISTS (
  SELECT 1 FROM public.discovery_topic_queries d
  WHERE lower(d.language) = 'hi' AND d.query = v.q
);

CREATE OR REPLACE FUNCTION public.next_topic_queries(
  p_limit int DEFAULT 16,
  p_target int DEFAULT 20000
)
RETURNS TABLE (id uuid, query text, language text, deficit numeric, score numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
             * (CASE WHEN lower(t.language) IN ('bn','ur','hi') THEN 3.0 ELSE 1.0 END) AS score,
           (lower(t.language) IN ('bn','ur','hi')) AS is_launch,
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
$$;

REVOKE ALL ON FUNCTION public.next_topic_queries(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_topic_queries(int, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_topic_queries(int, int) TO service_role;