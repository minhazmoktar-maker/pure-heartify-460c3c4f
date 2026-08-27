CREATE OR REPLACE FUNCTION public.admin_support_gap_report(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - (greatest(coalesce(_days, 30), 1) || ' days')::interval;
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'window_days', greatest(coalesce(_days, 30), 1),
    'by_category', (
      SELECT coalesce(jsonb_agg(x ORDER BY (x->>'asks')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
                 'category', coalesce(nullif(topic, ''), 'unclassified'),
                 'gaps', count(*),
                 'open', count(*) FILTER (WHERE status = 'open'),
                 'resolved', count(*) FILTER (WHERE status = 'resolved'),
                 'dismissed', count(*) FILTER (WHERE status NOT IN ('open', 'resolved')),
                 'asks', coalesce(sum(ask_count), 0),
                 'resolution_rate', round((count(*) FILTER (WHERE status = 'resolved'))::numeric
                                          / greatest(count(*), 1), 3),
                 'best_confidence', round(coalesce(max(best_confidence), 0)::numeric, 2),
                 'locales', (SELECT coalesce(jsonb_agg(DISTINCT coalesce(g2.locale, 'en')), '[]'::jsonb)
                               FROM public.support_knowledge_gaps g2
                              WHERE coalesce(nullif(g2.topic, ''), 'unclassified') = coalesce(nullif(g.topic, ''), 'unclassified')
                                AND g2.last_seen_at >= v_since),
                 'top_question', (SELECT g3.sample_question
                                    FROM public.support_knowledge_gaps g3
                                   WHERE coalesce(nullif(g3.topic, ''), 'unclassified') = coalesce(nullif(g.topic, ''), 'unclassified')
                                     AND g3.last_seen_at >= v_since
                                   ORDER BY g3.ask_count DESC LIMIT 1),
                 'last_seen_at', max(last_seen_at)
               ) AS x
          FROM public.support_knowledge_gaps g
         WHERE last_seen_at >= v_since
         GROUP BY coalesce(nullif(topic, ''), 'unclassified'), topic
      ) s
    ),
    'pending_drafts', (
      SELECT coalesce(jsonb_agg(x ORDER BY (x->>'ask_count')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
                 'id', d.id,
                 'question', d.draft_question,
                 'answer', d.draft_answer,
                 'category', d.category,
                 'locale', d.locale,
                 'ask_count', coalesce(gp.ask_count, 0),
                 'created_at', d.created_at
               ) AS x
          FROM public.support_faq_drafts d
          LEFT JOIN public.support_knowledge_gaps gp ON gp.id = d.gap_id
         WHERE d.status = 'needs_approval'
         ORDER BY coalesce(gp.ask_count, 0) DESC
         LIMIT 50
      ) s
    ),
    'totals', (
      SELECT jsonb_build_object(
        'gaps', count(*),
        'open', count(*) FILTER (WHERE status = 'open'),
        'resolved', count(*) FILTER (WHERE status = 'resolved'),
        'resolution_rate', round((count(*) FILTER (WHERE status = 'resolved'))::numeric / greatest(count(*), 1), 3),
        'pending_drafts', (SELECT count(*) FROM public.support_faq_drafts WHERE status = 'needs_approval')
      ) FROM public.support_knowledge_gaps WHERE last_seen_at >= v_since
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_support_gap_report(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_support_gap_report(integer) TO authenticated;