CREATE OR REPLACE FUNCTION public.annotate_concept_segments(
  _concept_limit integer DEFAULT 500,
  _videos_per_concept integer DEFAULT 6,
  _min_rank numeric DEFAULT 0.02
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
  qtext text;
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

    -- Distinctive keywords only: >=4 chars, minus generic scaffolding words.
    SELECT array_to_string(
      array(
        SELECT DISTINCT lower(t)
        FROM unnest(regexp_split_to_array(
          regexp_replace(c.title, '[^a-zA-Z0-9 ]', ' ', 'g'), '\s+')) AS t
        WHERE length(t) >= 4
          AND lower(t) NOT IN (
            'what','with','from','their','that','this','step','ladder','introduction',
            'basics','about','when','were','been','into','they','them','than','then',
            'them','over','only','also','such','more','most','common','types','level'
          )
      ), ' | ') INTO qtext;

    IF qtext IS NULL OR qtext = '' THEN
      CONTINUE;
    END IF;

    WITH hits AS (
      SELECT v.video_id,
             ts_rank_cd(v.search_tsv, to_tsquery('english', qtext)) AS rank
      FROM public.curated_videos v
      WHERE v.moderation_state IN ('approved', 'auto_approved')
        AND COALESCE(v.is_hidden, false) = false
        AND COALESCE(v.is_archived, false) = false
        AND v.search_tsv @@ to_tsquery('english', qtext)
      ORDER BY rank DESC, v.published_at DESC NULLS LAST
      LIMIT GREATEST(_videos_per_concept, 1)
    ), ins AS (
      INSERT INTO public.concept_video_segments
        (concept_id, video_id, role, confidence, annotated_by)
      SELECT c.id,
             h.video_id,
             CASE WHEN c.level <= 1 THEN 'introduces' ELSE 'explains' END,
             LEAST(0.75, GREATEST(0.30, ROUND((h.rank * 4)::numeric, 2))),
             'heartify.graph.autolink.v2'
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