
-- ================================================================
-- Tighten channel moderation pipeline
-- ================================================================

-- 1. Allow new statuses on channel_candidates.
ALTER TABLE public.channel_candidates DROP CONSTRAINT IF EXISTS channel_candidates_status_check;
ALTER TABLE public.channel_candidates
  ADD CONSTRAINT channel_candidates_status_check
  CHECK (status IN ('pending','pre_approved','sampling','approved','rejected','flagged','suspended'));

-- 2. Allow new tier S on channel_candidates.
ALTER TABLE public.channel_candidates DROP CONSTRAINT IF EXISTS channel_candidates_tier_check;
ALTER TABLE public.channel_candidates
  ADD CONSTRAINT channel_candidates_tier_check
  CHECK (tier IS NULL OR tier IN ('S','A','B','C','D'));

-- 3. Sampling bookkeeping columns.
ALTER TABLE public.channel_candidates
  ADD COLUMN IF NOT EXISTS pre_approved_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promoted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clean_samples     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_samples    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_samples  INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS last_sampled_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS channel_candidates_status_tier_idx
  ON public.channel_candidates (status, tier);

-- 4. Moderation config (configurable thresholds).
CREATE TABLE IF NOT EXISTS public.moderation_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID
);
GRANT SELECT ON public.moderation_config TO authenticated;
GRANT ALL    ON public.moderation_config TO service_role;
ALTER TABLE public.moderation_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage moderation config" ON public.moderation_config;
CREATE POLICY "Admins manage moderation config" ON public.moderation_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.moderation_config (key, value, description) VALUES
  ('auto_approve_enabled',    'false'::jsonb,                       'Master kill-switch — must be true for any auto-approval to happen.'),
  ('min_clean_samples_S',     '10'::jsonb,                          'Clean video samples required to auto-approve a Tier S channel.'),
  ('min_clean_samples_A',     '20'::jsonb,                          'Clean video samples required to auto-approve a Tier A channel.'),
  ('confidence_threshold_S',  '98'::jsonb,                          'Confidence floor for Tier S.'),
  ('confidence_threshold_A',  '95'::jsonb,                          'Confidence floor for Tier A.'),
  ('sample_kinds',            '["newest","oldest","popular","shorts","random"]'::jsonb, 'Sample buckets each candidate must clear.'),
  ('sample_size_small',       '10'::jsonb,                          'Samples per candidate for channels with <10k subs.'),
  ('sample_size_medium',      '15'::jsonb,                          'Samples for 10k-500k subs.'),
  ('sample_size_large',       '25'::jsonb,                          'Samples for >500k subs.'),
  ('recheck_interval_hours',  '168'::jsonb,                         'How often approved channels get re-audited.'),
  ('suspend_on_hard_block',   'true'::jsonb,                        'Auto-suspend approved channels the moment a hard rule is hit.'),
  ('block_ai_only_learning',  'true'::jsonb,                        'Never feed learned signals from AI-only decisions.')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_moderation_config(_key TEXT)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT value FROM public.moderation_config WHERE key = _key
$$;
REVOKE ALL ON FUNCTION public.get_moderation_config(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_moderation_config(TEXT) TO authenticated, service_role;

-- 5. Video sampling audit trail.
CREATE TABLE IF NOT EXISTS public.channel_video_samples (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id   UUID NOT NULL REFERENCES public.channel_candidates(id) ON DELETE CASCADE,
  youtube_channel_id TEXT NOT NULL,
  video_id       TEXT NOT NULL,
  sample_kind    TEXT NOT NULL CHECK (sample_kind IN ('newest','oldest','popular','shorts','random','manual')),
  verdict        TEXT NOT NULL CHECK (verdict IN ('clean','warn','violation','error')),
  reasons        TEXT[]        DEFAULT '{}'::text[],
  evidence       JSONB         DEFAULT '{}'::jsonb,
  sampled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, video_id)
);
GRANT SELECT ON public.channel_video_samples TO authenticated;
GRANT ALL    ON public.channel_video_samples TO service_role;
ALTER TABLE public.channel_video_samples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read samples" ON public.channel_video_samples;
CREATE POLICY "Admins read samples" ON public.channel_video_samples
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Service writes samples" ON public.channel_video_samples;
CREATE POLICY "Service writes samples" ON public.channel_video_samples
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS channel_video_samples_candidate_idx
  ON public.channel_video_samples (candidate_id, verdict);
CREATE INDEX IF NOT EXISTS channel_video_samples_channel_idx
  ON public.channel_video_samples (youtube_channel_id, sampled_at DESC);

-- 6. Tier computation — now returns TEXT so it can include 'S'.
DROP FUNCTION IF EXISTS public.compute_candidate_tier(INTEGER,TEXT,INTEGER,BOOLEAN,BOOLEAN,BOOLEAN,INTEGER);
CREATE OR REPLACE FUNCTION public.compute_candidate_tier(
  _confidence INTEGER, _duplicate_risk TEXT, _exclusion_hits INTEGER,
  _has_music_signal BOOLEAN, _has_female_presenter_signal BOOLEAN,
  _institution_match BOOLEAN, _subs INTEGER
) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE hard_block BOOLEAN;
BEGIN
  hard_block := (_exclusion_hits > 0)
             OR COALESCE(_has_music_signal,false)
             OR COALESCE(_has_female_presenter_signal,false)
             OR COALESCE(_duplicate_risk,'low') = 'high';
  IF hard_block THEN RETURN 'D'; END IF;

  -- Tier S: fully trusted institution, very high confidence, meaningful reach.
  IF _confidence >= 98
     AND COALESCE(_institution_match,false)
     AND COALESCE(_duplicate_risk,'low') = 'low'
     AND COALESCE(_subs,0) >= 10000
  THEN RETURN 'S'; END IF;

  -- Tier A: very high confidence, safe signals, but not necessarily institutional.
  IF _confidence >= 95 AND COALESCE(_duplicate_risk,'low') = 'low'
  THEN RETURN 'A'; END IF;

  IF _confidence >= 85 THEN RETURN 'B'; END IF;
  IF _confidence >= 70 THEN RETURN 'C'; END IF;
  RETURN 'D';
END $$;
REVOKE ALL ON FUNCTION public.compute_candidate_tier(INTEGER,TEXT,INTEGER,BOOLEAN,BOOLEAN,BOOLEAN,INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_candidate_tier(INTEGER,TEXT,INTEGER,BOOLEAN,BOOLEAN,BOOLEAN,INTEGER) TO authenticated, service_role;

-- 7. Sampling-driven promotion / rejection.
--    Runs AFTER a sample is written and takes deterministic action on the
--    candidate row. Never promotes unless auto_approve_enabled = true.
CREATE OR REPLACE FUNCTION public.on_channel_sample_recorded()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cand           public.channel_candidates%ROWTYPE;
  auto_enabled   BOOLEAN;
  required       INTEGER;
BEGIN
  SELECT * INTO cand FROM public.channel_candidates WHERE id = NEW.candidate_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  auto_enabled := COALESCE((SELECT (value)::boolean FROM public.moderation_config WHERE key='auto_approve_enabled'), false);

  -- Any single violation is fatal — safety invariant #7.
  IF NEW.verdict = 'violation' THEN
    UPDATE public.channel_candidates
       SET status         = 'rejected',
           failed_samples = failed_samples + 1,
           last_sampled_at = NEW.sampled_at,
           suspended_at    = now()
     WHERE id = cand.id;

    INSERT INTO public.channel_moderation_decisions
      (candidate_id, youtube_channel_id, tier, action, actor, is_bulk, cluster_id,
       reason, evidence, previous_status, new_status, reversible)
    VALUES
      (cand.id, cand.youtube_channel_id, cand.tier, 'auto_rejected', NULL, false, cand.cluster_id,
       'sample_violation:' || NEW.video_id,
       jsonb_build_object('sample_kind',NEW.sample_kind,'reasons',NEW.reasons,'evidence',NEW.evidence),
       cand.status, 'rejected', true);

    -- Mirror to approved_channels if it slipped through earlier.
    UPDATE public.approved_channels
       SET status = 'flagged', last_rechecked_at = now(),
           consistency_score = GREATEST(0, COALESCE(consistency_score,0) - 40)
     WHERE youtube_channel_id = cand.youtube_channel_id;

    RETURN NEW;
  END IF;

  IF NEW.verdict = 'clean' THEN
    UPDATE public.channel_candidates
       SET clean_samples    = clean_samples + 1,
           last_sampled_at  = NEW.sampled_at
     WHERE id = cand.id
     RETURNING * INTO cand;

    required := GREATEST(cand.required_samples, 1);

    -- Only promote when: auto-approve is on, tier is S or A, enough clean samples,
    -- and no failed samples ever.
    IF auto_enabled
       AND cand.tier IN ('S','A')
       AND cand.clean_samples >= required
       AND cand.failed_samples = 0
       AND cand.status IN ('pre_approved','sampling','pending')
    THEN
      UPDATE public.channel_candidates
         SET status = 'approved', promoted_at = now()
       WHERE id = cand.id;

      INSERT INTO public.approved_channels (
        youtube_channel_id, title, handle, category, owner_key,
        last_rechecked_at, consistency_score, status
      ) VALUES (
        cand.youtube_channel_id, cand.title, cand.handle, cand.category,
        COALESCE(public.compute_owner_key(COALESCE(cand.handle, cand.title)), ''),
        now(), COALESCE(cand.confidence, 90), 'active'
      )
      ON CONFLICT (youtube_channel_id) DO UPDATE
        SET last_rechecked_at = EXCLUDED.last_rechecked_at,
            consistency_score = EXCLUDED.consistency_score,
            status            = 'active';

      INSERT INTO public.channel_moderation_decisions
        (candidate_id, youtube_channel_id, tier, action, actor, is_bulk, cluster_id,
         reason, evidence, previous_status, new_status, reversible)
      VALUES
        (cand.id, cand.youtube_channel_id, cand.tier, 'auto_approved', NULL, false, cand.cluster_id,
         'sampling_clean:' || cand.clean_samples || '/' || required,
         jsonb_build_object('clean',cand.clean_samples,'required',required,'tier',cand.tier),
         'pre_approved', 'approved', true);
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_on_channel_sample_recorded ON public.channel_video_samples;
CREATE TRIGGER trg_on_channel_sample_recorded
  AFTER INSERT ON public.channel_video_samples
  FOR EACH ROW EXECUTE FUNCTION public.on_channel_sample_recorded();

-- 8. Active-learning guard — refuse to persist learned signals from AI-only
--    decisions (actor IS NULL). Enforces safeguard #6.
CREATE OR REPLACE FUNCTION public.guard_moderation_learned_signals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- This trigger fires on inserts driven by our edge functions.
  -- The edge functions call SET LOCAL app.actor = <uuid> before inserting;
  -- if actor is not present we reject the write.
  IF current_setting('app.actor', true) IS NULL
     OR current_setting('app.actor', true) = ''
  THEN
    RAISE EXCEPTION 'moderation_learned_signals may only be updated from human-authored decisions';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_learned_signals ON public.moderation_learned_signals;
CREATE TRIGGER trg_guard_learned_signals
  BEFORE INSERT OR UPDATE ON public.moderation_learned_signals
  FOR EACH ROW EXECUTE FUNCTION public.guard_moderation_learned_signals();
