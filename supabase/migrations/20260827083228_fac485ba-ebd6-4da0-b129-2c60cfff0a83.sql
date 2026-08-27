GRANT SELECT, UPDATE ON public.feed_ranking_flags TO authenticated;
GRANT ALL ON public.feed_ranking_flags TO service_role;

DROP POLICY IF EXISTS feed_ranking_flags_read ON public.feed_ranking_flags;
CREATE POLICY feed_ranking_flags_read ON public.feed_ranking_flags
  FOR SELECT TO authenticated USING (true);