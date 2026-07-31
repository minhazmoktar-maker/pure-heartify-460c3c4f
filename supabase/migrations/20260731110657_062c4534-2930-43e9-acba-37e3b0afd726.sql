-- MVP-3: automatic concept → video segment matching over the approved corpus.
CREATE OR REPLACE FUNCTION public.annotate_concept_segments(
  _concept_limit integer DEFAULT 500,
  _videos_per_concept integer DEFAULT 6,
  _min_rank numeric DEFAULT 0.05
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  inserted integer := 0;
  touched integer := 0;
  matched integer := 0;
BEGIN
  FOR c IN
    SELECT k.id, k.slug, k.title, k.level
    FROM public.concepts k
    WHERE k.is_published
      AND NOT EXISTS (
        SELECT 1 FROM public.concept_video_segments s WHERE s.concept_id = k.id
      )
    ORDER BY k.sort_order
    LIMIT GREATEST(_concept_limit, 0)
  LOOP
    touched := touched + 1;

    WITH qry AS (
      SELECT websearch_to_tsquery('english', regexp_replace(c.title, '[^a-zA-Z0-9 ]', ' ', 'g')) AS q
    ), hits AS (
      SELECT v.video_id,
             ts_rank(v.search_tsv, (SELECT q FROM qry)) AS rank
      FROM public.curated_videos v
      WHERE v.moderation_state IN ('approved', 'auto_approved')
        AND COALESCE(v.is_hidden, false) = false
        AND COALESCE(v.is_archived, false) = false
        AND v.search_tsv @@ (SELECT q FROM qry)
      ORDER BY rank DESC, v.published_at DESC NULLS LAST
      LIMIT GREATEST(_videos_per_concept, 1)
    ), ins AS (
      INSERT INTO public.concept_video_segments
        (concept_id, video_id, role, confidence, annotated_by)
      SELECT c.id,
             h.video_id,
             CASE WHEN c.level <= 1 THEN 'introduces' ELSE 'explains' END,
             LEAST(0.75, GREATEST(0.30, ROUND((h.rank * 6)::numeric, 2))),
             'heartify.graph.autolink.v1'
      FROM hits h
      WHERE h.rank >= _min_rank
      ON CONFLICT (concept_id, video_id, start_seconds) DO NOTHING
      RETURNING 1
    )
    SELECT COUNT(*) INTO STRICT matched FROM ins;

    inserted := inserted + matched;
  END LOOP;

  RETURN jsonb_build_object(
    'concepts_processed', touched,
    'segments_inserted', inserted,
    'stats', public.get_concept_graph_stats()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.annotate_concept_segments(integer, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.annotate_concept_segments(integer, integer, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.concept_coverage_gaps(_limit integer DEFAULT 50)
RETURNS TABLE(slug text, title text, domain text, level smallint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT k.slug, k.title, k.domain, k.level
  FROM public.concepts k
  WHERE k.is_published
    AND NOT EXISTS (SELECT 1 FROM public.concept_video_segments s WHERE s.concept_id = k.id)
  ORDER BY k.sort_order
  LIMIT GREATEST(_limit, 0)
$$;

REVOKE ALL ON FUNCTION public.concept_coverage_gaps(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concept_coverage_gaps(integer) TO authenticated, service_role;