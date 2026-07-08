
-- 1. User locale preferences
CREATE TABLE public.user_locale_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ui_language TEXT NOT NULL DEFAULT 'en',
  content_languages TEXT[] NOT NULL DEFAULT ARRAY['en','ar']::text[],
  country_code TEXT,
  region TEXT,
  rtl_override BOOLEAN,
  auto_personalize BOOLEAN NOT NULL DEFAULT true,
  diversity_level SMALLINT NOT NULL DEFAULT 50 CHECK (diversity_level BETWEEN 0 AND 100),
  detected_country TEXT,
  detected_language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_locale_preferences TO authenticated;
GRANT ALL ON public.user_locale_preferences TO service_role;
ALTER TABLE public.user_locale_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own locale prefs" ON public.user_locale_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_locale_prefs_updated
  BEFORE UPDATE ON public.user_locale_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Regional language mix (country → language ratios)
CREATE TABLE public.regional_language_mix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  language_mix JSONB NOT NULL, -- e.g. {"en":0.6,"tr":0.4}
  default_ui_language TEXT NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regional_language_mix TO anon, authenticated;
GRANT ALL ON public.regional_language_mix TO service_role;
ALTER TABLE public.regional_language_mix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads regional mix" ON public.regional_language_mix
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage regional mix" ON public.regional_language_mix
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));
CREATE TRIGGER trg_regional_mix_updated
  BEFORE UPDATE ON public.regional_language_mix
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed baseline regional mixes (from spec)
INSERT INTO public.regional_language_mix (country_code, country_name, language_mix, default_ui_language) VALUES
  ('TR','Turkey',      '{"en":0.6,"tr":0.4}'::jsonb, 'tr'),
  ('BD','Bangladesh',  '{"bn":0.5,"en":0.3,"ar":0.2}'::jsonb, 'bn'),
  ('ID','Indonesia',   '{"id":0.5,"en":0.3,"ar":0.2}'::jsonb, 'id'),
  ('FR','France',      '{"fr":0.7,"en":0.3}'::jsonb, 'fr'),
  ('DE','Germany',     '{"de":0.7,"en":0.3}'::jsonb, 'de'),
  ('SA','Saudi Arabia','{"ar":0.8,"en":0.2}'::jsonb, 'ar'),
  ('US','United States','{"en":0.85,"ar":0.15}'::jsonb, 'en'),
  ('GB','United Kingdom','{"en":0.85,"ar":0.15}'::jsonb, 'en'),
  ('PK','Pakistan',    '{"en":0.5,"ur":0.35,"ar":0.15}'::jsonb, 'en'),
  ('MY','Malaysia',    '{"ms":0.5,"en":0.35,"ar":0.15}'::jsonb, 'ms')
ON CONFLICT (country_code) DO NOTHING;

-- 3. Add content_language to curated_videos for language-aware ranking
ALTER TABLE public.curated_videos
  ADD COLUMN IF NOT EXISTS content_language TEXT;
CREATE INDEX IF NOT EXISTS idx_curated_videos_content_language
  ON public.curated_videos(content_language);
