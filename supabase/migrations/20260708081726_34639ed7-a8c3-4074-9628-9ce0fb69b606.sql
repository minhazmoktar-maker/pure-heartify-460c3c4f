
-- Moderation state enum
DO $$ BEGIN
  CREATE TYPE public.moderation_state AS ENUM (
    'approved', 'auto_approved', 'pending_review',
    'ai_review_required', 'human_review_required',
    'rejected', 'blocked', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.moderation_stage AS ENUM (
    'ingest', 'rule_engine', 'channel_reputation', 'metadata_analysis',
    'ai_reasoning', 'human_review', 'recheck', 'manual_override'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend curated_videos
ALTER TABLE public.curated_videos
  ADD COLUMN IF NOT EXISTS moderation_state public.moderation_state NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS moderation_confidence NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS moderation_risk NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS moderation_stage public.moderation_stage,
  ADD COLUMN IF NOT EXISTS moderation_provider TEXT,
  ADD COLUMN IF NOT EXISTS moderation_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS moderation_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS moderation_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_decision_id UUID;

CREATE INDEX IF NOT EXISTS idx_curated_videos_moderation_state
  ON public.curated_videos (moderation_state);

-- Moderation decisions (append-only history)
CREATE TABLE IF NOT EXISTS public.moderation_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL,
  stage public.moderation_stage NOT NULL,
  state public.moderation_state NOT NULL,
  confidence NUMERIC(5,2),
  risk NUMERIC(5,2),
  provider TEXT,
  reasoning TEXT,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  rule_hits JSONB NOT NULL DEFAULT '[]'::jsonb,
  actor_id UUID,
  actor_kind TEXT NOT NULL DEFAULT 'system',
  previous_state public.moderation_state,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_decisions_video
  ON public.moderation_decisions (video_id, created_at DESC);

GRANT SELECT ON public.moderation_decisions TO authenticated;
GRANT ALL ON public.moderation_decisions TO service_role;

ALTER TABLE public.moderation_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read moderation decisions"
  ON public.moderation_decisions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins/Owners can insert moderation decisions"
  ON public.moderation_decisions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));

-- Keep curated_videos.last_decision_id in sync
CREATE OR REPLACE FUNCTION public.sync_video_last_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.curated_videos
     SET last_decision_id      = NEW.id,
         moderation_state      = NEW.state,
         moderation_confidence = COALESCE(NEW.confidence, moderation_confidence),
         moderation_risk       = COALESCE(NEW.risk, moderation_risk),
         moderation_stage      = NEW.stage,
         moderation_provider   = COALESCE(NEW.provider, moderation_provider),
         moderation_reasoning  = COALESCE(NEW.reasoning, moderation_reasoning),
         moderation_signals    = COALESCE(NEW.signals, moderation_signals),
         moderation_updated_at = NEW.created_at
   WHERE video_id = NEW.video_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_video_last_decision ON public.moderation_decisions;
CREATE TRIGGER trg_sync_video_last_decision
  AFTER INSERT ON public.moderation_decisions
  FOR EACH ROW EXECUTE FUNCTION public.sync_video_last_decision();

-- Moderation thresholds (single row)
CREATE TABLE IF NOT EXISTS public.moderation_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  auto_approve_min_confidence NUMERIC(5,2) NOT NULL DEFAULT 98,
  auto_approve_max_risk NUMERIC(5,2) NOT NULL DEFAULT 5,
  ai_review_min_confidence NUMERIC(5,2) NOT NULL DEFAULT 90,
  human_review_min_confidence NUMERIC(5,2) NOT NULL DEFAULT 60,
  reject_below_confidence NUMERIC(5,2) NOT NULL DEFAULT 60,
  preferred_ai_provider TEXT NOT NULL DEFAULT 'lovable',
  fallback_ai_provider TEXT NOT NULL DEFAULT 'gemini',
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moderation_thresholds TO authenticated;
GRANT ALL ON public.moderation_thresholds TO service_role;

ALTER TABLE public.moderation_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read thresholds"
  ON public.moderation_thresholds FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners can update thresholds"
  ON public.moderation_thresholds FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owners can insert thresholds"
  ON public.moderation_thresholds FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));

DROP TRIGGER IF EXISTS trg_update_thresholds_updated_at ON public.moderation_thresholds;
CREATE TRIGGER trg_update_thresholds_updated_at
  BEFORE UPDATE ON public.moderation_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.moderation_thresholds (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

-- Moderation rules (hard rules)
CREATE TABLE IF NOT EXISTS public.moderation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL, -- keyword | pattern | channel | metadata
  pattern TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'hard', -- hard | soft
  applies_to TEXT NOT NULL DEFAULT 'title_description', -- title_description | channel | tags | all
  enabled BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_rules_enabled
  ON public.moderation_rules (enabled);

GRANT SELECT ON public.moderation_rules TO authenticated;
GRANT ALL ON public.moderation_rules TO service_role;

ALTER TABLE public.moderation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read rules"
  ON public.moderation_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins/Owners can insert rules"
  ON public.moderation_rules FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));

CREATE POLICY "Admins/Owners can update rules"
  ON public.moderation_rules FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));

CREATE POLICY "Admins/Owners can delete rules"
  ON public.moderation_rules FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));

DROP TRIGGER IF EXISTS trg_update_moderation_rules_updated_at ON public.moderation_rules;
CREATE TRIGGER trg_update_moderation_rules_updated_at
  BEFORE UPDATE ON public.moderation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: set existing curated videos to pending_review
UPDATE public.curated_videos
   SET moderation_state = 'pending_review',
       moderation_updated_at = now()
 WHERE moderation_state IS NULL OR moderation_state = 'approved';
