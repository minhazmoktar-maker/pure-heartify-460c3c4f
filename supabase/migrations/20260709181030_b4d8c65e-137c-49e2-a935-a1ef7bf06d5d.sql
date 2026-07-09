
-- Phase 2: cross-device state tables. Additive only.

-- 1. dhikr_sessions ----------------------------------------------------------
CREATE TABLE public.dhikr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dhikr_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  target INTEGER CHECK (target IS NULL OR target > 0),
  source TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX dhikr_sessions_user_updated_idx ON public.dhikr_sessions(user_id, updated_at DESC);
CREATE INDEX dhikr_sessions_user_key_idx ON public.dhikr_sessions(user_id, dhikr_key);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dhikr_sessions TO authenticated;
GRANT ALL ON public.dhikr_sessions TO service_role;
ALTER TABLE public.dhikr_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dhikr sessions" ON public.dhikr_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. salah_log ---------------------------------------------------------------
CREATE TABLE public.salah_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prayer_date DATE NOT NULL,
  prayer TEXT NOT NULL CHECK (prayer IN ('fajr','dhuhr','asr','maghrib','isha')),
  prayed_at TIMESTAMPTZ,
  on_time BOOLEAN,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, prayer_date, prayer)
);
CREATE INDEX salah_log_user_date_idx ON public.salah_log(user_id, prayer_date DESC);
CREATE INDEX salah_log_user_updated_idx ON public.salah_log(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salah_log TO authenticated;
GRANT ALL ON public.salah_log TO service_role;
ALTER TABLE public.salah_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own salah log" ON public.salah_log FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. reading_progress --------------------------------------------------------
CREATE TABLE public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  position JSONB NOT NULL DEFAULT '{}'::jsonb,
  percent NUMERIC CHECK (percent IS NULL OR (percent >= 0 AND percent <= 100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_type, resource_id)
);
CREATE INDEX reading_progress_user_updated_idx ON public.reading_progress(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;
GRANT ALL ON public.reading_progress TO service_role;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reading progress" ON public.reading_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. device_registrations ----------------------------------------------------
CREATE TABLE public.device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('web','ios','android','watchos','wearos','tvos','androidtv','carplay','androidauto','other')),
  device_id TEXT NOT NULL,
  app_version TEXT,
  os_version TEXT,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, device_id)
);
CREATE INDEX device_registrations_user_idx ON public.device_registrations(user_id, last_seen_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_registrations TO authenticated;
GRANT ALL ON public.device_registrations TO service_role;
ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own device registrations" ON public.device_registrations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. user_preferences_v2 -----------------------------------------------------
CREATE TABLE public.user_preferences_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
CREATE INDEX user_preferences_v2_user_idx ON public.user_preferences_v2(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences_v2 TO authenticated;
GRANT ALL ON public.user_preferences_v2 TO service_role;
ALTER TABLE public.user_preferences_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own preferences v2" ON public.user_preferences_v2 FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers (reuse existing helper) --------------------------------
CREATE TRIGGER dhikr_sessions_updated_at BEFORE UPDATE ON public.dhikr_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER salah_log_updated_at BEFORE UPDATE ON public.salah_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER reading_progress_updated_at BEFORE UPDATE ON public.reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER device_registrations_updated_at BEFORE UPDATE ON public.device_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER user_preferences_v2_updated_at BEFORE UPDATE ON public.user_preferences_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
