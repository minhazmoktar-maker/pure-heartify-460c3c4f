
-- ============================================================
-- Channel Trust & Reputation System
-- ============================================================

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.channel_risk_level AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trust_event_source AS ENUM (
    'moderation','manual_approval','manual_rejection','user_report',
    'false_positive','false_negative','recompute','strike','decay','note'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Weights (single active row keeps algo tunable without deploys)
CREATE TABLE IF NOT EXISTS public.channel_trust_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  w_manual_approval    numeric NOT NULL DEFAULT 2.0,
  w_manual_rejection   numeric NOT NULL DEFAULT -6.0,
  w_ai_confidence      numeric NOT NULL DEFAULT 0.25,
  w_false_positive     numeric NOT NULL DEFAULT -3.0,
  w_false_negative     numeric NOT NULL DEFAULT -8.0,
  w_user_report        numeric NOT NULL DEFAULT -1.5,
  w_category_consistency numeric NOT NULL DEFAULT 0.15,
  w_upload_frequency   numeric NOT NULL DEFAULT 0.05,
  w_historical_quality numeric NOT NULL DEFAULT 0.20,
  w_strike             numeric NOT NULL DEFAULT -10.0,
  decay_half_life_days integer NOT NULL DEFAULT 90,
  baseline_score       numeric NOT NULL DEFAULT 55.0,
  min_score            numeric NOT NULL DEFAULT 0,
  max_score            numeric NOT NULL DEFAULT 100,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version)
);

GRANT SELECT ON public.channel_trust_weights TO authenticated;
GRANT ALL ON public.channel_trust_weights TO service_role;

ALTER TABLE public.channel_trust_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read weights"
  ON public.channel_trust_weights FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage weights"
  ON public.channel_trust_weights FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));

INSERT INTO public.channel_trust_weights (version, is_active)
VALUES (1, true)
ON CONFLICT (version) DO NOTHING;

CREATE TRIGGER trg_ctw_updated_at BEFORE UPDATE ON public.channel_trust_weights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Profiles (one row per approved_channels)
CREATE TABLE IF NOT EXISTS public.channel_trust_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.approved_channels(id) ON DELETE CASCADE,
  youtube_channel_id text,
  trust_score numeric NOT NULL DEFAULT 55.0,
  risk_level public.channel_risk_level NOT NULL DEFAULT 'medium',
  strike_count integer NOT NULL DEFAULT 0,
  manual_approval_count integer NOT NULL DEFAULT 0,
  manual_rejection_count integer NOT NULL DEFAULT 0,
  avg_ai_confidence numeric,
  false_positive_count integer NOT NULL DEFAULT 0,
  false_negative_count integer NOT NULL DEFAULT 0,
  user_report_count integer NOT NULL DEFAULT 0,
  category_consistency numeric,
  upload_frequency_per_week numeric,
  historical_quality numeric,
  review_frequency_days numeric,
  total_videos integer NOT NULL DEFAULT 0,
  approved_videos integer NOT NULL DEFAULT 0,
  rejected_videos integer NOT NULL DEFAULT 0,
  last_recomputed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id)
);

GRANT SELECT ON public.channel_trust_profiles TO anon, authenticated;
GRANT ALL ON public.channel_trust_profiles TO service_role;

ALTER TABLE public.channel_trust_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads trust profiles"
  ON public.channel_trust_profiles FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Admins mutate trust profiles"
  ON public.channel_trust_profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ctp_score ON public.channel_trust_profiles (trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_ctp_risk ON public.channel_trust_profiles (risk_level);
CREATE INDEX IF NOT EXISTS idx_ctp_yt ON public.channel_trust_profiles (youtube_channel_id);

CREATE TRIGGER trg_ctp_updated_at BEFORE UPDATE ON public.channel_trust_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Events (append-only audit log)
CREATE TABLE IF NOT EXISTS public.channel_trust_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.approved_channels(id) ON DELETE CASCADE,
  source public.trust_event_source NOT NULL,
  delta numeric NOT NULL DEFAULT 0,
  score_before numeric,
  score_after numeric,
  reason text,
  actor_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.channel_trust_events TO authenticated;
GRANT ALL ON public.channel_trust_events TO service_role;

ALTER TABLE public.channel_trust_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated reads trust events"
  ON public.channel_trust_events FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins write trust events"
  ON public.channel_trust_events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_cte_channel_time
  ON public.channel_trust_events (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cte_source
  ON public.channel_trust_events (source, created_at DESC);

-- 5. Scoring function
CREATE OR REPLACE FUNCTION public.recompute_channel_trust(_channel_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w RECORD;
  ch RECORD;
  prof RECORD;
  total int := 0; approved int := 0; rejected int := 0; pending int := 0;
  avg_conf numeric := 0;
  reports int := 0;
  fp int := 0; fn int := 0;
  manual_ok int := 0; manual_no int := 0;
  cat_consistency numeric := 0;
  upload_freq numeric := 0;
  historical_quality numeric := 0;
  review_freq_days numeric := NULL;
  strikes int := 0;
  new_score numeric;
  old_score numeric;
  risk public.channel_risk_level;
BEGIN
  SELECT * INTO w FROM public.channel_trust_weights
   WHERE is_active ORDER BY version DESC LIMIT 1;
  IF w IS NULL THEN
    RAISE EXCEPTION 'No active channel_trust_weights row';
  END IF;

  SELECT * INTO ch FROM public.approved_channels WHERE id = _channel_id;
  IF ch IS NULL THEN
    RAISE EXCEPTION 'Channel % not found', _channel_id;
  END IF;

  -- Aggregate signals from moderation history.
  SELECT
    count(*),
    count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')),
    count(*) FILTER (WHERE moderation_state IN ('rejected','blocked')),
    count(*) FILTER (WHERE moderation_state IN ('pending_review','ai_review_required','human_review_required')),
    coalesce(avg(moderation_confidence) FILTER (WHERE moderation_confidence IS NOT NULL), 0)
  INTO total, approved, rejected, pending, avg_conf
  FROM public.curated_videos
  WHERE channel_id = ch.youtube_channel_id;

  -- Manual approvals / rejections from override log.
  SELECT
    count(*) FILTER (WHERE action IN ('manual_approve','approve')),
    count(*) FILTER (WHERE action IN ('manual_reject','reject','remove'))
  INTO manual_ok, manual_no
  FROM public.moderation_overrides
  WHERE metadata->>'channel_id' = ch.youtube_channel_id
     OR metadata->>'youtube_channel_id' = ch.youtube_channel_id;

  -- Prior trust events supply strike/report/false-outcome counters.
  SELECT
    count(*) FILTER (WHERE source = 'strike'),
    count(*) FILTER (WHERE source = 'user_report'),
    count(*) FILTER (WHERE source = 'false_positive'),
    count(*) FILTER (WHERE source = 'false_negative')
  INTO strikes, reports, fp, fn
  FROM public.channel_trust_events
  WHERE channel_id = _channel_id;

  -- Category consistency: share of videos in the channel's dominant category.
  SELECT coalesce(max(share), 0) INTO cat_consistency
  FROM (
    SELECT (count(*)::numeric / NULLIF(total,0)) AS share
    FROM public.curated_videos
    WHERE channel_id = ch.youtube_channel_id AND category IS NOT NULL
    GROUP BY category
  ) s;

  -- Upload frequency (videos per week over last 90 days).
  SELECT (count(*)::numeric / GREATEST(1, 90.0/7.0)) INTO upload_freq
  FROM public.curated_videos
  WHERE channel_id = ch.youtube_channel_id
    AND published_at > now() - interval '90 days';

  -- Historical quality: approved / total (guarded).
  IF total > 0 THEN
    historical_quality := approved::numeric / total::numeric;
  END IF;

  -- Days since last human review touched anything on this channel.
  SELECT EXTRACT(EPOCH FROM (now() - max(created_at))) / 86400.0
  INTO review_freq_days
  FROM public.moderation_overrides
  WHERE metadata->>'channel_id' = ch.youtube_channel_id;

  -- Weighted composite.
  new_score :=
      w.baseline_score
    + w.w_manual_approval    * manual_ok
    + w.w_manual_rejection   * manual_no
    + w.w_ai_confidence      * (avg_conf - 50)          -- centered
    + w.w_false_positive     * fp
    + w.w_false_negative     * fn
    + w.w_user_report        * reports
    + w.w_category_consistency * (cat_consistency * 100 - 50)
    + w.w_upload_frequency   * LEAST(upload_freq, 20)
    + w.w_historical_quality * (historical_quality * 100 - 50)
    + w.w_strike             * strikes;

  new_score := GREATEST(w.min_score, LEAST(w.max_score, new_score));

  risk := CASE
    WHEN new_score >= 85 THEN 'low'
    WHEN new_score >= 65 THEN 'medium'
    WHEN new_score >= 40 THEN 'high'
    ELSE 'critical'
  END;

  SELECT trust_score INTO old_score FROM public.channel_trust_profiles WHERE channel_id = _channel_id;

  INSERT INTO public.channel_trust_profiles (
    channel_id, youtube_channel_id, trust_score, risk_level, strike_count,
    manual_approval_count, manual_rejection_count, avg_ai_confidence,
    false_positive_count, false_negative_count, user_report_count,
    category_consistency, upload_frequency_per_week, historical_quality,
    review_frequency_days, total_videos, approved_videos, rejected_videos,
    last_recomputed_at
  ) VALUES (
    _channel_id, ch.youtube_channel_id, new_score, risk, strikes,
    manual_ok, manual_no, avg_conf,
    fp, fn, reports,
    cat_consistency, upload_freq, historical_quality,
    review_freq_days, total, approved, rejected,
    now()
  )
  ON CONFLICT (channel_id) DO UPDATE SET
    youtube_channel_id     = EXCLUDED.youtube_channel_id,
    trust_score            = EXCLUDED.trust_score,
    risk_level             = EXCLUDED.risk_level,
    strike_count           = EXCLUDED.strike_count,
    manual_approval_count  = EXCLUDED.manual_approval_count,
    manual_rejection_count = EXCLUDED.manual_rejection_count,
    avg_ai_confidence      = EXCLUDED.avg_ai_confidence,
    false_positive_count   = EXCLUDED.false_positive_count,
    false_negative_count   = EXCLUDED.false_negative_count,
    user_report_count      = EXCLUDED.user_report_count,
    category_consistency   = EXCLUDED.category_consistency,
    upload_frequency_per_week = EXCLUDED.upload_frequency_per_week,
    historical_quality     = EXCLUDED.historical_quality,
    review_frequency_days  = EXCLUDED.review_frequency_days,
    total_videos           = EXCLUDED.total_videos,
    approved_videos        = EXCLUDED.approved_videos,
    rejected_videos        = EXCLUDED.rejected_videos,
    last_recomputed_at     = EXCLUDED.last_recomputed_at,
    updated_at             = now();

  INSERT INTO public.channel_trust_events (
    channel_id, source, delta, score_before, score_after, reason, metadata
  ) VALUES (
    _channel_id, 'recompute', coalesce(new_score - coalesce(old_score, w.baseline_score), 0),
    old_score, new_score, 'Automatic recompute',
    jsonb_build_object(
      'weights_version', w.version,
      'total', total, 'approved', approved, 'rejected', rejected,
      'avg_ai_confidence', avg_conf, 'strikes', strikes, 'reports', reports,
      'false_positive', fp, 'false_negative', fn,
      'category_consistency', cat_consistency,
      'upload_frequency_per_week', upload_freq,
      'historical_quality', historical_quality
    )
  );

  RETURN new_score;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_channel_trust(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.recompute_channel_trust(uuid) TO authenticated, service_role;

-- Batch recompute (safe to call from cron/edge function).
CREATE OR REPLACE FUNCTION public.recompute_all_channel_trust(_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  n integer := 0;
BEGIN
  FOR r IN (
    SELECT id FROM public.approved_channels
     WHERE status = 'active'
     ORDER BY coalesce((SELECT last_recomputed_at FROM public.channel_trust_profiles p WHERE p.channel_id = approved_channels.id), 'epoch')
     LIMIT _limit
  ) LOOP
    PERFORM public.recompute_channel_trust(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_all_channel_trust(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.recompute_all_channel_trust(integer) TO service_role;

-- History helper for dashboard chart.
CREATE OR REPLACE FUNCTION public.get_channel_trust_history(_channel_id uuid, _limit integer DEFAULT 200)
RETURNS TABLE (
  created_at timestamptz,
  source public.trust_event_source,
  delta numeric,
  score_before numeric,
  score_after numeric,
  reason text,
  actor_id uuid,
  metadata jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT created_at, source, delta, score_before, score_after, reason, actor_id, metadata
  FROM public.channel_trust_events
  WHERE channel_id = _channel_id
  ORDER BY created_at DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_channel_trust_history(uuid, integer) TO authenticated;

-- Backfill: create empty profiles + one recompute pass for existing active channels
-- (safe no-op if there are none).
DO $$
DECLARE r RECORD; BEGIN
  FOR r IN SELECT id FROM public.approved_channels WHERE status = 'active' LIMIT 200 LOOP
    BEGIN PERFORM public.recompute_channel_trust(r.id); EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;
