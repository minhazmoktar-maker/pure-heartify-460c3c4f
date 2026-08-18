CREATE OR REPLACE FUNCTION public.benefit_arm_stats(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH exposure AS (
    SELECT user_id,
           MAX(CASE WHEN trace->>'benefit_arm' = 'treatment' THEN 1 ELSE 0 END) AS treated
    FROM public.feed_diversity_metrics
    WHERE user_id IS NOT NULL
      AND created_at > now() - make_interval(days => GREATEST(1, _days))
      AND trace ? 'benefit_arm'
    GROUP BY user_id
  ),
  arms AS (SELECT CASE WHEN treated = 1 THEN 'treatment' ELSE 'control' END AS arm, user_id FROM exposure),
  labels AS (
    SELECT a.arm,
           COUNT(b.id) FILTER (WHERE b.responded_at IS NOT NULL) AS answered,
           COUNT(b.id) AS scheduled,
           COUNT(b.id) FILTER (WHERE b.worth_it IN ('clearly_yes','somewhat')) AS worth_it
    FROM arms a
    LEFT JOIN public.benefit_labels b
      ON b.user_id = a.user_id AND b.created_at > now() - make_interval(days => GREATEST(1, _days))
    GROUP BY a.arm
  )
  SELECT COALESCE(jsonb_object_agg(arm, jsonb_build_object(
    'scheduled', scheduled, 'answered', answered, 'worth_it', worth_it,
    'worth_it_rate', CASE WHEN answered > 0 THEN round(worth_it::numeric / answered, 4) ELSE NULL END,
    'response_rate', CASE WHEN scheduled > 0 THEN round(answered::numeric / scheduled, 4) ELSE 0 END
  )), '{}'::jsonb) FROM labels;
$$;