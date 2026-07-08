DROP POLICY IF EXISTS "attribution owner update" ON public.attributions;

CREATE POLICY "attribution owner update"
ON public.attributions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
