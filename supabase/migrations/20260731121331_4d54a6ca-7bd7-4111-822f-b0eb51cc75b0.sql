
-- ============ Learning paths (MVP-6) ============
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  domain text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_paths TO anon;
GRANT SELECT ON public.learning_paths TO authenticated;
GRANT ALL ON public.learning_paths TO service_role;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_paths_public_read" ON public.learning_paths
  FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "learning_paths_admin_write" ON public.learning_paths
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.learning_path_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path_id, concept_id),
  UNIQUE (path_id, step_order)
);
CREATE INDEX IF NOT EXISTS learning_path_steps_path_idx ON public.learning_path_steps(path_id, step_order);
GRANT SELECT ON public.learning_path_steps TO anon;
GRANT SELECT ON public.learning_path_steps TO authenticated;
GRANT ALL ON public.learning_path_steps TO service_role;
ALTER TABLE public.learning_path_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_path_steps_public_read" ON public.learning_path_steps
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.published));
CREATE POLICY "learning_path_steps_admin_write" ON public.learning_path_steps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.learning_path_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, path_id, concept_id)
);
CREATE INDEX IF NOT EXISTS learning_path_progress_user_idx ON public.learning_path_progress(user_id, path_id);
GRANT SELECT, INSERT, DELETE ON public.learning_path_progress TO authenticated;
GRANT ALL ON public.learning_path_progress TO service_role;
ALTER TABLE public.learning_path_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lpp_select_own" ON public.learning_path_progress
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "lpp_insert_own" ON public.learning_path_progress
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "lpp_delete_own" ON public.learning_path_progress
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER learning_paths_touch BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER learning_path_steps_touch BEFORE UPDATE ON public.learning_path_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER learning_path_progress_touch BEFORE UPDATE ON public.learning_path_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Seed four starter paths from the concept graph ============
INSERT INTO public.learning_paths (slug, title, subtitle, domain, description, sort_order)
VALUES
  ('foundations-of-iman', 'Foundations of iman', 'Start where creed actually starts', 'Aqidah',
   'Eight concepts in prerequisite order, each with reviewed lessons: what belief is, what breaks it, and how to keep it sound.', 1),
  ('living-with-the-quran', 'Living with the Qur''an', 'From recitation to understanding', 'Qur''an',
   'A short ladder through how the Qur''an was revealed, preserved, recited and understood.', 2),
  ('purifying-the-heart', 'Purifying the heart', 'Character before knowledge', 'Character & purification',
   'The diseases of the heart and their remedies, ordered so each step builds on the last.', 3),
  ('the-prophetic-life', 'The prophetic life', 'The Seerah, in order', 'Seerah',
   'Follow the life of the Prophet ﷺ from Makkah to Madinah through reviewed lessons.', 4)
ON CONFLICT (slug) DO NOTHING;

WITH picked AS (
  SELECT p.id AS path_id,
         c.id AS concept_id,
         ROW_NUMBER() OVER (
           PARTITION BY p.id
           ORDER BY (SELECT count(*) FROM public.concept_prerequisites cp WHERE cp.concept_id = c.id),
                    c.title
         ) AS rn
  FROM public.learning_paths p
  JOIN public.concepts c ON c.domain = p.domain
  WHERE (SELECT count(*) FROM public.concept_video_segments s WHERE s.concept_id = c.id) >= 2
)
INSERT INTO public.learning_path_steps (path_id, concept_id, step_order)
SELECT path_id, concept_id, rn FROM picked WHERE rn <= 8
ON CONFLICT DO NOTHING;

-- ============ Read helpers ============
CREATE OR REPLACE FUNCTION public.get_learning_paths()
RETURNS TABLE (
  slug text, title text, subtitle text, domain text, description text,
  step_count int, completed_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.slug, p.title, p.subtitle, p.domain, p.description,
         (SELECT count(*)::int FROM public.learning_path_steps s WHERE s.path_id = p.id),
         (SELECT count(*)::int FROM public.learning_path_progress g
           WHERE g.path_id = p.id AND g.user_id = auth.uid())
  FROM public.learning_paths p
  WHERE p.published
  ORDER BY p.sort_order, p.title
$$;
REVOKE ALL ON FUNCTION public.get_learning_paths() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_learning_paths() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_learning_path(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'slug', p.slug,
    'title', p.title,
    'subtitle', p.subtitle,
    'domain', p.domain,
    'description', p.description,
    'steps', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'step_order', s.step_order,
        'concept_slug', c.slug,
        'title', c.title,
        'arabic_term', c.arabic_term,
        'summary', c.summary,
        'lesson_count', (SELECT count(*) FROM public.concept_video_segments v WHERE v.concept_id = c.id),
        'completed', EXISTS (
          SELECT 1 FROM public.learning_path_progress g
          WHERE g.path_id = p.id AND g.concept_id = c.id AND g.user_id = auth.uid()
        )
      ) ORDER BY s.step_order)
      FROM public.learning_path_steps s
      JOIN public.concepts c ON c.id = s.concept_id
      WHERE s.path_id = p.id
    ), '[]'::jsonb)
  )
  FROM public.learning_paths p
  WHERE p.slug = _slug AND p.published
$$;
REVOKE ALL ON FUNCTION public.get_learning_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_learning_path(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_learning_step_progress(_path_slug text, _concept_slug text, _completed boolean)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path uuid;
  v_concept uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT p.id INTO v_path FROM public.learning_paths p WHERE p.slug = _path_slug AND p.published;
  IF v_path IS NULL THEN
    RAISE EXCEPTION 'unknown path';
  END IF;

  SELECT c.id INTO v_concept
  FROM public.concepts c
  JOIN public.learning_path_steps s ON s.concept_id = c.id AND s.path_id = v_path
  WHERE c.slug = _concept_slug;
  IF v_concept IS NULL THEN
    RAISE EXCEPTION 'concept is not a step in this path';
  END IF;

  IF _completed THEN
    INSERT INTO public.learning_path_progress (user_id, path_id, concept_id)
    VALUES (auth.uid(), v_path, v_concept)
    ON CONFLICT (user_id, path_id, concept_id) DO NOTHING;
  ELSE
    DELETE FROM public.learning_path_progress
    WHERE user_id = auth.uid() AND path_id = v_path AND concept_id = v_concept;
  END IF;

  RETURN _completed;
END;
$$;
REVOKE ALL ON FUNCTION public.set_learning_step_progress(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_learning_step_progress(text, text, boolean) TO authenticated, service_role;
