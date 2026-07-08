-- Community video/channel reporting workflow
CREATE TABLE public.video_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  video_id TEXT,
  channel_id TEXT,
  channel_title TEXT,
  video_title TEXT,
  reason TEXT NOT NULL CHECK (reason IN (
    'inappropriate_content','misinformation','copyright','spam','hate_speech',
    'sexual_content','violence','music_or_haram','wrong_metadata','broken_video','other'
  )),
  details TEXT CHECK (details IS NULL OR length(details) <= 2000),
  severity TEXT NOT NULL DEFAULT 'normal' CHECK (severity IN ('low','normal','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open','investigating','resolved_no_action','resolved_content_removed',
    'resolved_score_adjusted','resolved_channel_banned','dismissed_invalid','dismissed_duplicate'
  )),
  resolution TEXT,
  moderator_id UUID REFERENCES auth.users ON DELETE SET NULL,
  moderator_notes TEXT,
  notify_reporter BOOLEAN NOT NULL DEFAULT true,
  reporter_notified_at TIMESTAMP WITH TIME ZONE,
  user_agent TEXT,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT video_reports_target_present CHECK (video_id IS NOT NULL OR channel_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE ON public.video_reports TO authenticated;
GRANT ALL ON public.video_reports TO service_role;
ALTER TABLE public.video_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users file their own reports"
  ON public.video_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users see their own reports"
  ON public.video_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins see all reports"
  ON public.video_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));

CREATE POLICY "Admins update reports"
  ON public.video_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));

CREATE TRIGGER trg_video_reports_updated
  BEFORE UPDATE ON public.video_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_video_reports_status ON public.video_reports(status, created_at DESC);
CREATE INDEX idx_video_reports_video ON public.video_reports(video_id, created_at DESC);
CREATE INDEX idx_video_reports_channel ON public.video_reports(channel_id, created_at DESC);
CREATE INDEX idx_video_reports_user ON public.video_reports(user_id, created_at DESC);

-- Full audit trail of every moderator touch on a report
CREATE TABLE public.report_moderation_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.video_reports(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'assign','investigate','remove_video','ban_channel','lower_halal_score',
    'raise_halal_score','dismiss','resolve','note','notify_reporter'
  )),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.report_moderation_actions TO authenticated;
GRANT ALL ON public.report_moderation_actions TO service_role;
ALTER TABLE public.report_moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins insert moderation actions"
  ON public.report_moderation_actions FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()))
              AND moderator_id = auth.uid());

CREATE POLICY "Admins view moderation actions"
  ON public.report_moderation_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));

CREATE INDEX idx_report_actions_report ON public.report_moderation_actions(report_id, created_at DESC);

-- Reporter-side helper: has this user filed too many reports recently?
CREATE OR REPLACE FUNCTION public.recent_video_report_count(_user_id UUID, _window_minutes INT DEFAULT 60)
RETURNS INT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.video_reports
  WHERE user_id = _user_id
    AND created_at > now() - make_interval(mins => _window_minutes);
$$;

-- Admin queue summary function
CREATE OR REPLACE FUNCTION public.video_report_queue_summary()
RETURNS TABLE(status TEXT, total BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid())) THEN
    RAISE EXCEPTION 'video_report_queue_summary: forbidden';
  END IF;
  RETURN QUERY
    SELECT vr.status, count(*)::bigint
    FROM public.video_reports vr
    GROUP BY vr.status
    ORDER BY vr.status;
END;
$$;