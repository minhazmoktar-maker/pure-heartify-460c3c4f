ALTER TABLE public.curated_videos
  ADD COLUMN IF NOT EXISTS embeddable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS embed_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_curated_videos_embeddable ON public.curated_videos (embeddable) WHERE embeddable = false;

CREATE OR REPLACE FUNCTION public.report_video_unplayable(_video_id text, _reason text DEFAULT 'embed_disabled')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated int;
BEGIN
  IF _video_id IS NULL OR _video_id !~ '^[A-Za-z0-9_-]{11}$' THEN
    RETURN false;
  END IF;

  UPDATE public.curated_videos
     SET embeddable = false,
         is_hidden = true,
         embed_checked_at = now(),
         moderation_reasoning = COALESCE(moderation_reasoning, '') || ' | unplayable: ' || COALESCE(_reason, 'embed_disabled')
   WHERE video_id = _video_id
     AND embeddable = true;
  GET DIAGNOSTICS _updated = ROW_COUNT;

  RETURN _updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.report_video_unplayable(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_video_unplayable(text, text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS transcript_jobs_auth_read ON public.transcript_jobs;
CREATE POLICY transcript_jobs_owner_admin_read ON public.transcript_jobs
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));