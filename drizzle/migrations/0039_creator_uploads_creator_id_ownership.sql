CREATE OR REPLACE FUNCTION public.owns_creator_account(_creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _creator_id IS NULL OR EXISTS (
    SELECT 1 FROM public.creator_accounts a
    WHERE a.id = _creator_id AND a.user_id = auth.uid()
  )
$$;

DROP POLICY IF EXISTS "creator_uploads_owner_insert_draft" ON public.creator_uploads;
CREATE POLICY "creator_uploads_owner_insert_draft" ON public.creator_uploads
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'draft'
    AND COALESCE(visual_state, 'pending') <> 'clean'
    AND public.owns_creator_account(creator_id)
  );

DROP POLICY IF EXISTS "creator_uploads_owner_update_draft" ON public.creator_uploads;
CREATE POLICY "creator_uploads_owner_update_draft" ON public.creator_uploads
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND status IN ('draft','rejected')
    AND public.owns_creator_account(creator_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('draft','rejected')
    AND visual_state <> 'clean'
    AND public.owns_creator_account(creator_id)
  );