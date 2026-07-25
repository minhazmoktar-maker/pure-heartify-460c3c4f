
CREATE OR REPLACE VIEW public.channel_discovery_progress AS
SELECT
  COALESCE(NULLIF(category, ''), 'uncategorized') AS category,
  COUNT(*)::int AS approved_channels,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS approved_7d,
  COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS approved_30d
FROM public.approved_channels
WHERE status = 'active'
GROUP BY 1
ORDER BY approved_channels DESC;

GRANT SELECT ON public.channel_discovery_progress TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_global_discovery_stats()
RETURNS TABLE (
  total_approved int,
  total_pending  int,
  total_queries  int,
  total_langs    int,
  total_topics   int,
  goal           int,
  pct_complete   numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.approved_channels WHERE status = 'active'),
    (SELECT COUNT(*)::int FROM public.channel_candidates WHERE status = 'pending'),
    (SELECT COUNT(*)::int FROM public.discovery_topic_queries WHERE enabled = true),
    (SELECT COUNT(DISTINCT language)::int FROM public.discovery_topic_queries WHERE enabled = true),
    (SELECT COUNT(DISTINCT topic)::int FROM public.discovery_topic_queries WHERE enabled = true),
    7000,
    ROUND((SELECT COUNT(*)::numeric FROM public.approved_channels WHERE status = 'active') * 100.0 / 7000.0, 2);
$$;

REVOKE EXECUTE ON FUNCTION public.get_global_discovery_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_global_discovery_stats() TO authenticated, service_role;
