-- ============================================================
-- MVP-3: Knowledge graph — concepts, prerequisites, segments
-- ============================================================

CREATE TABLE public.concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  arabic_term text,
  domain text NOT NULL,
  level smallint NOT NULL DEFAULT 1,
  summary text,
  aliases text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT concepts_level_range CHECK (level BETWEEN 1 AND 5),
  CONSTRAINT concepts_slug_shape CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

GRANT SELECT ON public.concepts TO anon, authenticated;
GRANT ALL ON public.concepts TO service_role;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published concepts"
  ON public.concepts FOR SELECT TO anon, authenticated
  USING (is_published);

CREATE POLICY "Staff can read all concepts"
  ON public.concepts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Staff can write concepts"
  ON public.concepts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX idx_concepts_domain ON public.concepts (domain, sort_order);
CREATE INDEX idx_concepts_level ON public.concepts (level);

CREATE TRIGGER update_concepts_updated_at
  BEFORE UPDATE ON public.concepts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- prerequisites (directed edges) ----------
CREATE TABLE public.concept_prerequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  prerequisite_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  strength numeric NOT NULL DEFAULT 1.0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (concept_id, prerequisite_id),
  CONSTRAINT prereq_not_self CHECK (concept_id <> prerequisite_id),
  CONSTRAINT prereq_strength_range CHECK (strength > 0 AND strength <= 1)
);

GRANT SELECT ON public.concept_prerequisites TO anon, authenticated;
GRANT ALL ON public.concept_prerequisites TO service_role;
ALTER TABLE public.concept_prerequisites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prerequisites"
  ON public.concept_prerequisites FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Staff can write prerequisites"
  ON public.concept_prerequisites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX idx_prereq_concept ON public.concept_prerequisites (concept_id);
CREATE INDEX idx_prereq_prerequisite ON public.concept_prerequisites (prerequisite_id);

-- Cycle guard: a prerequisite chain must stay a DAG.
CREATE OR REPLACE FUNCTION public.prevent_prerequisite_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE up AS (
      SELECT NEW.concept_id AS node
      UNION
      SELECT p.concept_id
      FROM public.concept_prerequisites p
      JOIN up ON p.prerequisite_id = up.node
    )
    SELECT 1 FROM up WHERE node = NEW.prerequisite_id
  ) THEN
    RAISE EXCEPTION 'prerequisite cycle: % cannot require %', NEW.concept_id, NEW.prerequisite_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_prerequisite_cycle
  BEFORE INSERT OR UPDATE ON public.concept_prerequisites
  FOR EACH ROW EXECUTE FUNCTION public.prevent_prerequisite_cycle();

-- ---------- video ↔ concept segment annotations ----------
CREATE TABLE public.concept_video_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  start_seconds integer,
  end_seconds integer,
  role text NOT NULL DEFAULT 'explains',
  confidence numeric NOT NULL DEFAULT 0.8,
  annotated_by text NOT NULL DEFAULT 'heartify.graph.v1',
  annotator_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (concept_id, video_id, start_seconds),
  CONSTRAINT segment_role_valid CHECK (role IN ('introduces','explains','applies','reviews')),
  CONSTRAINT segment_confidence_range CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT segment_bounds CHECK (
    (start_seconds IS NULL AND end_seconds IS NULL)
    OR (start_seconds >= 0 AND (end_seconds IS NULL OR end_seconds > start_seconds))
  )
);

GRANT SELECT ON public.concept_video_segments TO anon, authenticated;
GRANT ALL ON public.concept_video_segments TO service_role;
ALTER TABLE public.concept_video_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read concept segments"
  ON public.concept_video_segments FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Staff can write concept segments"
  ON public.concept_video_segments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX idx_segments_concept ON public.concept_video_segments (concept_id, confidence DESC);
CREATE INDEX idx_segments_video ON public.concept_video_segments (video_id);

CREATE TRIGGER update_concept_video_segments_updated_at
  BEFORE UPDATE ON public.concept_video_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- read helpers ----------
CREATE OR REPLACE FUNCTION public.get_concept(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT * FROM public.concepts WHERE slug = _slug AND is_published
  )
  SELECT CASE WHEN (SELECT COUNT(*) FROM c) = 0 THEN NULL ELSE jsonb_build_object(
    'concept', (SELECT to_jsonb(c) - 'is_published' FROM c),
    'prerequisites', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'slug', p.slug, 'title', p.title, 'domain', p.domain,
        'level', p.level, 'strength', e.strength, 'note', e.note
      ) ORDER BY e.strength DESC, p.sort_order)
      FROM public.concept_prerequisites e
      JOIN public.concepts p ON p.id = e.prerequisite_id AND p.is_published
      WHERE e.concept_id = (SELECT id FROM c)
    ), '[]'::jsonb),
    'unlocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'slug', n.slug, 'title', n.title, 'domain', n.domain, 'level', n.level
      ) ORDER BY n.sort_order)
      FROM public.concept_prerequisites e
      JOIN public.concepts n ON n.id = e.concept_id AND n.is_published
      WHERE e.prerequisite_id = (SELECT id FROM c)
    ), '[]'::jsonb),
    'segments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'video_id', s.video_id, 'title', v.title, 'channel_title', v.channel_title,
        'thumbnail_url', v.thumbnail_url, 'content_language', v.content_language,
        'start_seconds', s.start_seconds, 'end_seconds', s.end_seconds,
        'role', s.role, 'confidence', s.confidence
      ) ORDER BY s.confidence DESC, s.created_at)
      FROM public.concept_video_segments s
      JOIN public.curated_videos v ON v.video_id = s.video_id
        AND v.moderation_state IN ('approved','auto_approved')
      WHERE s.concept_id = (SELECT id FROM c)
      LIMIT 24
    ), '[]'::jsonb)
  ) END
$$;

REVOKE ALL ON FUNCTION public.get_concept(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_concept(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_concept_graph_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'concepts', (SELECT COUNT(*) FROM public.concepts WHERE is_published),
    'domains', (SELECT COUNT(DISTINCT domain) FROM public.concepts WHERE is_published),
    'prerequisite_edges', (SELECT COUNT(*) FROM public.concept_prerequisites),
    'segments', (SELECT COUNT(*) FROM public.concept_video_segments),
    'concepts_with_segments', (
      SELECT COUNT(DISTINCT concept_id) FROM public.concept_video_segments
    ),
    'concepts_with_prerequisites', (
      SELECT COUNT(DISTINCT concept_id) FROM public.concept_prerequisites
    ),
    'by_domain', COALESCE((
      SELECT jsonb_object_agg(domain, n) FROM (
        SELECT domain, COUNT(*) AS n FROM public.concepts WHERE is_published GROUP BY domain
      ) t
    ), '{}'::jsonb),
    'computed_at', now()
  )
$$;

REVOKE ALL ON FUNCTION public.get_concept_graph_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_concept_graph_stats() TO anon, authenticated, service_role;