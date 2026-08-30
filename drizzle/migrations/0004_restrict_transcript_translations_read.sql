DROP POLICY IF EXISTS transcript_translations_public_read ON public.transcript_translations;

CREATE POLICY transcript_translations_read_approved
ON public.transcript_translations
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.curated_videos cv
    WHERE cv.video_id = transcript_translations.video_id
      AND cv.moderation_state = ANY (ARRAY['approved'::moderation_state, 'auto_approved'::moderation_state])
  )
);

CREATE POLICY transcript_translations_staff_read
ON public.transcript_translations
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'moderator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)
);

GRANT SELECT ON public.transcript_translations TO anon, authenticated;
GRANT ALL ON public.transcript_translations TO service_role;