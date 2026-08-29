-- Transcript text for videos still in moderation was publicly readable.
-- Replace blanket public SELECT with join-based policies limited to
-- approved/auto-approved videos, plus moderator/admin and service_role access.

DROP POLICY IF EXISTS video_transcripts_public_read ON public.video_transcripts;
DROP POLICY IF EXISTS transcript_segments_public_read ON public.transcript_segments;

CREATE POLICY video_transcripts_read_approved
ON public.video_transcripts
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.curated_videos cv
    WHERE cv.video_id = video_transcripts.video_id
      AND cv.moderation_state IN ('approved', 'auto_approved')
  )
);

CREATE POLICY transcript_segments_read_approved
ON public.transcript_segments
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.curated_videos cv
    WHERE cv.video_id = transcript_segments.video_id
      AND cv.moderation_state IN ('approved', 'auto_approved')
  )
);

CREATE POLICY video_transcripts_staff_read
ON public.video_transcripts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY transcript_segments_staff_read
ON public.transcript_segments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.video_transcripts TO anon, authenticated;
GRANT SELECT ON public.transcript_segments TO anon, authenticated;
GRANT ALL ON public.video_transcripts TO service_role;
GRANT ALL ON public.transcript_segments TO service_role;