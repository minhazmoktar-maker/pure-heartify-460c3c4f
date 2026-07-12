
-- Phase 3: notification preferences matrix + web push subscriptions + onboarding fields

-- 1. Notification preferences matrix (kind × channel)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- e.g. 'daily_dose', 'streak_risk', 'prayer_time', 'social', 'weekly_recap', 'khatm', 'dua_ameen'
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start SMALLINT, -- 0-23 local hour
  quiet_hours_end SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notif prefs"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_notification_preferences_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_preferences_updated_at();

-- 2. Web Push subscriptions (browser-side, distinct from Capacitor device_tokens)
CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_push_subscriptions TO authenticated;
GRANT ALL ON public.web_push_subscriptions TO service_role;
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own web-push subs"
  ON public.web_push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS web_push_subscriptions_user_idx ON public.web_push_subscriptions(user_id);

-- 3. Onboarding fields on profiles (idempotent adds)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_reciter TEXT,
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT,
  ADD COLUMN IF NOT EXISTS daily_reminder_hour SMALLINT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 4. Seed sane defaults helper: on profile create, ensure a row exists per known kind.
CREATE OR REPLACE FUNCTION public.seed_default_notification_prefs(_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id, kind, push_enabled, email_enabled, in_app_enabled)
  VALUES
    (_user_id, 'daily_dose', true, false, true),
    (_user_id, 'streak_risk', true, false, true),
    (_user_id, 'prayer_time', true, false, true),
    (_user_id, 'social', false, false, true),
    (_user_id, 'weekly_recap', false, true, true),
    (_user_id, 'khatm', true, false, true),
    (_user_id, 'dua_ameen', false, false, true)
  ON CONFLICT (user_id, kind) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_default_notification_prefs(UUID) TO authenticated;
