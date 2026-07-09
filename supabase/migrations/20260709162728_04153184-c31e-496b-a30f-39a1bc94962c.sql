
-- Remove permissive public SELECT policies on dua_requests
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='dua_requests' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.dua_requests', pol.policyname);
  END LOOP;
END $$;

-- Only owners may read raw rows (which contain user_id)
CREATE POLICY "Owners view their own dua requests"
ON public.dua_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Safe public projection: nulls user_id for anonymous rows
CREATE OR REPLACE FUNCTION public.list_dua_wall(_limit int DEFAULT 100)
RETURNS TABLE(id uuid, user_id uuid, body text, is_anonymous boolean, ameen_count integer, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id,
         CASE WHEN is_anonymous THEN NULL ELSE user_id END AS user_id,
         body,
         is_anonymous,
         ameen_count,
         created_at
  FROM public.dua_requests
  ORDER BY created_at DESC
  LIMIT COALESCE(_limit, 100);
$$;

GRANT EXECUTE ON FUNCTION public.list_dua_wall(int) TO anon, authenticated;
