CREATE OR REPLACE FUNCTION public.benefit_priors_v1()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH labeled AS (
  SELECT cv.channel_id,
         cv.category,
         CASE bl.worth_it
           WHEN 'clearly_yes' THEN 1.0
           WHEN 'somewhat'    THEN 0.6
           WHEN 'not_really'  THEN 0.15
           WHEN 'regret'      THEN 0.0
           ELSE 0.6
         END AS v
  FROM public.benefit_labels bl
  JOIN public.curated_videos cv ON cv.video_id = bl.video_id
  WHERE bl.responded_at IS NOT NULL
),
g AS (SELECT COALESCE(AVG(v), 0.6) AS mean, COUNT(*) AS n FROM labeled),
ch AS (
  SELECT channel_id,
         (SUM(v) + 5 * (SELECT mean FROM g)) / (COUNT(*) + 5) AS score,
         COUNT(*) AS n
  FROM labeled
  WHERE channel_id IS NOT NULL
  GROUP BY channel_id
),
cat AS (
  SELECT category,
         (SUM(v) + 8 * (SELECT mean FROM g)) / (COUNT(*) + 8) AS score,
         COUNT(*) AS n
  FROM labeled
  WHERE category IS NOT NULL
  GROUP BY category
)
SELECT jsonb_build_object(
  'global', ROUND((SELECT mean FROM g)::numeric, 4),
  'sample_size', (SELECT n FROM g),
  'channels', COALESCE((
    SELECT jsonb_object_agg(channel_id, jsonb_build_array(ROUND(score::numeric, 4), n))
    FROM (SELECT * FROM ch ORDER BY n DESC LIMIT 2000) x
  ), '{}'::jsonb),
  'categories', COALESCE((
    SELECT jsonb_object_agg(category, jsonb_build_array(ROUND(score::numeric, 4), n))
    FROM cat
  ), '{}'::jsonb)
);
$$;

REVOKE ALL ON FUNCTION public.benefit_priors_v1() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.benefit_priors_v1() FROM anon;
GRANT EXECUTE ON FUNCTION public.benefit_priors_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.benefit_priors_v1() TO service_role;