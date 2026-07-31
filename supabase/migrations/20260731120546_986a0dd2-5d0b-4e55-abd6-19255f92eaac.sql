CREATE OR REPLACE FUNCTION public.benefit_arm_readout(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  WITH exposure AS (
    SELECT user_id,
           MAX(CASE WHEN trace->>'benefit_arm' = 'treatment' THEN 1 ELSE 0 END) AS treated,
           COUNT(*) AS assemblies
    FROM public.feed_diversity_metrics
    WHERE user_id IS NOT NULL
      AND created_at > now() - make_interval(days => GREATEST(1, _days))
      AND trace ? 'benefit_arm'
    GROUP BY user_id
  ),
  arms AS (
    SELECT CASE WHEN treated = 1 THEN 'treatment' ELSE 'control' END AS arm, user_id
    FROM exposure
  ),
  labels AS (
    SELECT a.arm,
           COUNT(*) FILTER (WHERE b.responded_at IS NOT NULL) AS answered,
           COUNT(*) AS scheduled,
           COUNT(*) FILTER (WHERE b.worth_it IN ('yes', 'clearly_yes')) AS worth_it,
           COUNT(*) FILTER (WHERE b.acted_on IS TRUE) AS acted_on
    FROM arms a
    LEFT JOIN public.benefit_labels b
      ON b.user_id = a.user_id
     AND b.created_at > now() - make_interval(days => GREATEST(1, _days))
    GROUP BY a.arm
  )
  SELECT jsonb_build_object(
    'computed_at', now(),
    'window_days', GREATEST(1, _days),
    'arms', COALESCE(jsonb_agg(jsonb_build_object(
        'arm', l.arm,
        'users', (SELECT COUNT(*) FROM arms x WHERE x.arm = l.arm),
        'scheduled', l.scheduled,
        'answered', l.answered,
        'worth_it', l.worth_it,
        'acted_on', l.acted_on,
        'response_rate', CASE WHEN l.scheduled > 0 THEN round(l.answered::numeric / l.scheduled, 4) ELSE 0 END,
        'worth_it_rate', CASE WHEN l.answered > 0 THEN round(l.worth_it::numeric / l.answered, 4) ELSE 0 END
      ) ORDER BY l.arm), '[]'::jsonb)
  ) INTO _res
  FROM labels l;

  RETURN _res;
END;
$$;

REVOKE ALL ON FUNCTION public.benefit_arm_readout(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.benefit_arm_readout(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.benefit_arm_readout(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.benefit_arm_readout(integer) TO service_role;