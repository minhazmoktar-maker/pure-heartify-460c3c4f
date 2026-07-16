
-- Phase P1.2D — Confidence-tiered moderation pipeline (foundation)

ALTER TABLE public.channel_candidates
  ADD COLUMN IF NOT EXISTS tier CHAR(1),
  ADD COLUMN IF NOT EXISTS tier_reason TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS auto_action TEXT,
  ADD COLUMN IF NOT EXISTS moderation_summary JSONB,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER,
  ADD COLUMN IF NOT EXISTS cluster_id UUID,
  ADD COLUMN IF NOT EXISTS learned_weight_version INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='channel_candidates_tier_check') THEN
    ALTER TABLE public.channel_candidates
      ADD CONSTRAINT channel_candidates_tier_check CHECK (tier IS NULL OR tier IN ('A','B','C','D'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='channel_candidates_auto_action_check') THEN
    ALTER TABLE public.channel_candidates
      ADD CONSTRAINT channel_candidates_auto_action_check
      CHECK (auto_action IS NULL OR auto_action IN ('auto_approved','queued_fast','queued_full','auto_rejected','quarantined'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS channel_candidates_tier_status_idx ON public.channel_candidates (tier, status);
CREATE INDEX IF NOT EXISTS channel_candidates_cluster_idx ON public.channel_candidates (cluster_id);
CREATE INDEX IF NOT EXISTS channel_candidates_auto_action_idx ON public.channel_candidates (auto_action);

-- trusted_institutions
CREATE TABLE IF NOT EXISTS public.trusted_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_type TEXT NOT NULL,
  match_pattern TEXT NOT NULL,
  language TEXT, country TEXT,
  min_subs INTEGER DEFAULT 5000,
  weight NUMERIC DEFAULT 1.0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trusted_institutions TO authenticated;
GRANT ALL ON public.trusted_institutions TO service_role;
ALTER TABLE public.trusted_institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read trusted_institutions" ON public.trusted_institutions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage trusted_institutions" ON public.trusted_institutions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- verified_scholars
CREATE TABLE IF NOT EXISTS public.verified_scholars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}'::text[],
  youtube_channel_ids TEXT[] DEFAULT '{}'::text[],
  handles TEXT[] DEFAULT '{}'::text[],
  language TEXT, country TEXT, affiliation TEXT,
  weight NUMERIC DEFAULT 1.0, notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.verified_scholars TO authenticated;
GRANT ALL ON public.verified_scholars TO service_role;
ALTER TABLE public.verified_scholars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read verified_scholars" ON public.verified_scholars
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage verified_scholars" ON public.verified_scholars
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- moderation_learned_signals
CREATE TABLE IF NOT EXISTS public.moderation_learned_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_type TEXT NOT NULL,
  feature_value TEXT NOT NULL,
  approvals INTEGER NOT NULL DEFAULT 0,
  rejections INTEGER NOT NULL DEFAULT 0,
  reverts INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(feature_type, feature_value)
);
GRANT SELECT ON public.moderation_learned_signals TO authenticated;
GRANT ALL ON public.moderation_learned_signals TO service_role;
ALTER TABLE public.moderation_learned_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read moderation_learned_signals" ON public.moderation_learned_signals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- moderation_clusters
CREATE TABLE IF NOT EXISTS public.moderation_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  language TEXT, primary_topic TEXT, organization_type TEXT,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  dominant_tier CHAR(1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moderation_clusters TO authenticated;
GRANT ALL ON public.moderation_clusters TO service_role;
ALTER TABLE public.moderation_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read moderation_clusters" ON public.moderation_clusters
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- channel_moderation_decisions (renamed to avoid clash with existing video table)
CREATE TABLE IF NOT EXISTS public.channel_moderation_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.channel_candidates(id) ON DELETE CASCADE,
  youtube_channel_id TEXT NOT NULL,
  tier CHAR(1),
  action TEXT NOT NULL,
  actor UUID REFERENCES auth.users(id),
  is_bulk BOOLEAN NOT NULL DEFAULT false,
  cluster_id UUID,
  reason TEXT,
  evidence JSONB,
  previous_status TEXT,
  new_status TEXT,
  reversible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.channel_moderation_decisions TO authenticated;
GRANT ALL ON public.channel_moderation_decisions TO service_role;
ALTER TABLE public.channel_moderation_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read channel_moderation_decisions" ON public.channel_moderation_decisions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS channel_moderation_decisions_candidate_idx
  ON public.channel_moderation_decisions (candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS channel_moderation_decisions_action_idx
  ON public.channel_moderation_decisions (action, created_at DESC);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_trusted_institutions_updated') THEN
    CREATE TRIGGER trg_trusted_institutions_updated BEFORE UPDATE ON public.trusted_institutions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_verified_scholars_updated') THEN
    CREATE TRIGGER trg_verified_scholars_updated BEFORE UPDATE ON public.verified_scholars
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_moderation_learned_signals_updated') THEN
    CREATE TRIGGER trg_moderation_learned_signals_updated BEFORE UPDATE ON public.moderation_learned_signals
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_moderation_clusters_updated') THEN
    CREATE TRIGGER trg_moderation_clusters_updated BEFORE UPDATE ON public.moderation_clusters
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Seed minimal trusted_institutions patterns
INSERT INTO public.trusted_institutions (name, organization_type, match_pattern, weight, notes) VALUES
  ('Generic University','university','\\b(university|universit(e|é|y)|جامعة|üniversite)\\b',0.95,'Generic university'),
  ('Ministry / Government','government','\\b(ministry|ministère|وزارة|hükümet|gov|kkuedu|ien)\\b',0.95,'Government / ministry'),
  ('Academy','academy','\\b(academy|akademi|أكاديمية|akademisi)\\b',0.85,'Academy'),
  ('Institute','institute','\\b(institute|enstitü|معهد|institut)\\b',0.85,'Institute'),
  ('Waqf / Foundation','waqf','\\b(waqf|foundation|vakfı|مؤسسة)\\b',0.85,'Waqf / foundation'),
  ('MOOC / Open Learning','academy','\\b(mooc|open ?course|open ?learning|rwaq|edx|khan academy)\\b',0.9,'Open learning')
ON CONFLICT DO NOTHING;

-- Tier computation helper
CREATE OR REPLACE FUNCTION public.compute_candidate_tier(
  _confidence INTEGER, _duplicate_risk TEXT, _exclusion_hits INTEGER,
  _has_music_signal BOOLEAN, _has_female_presenter_signal BOOLEAN,
  _institution_match BOOLEAN, _subs INTEGER
) RETURNS CHAR(1)
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE hard_block BOOLEAN;
BEGIN
  hard_block := (_exclusion_hits > 0)
             OR COALESCE(_has_music_signal,false)
             OR COALESCE(_has_female_presenter_signal,false)
             OR COALESCE(_duplicate_risk,'low') = 'high';
  IF hard_block THEN RETURN 'D'; END IF;
  IF _confidence >= 98 AND COALESCE(_institution_match,false)
     AND COALESCE(_duplicate_risk,'low') = 'low' AND COALESCE(_subs,0) >= 10000
  THEN RETURN 'A'; END IF;
  IF _confidence >= 90 THEN RETURN 'B'; END IF;
  IF _confidence >= 70 THEN RETURN 'C'; END IF;
  RETURN 'D';
END $$;
REVOKE ALL ON FUNCTION public.compute_candidate_tier(INTEGER,TEXT,INTEGER,BOOLEAN,BOOLEAN,BOOLEAN,INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_candidate_tier(INTEGER,TEXT,INTEGER,BOOLEAN,BOOLEAN,BOOLEAN,INTEGER) TO authenticated, service_role;
