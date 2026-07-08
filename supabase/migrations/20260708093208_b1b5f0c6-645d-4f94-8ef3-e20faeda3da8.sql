
-- Cross-device playback positions
CREATE TABLE public.audio_playback_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  position_seconds NUMERIC NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  duration_seconds NUMERIC,
  device TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_playback_positions TO authenticated;
GRANT ALL ON public.audio_playback_positions TO service_role;
ALTER TABLE public.audio_playback_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own playback positions"
  ON public.audio_playback_positions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_audio_playback_positions_updated
  BEFORE UPDATE ON public.audio_playback_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_audio_pos_user_updated ON public.audio_playback_positions(user_id, updated_at DESC);

-- User-submitted audio problem reports
CREATE TABLE public.audio_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  track_id TEXT NOT NULL,
  track_title TEXT,
  track_url TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('wont_play','wrong_audio','invalid_metadata','poor_quality','offensive','other')),
  details TEXT,
  error_code TEXT,
  user_agent TEXT,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_reports TO authenticated;
GRANT ALL ON public.audio_reports TO service_role;
ALTER TABLE public.audio_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can file a report"
  ON public.audio_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see their own reports"
  ON public.audio_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins see all reports"
  ON public.audio_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "Admins manage reports"
  ON public.audio_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));
CREATE TRIGGER trg_audio_reports_updated
  BEFORE UPDATE ON public.audio_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_audio_reports_track ON public.audio_reports(track_id, created_at DESC);
CREATE INDEX idx_audio_reports_status ON public.audio_reports(status, created_at DESC);

-- Automated integrity check results (admin-only visibility)
CREATE TABLE public.audio_integrity_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL,
  track_id TEXT NOT NULL,
  track_title TEXT,
  url TEXT,
  status TEXT NOT NULL CHECK (status IN ('ok','unreachable','wrong_type','forbidden','too_small','timeout','coming_soon','error')),
  http_status INT,
  content_type TEXT,
  content_length BIGINT,
  latency_ms INT,
  error TEXT,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audio_integrity_reports TO authenticated;
GRANT ALL ON public.audio_integrity_reports TO service_role;
ALTER TABLE public.audio_integrity_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read integrity reports"
  ON public.audio_integrity_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));
CREATE INDEX idx_audio_integrity_run ON public.audio_integrity_reports(run_id, status);
CREATE INDEX idx_audio_integrity_track ON public.audio_integrity_reports(track_id, checked_at DESC);
