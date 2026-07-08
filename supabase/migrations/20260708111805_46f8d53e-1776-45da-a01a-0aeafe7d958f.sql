
DROP POLICY IF EXISTS "attribution first-touch insert" ON public.attributions;

CREATE POLICY "attribution first-touch insert"
  ON public.attributions FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
