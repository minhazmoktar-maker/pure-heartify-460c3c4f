GRANT UPDATE ON public.creator_upload_captions TO authenticated;

CREATE POLICY "creators edit own upload captions"
ON public.creator_upload_captions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.creator_uploads u
    WHERE u.id = creator_upload_captions.upload_id
      AND (u.user_id = auth.uid() OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.creator_uploads u
    WHERE u.id = creator_upload_captions.upload_id
      AND (u.user_id = auth.uid() OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'))
  )
);