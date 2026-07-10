DROP POLICY IF EXISTS "Anyone can view ameens" ON public.dua_ameens;
DROP POLICY IF EXISTS "Public can view ameens" ON public.dua_ameens;
DROP POLICY IF EXISTS "dua_ameens_select_all" ON public.dua_ameens;
DROP POLICY IF EXISTS "Ameens are viewable by everyone" ON public.dua_ameens;

CREATE POLICY "Authenticated users can view ameens"
  ON public.dua_ameens
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.dua_ameens FROM anon;