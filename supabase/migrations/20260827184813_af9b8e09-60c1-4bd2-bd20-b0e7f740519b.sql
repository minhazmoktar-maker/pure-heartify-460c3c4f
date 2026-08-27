-- One call powering the support dashboard: resolution mix, cost, categories,
-- unresolved questions and pending FAQ drafts.
CREATE OR REPLACE FUNCTION public.admin_support_overview(_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - (greatest(coalesce(_days, 7), 1) || ' days')::interval;
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'window_days', greatest(coalesce(_days, 7), 1),
    'totals', (
      SELECT jsonb_build_object(
        'turns', count(*),
        'llm_turns', count(*) FILTER (WHERE llm_called),
        'zero_cost_turns', count(*) FILTER (WHERE NOT llm_called),
        'deflection_rate', round((count(*) FILTER (WHERE NOT llm_called))::numeric
                                 / greatest(count(*), 1), 4),
        'resolved_rate', round((count(*) FILTER (WHERE resolved))::numeric / greatest(count(*), 1), 4),
        'escalation_rate', round((count(*) FILTER (WHERE escalated))::numeric / greatest(count(*), 1), 4),
        'degraded_turns', count(*) FILTER (WHERE degraded),
        'injection_blocked', count(*) FILTER (WHERE injection_blocked),
        'validation_failed', count(*) FILTER (WHERE validation_failed),
        'cost_usd', round(coalesce(sum(cost_usd), 0)::numeric, 4),
        'cost_per_turn_usd', round((coalesce(sum(cost_usd), 0) / greatest(count(*), 1))::numeric, 6),
        'p50_latency_ms', percentile_disc(0.5) WITHIN GROUP (ORDER BY latency_ms),
        'p95_latency_ms', percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms)
      )
      FROM public.support_ai_usage WHERE created_at >= v_since
    ),
    'by_layer', (
      SELECT coalesce(jsonb_agg(x ORDER BY x->>'layer'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
                 'layer', layer,
                 'turns', count(*),
                 'cost_usd', round(coalesce(sum(cost_usd), 0)::numeric, 4),
                 'p95_latency_ms', percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms)
               ) AS x
          FROM public.support_ai_usage WHERE created_at >= v_since GROUP BY layer
      ) s
    ),
    'by_category', (
      SELECT coalesce(jsonb_agg(x ORDER BY (x->>'turns')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
                 'category', c,
                 'turns', count(*),
                 'escalation_rate', round((count(*) FILTER (WHERE escalated))::numeric / greatest(count(*), 1), 3)
               ) AS x
          FROM public.support_ai_usage u, unnest(coalesce(nullif(u.categories, ARRAY[]::text[]), ARRAY['unclassified'])) c
         WHERE u.created_at >= v_since
         GROUP BY c
         ORDER BY count(*) DESC
         LIMIT 20
      ) s
    ),
    'top_questions', (
      SELECT coalesce(jsonb_agg(x ORDER BY (x->>'asks')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('question', question_norm, 'asks', count(*),
                                  'llm_share', round((count(*) FILTER (WHERE llm_called))::numeric / greatest(count(*), 1), 2)) AS x
          FROM public.support_ai_usage
         WHERE created_at >= v_since AND question_norm IS NOT NULL
         GROUP BY question_norm ORDER BY count(*) DESC LIMIT 20
      ) s
    ),
    'knowledge_gaps', (
      SELECT coalesce(jsonb_agg(x ORDER BY (x->>'ask_count')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', id, 'question', sample_question, 'topic', topic,
                                  'ask_count', ask_count, 'status', status, 'last_seen_at', last_seen_at) AS x
          FROM public.support_knowledge_gaps
         WHERE status <> 'resolved' AND last_seen_at >= v_since
         ORDER BY ask_count DESC LIMIT 25
      ) s
    ),
    'pending_faq_drafts', (
      SELECT count(*) FROM public.support_faq_drafts WHERE status = 'needs_approval'
    ),
    'knowledge', (
      SELECT jsonb_build_object(
        'published', count(*) FILTER (WHERE status = 'published'),
        'faq_pairs', count(*) FILTER (WHERE status = 'published' AND faq_question IS NOT NULL),
        'superseded', count(*) FILTER (WHERE status = 'superseded'),
        'expiring_30d', count(*) FILTER (WHERE effective_until IS NOT NULL
                                          AND effective_until <= current_date + 30),
        'stale_180d', count(*) FILTER (WHERE status = 'published'
                                        AND coalesce(last_reviewed_at, updated_at) < now() - interval '180 days')
      ) FROM public.support_kb_documents
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_support_overview(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_overview(integer) TO authenticated;