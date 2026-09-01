-- Institutional co-signatures become a first-class trust signal.
ALTER TABLE public.channel_trust_weights
  ADD COLUMN IF NOT EXISTS w_institution_cosign numeric NOT NULL DEFAULT 2.0;

ALTER TABLE public.channel_trust_profiles
  ADD COLUMN IF NOT EXISTS institution_cosign_count int NOT NULL DEFAULT 0;

-- Distinct active institutions that co-signed at least one video of a channel,
-- counting only signatures that still bind the current ledger record.
CREATE OR REPLACE FUNCTION public.channel_cosign_strength(_youtube_channel_id text)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT c.institution_id)::int
  FROM public.attestation_cosignatures c
  JOIN public.signing_institutions i ON i.id = c.institution_id
  JOIN public.curated_videos v ON v.video_id = c.video_id
  WHERE c.revoked_at IS NULL
    AND i.status = 'active'
    AND v.channel_id = _youtube_channel_id
$$;

REVOKE ALL ON FUNCTION public.channel_cosign_strength(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.channel_cosign_strength(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.recompute_channel_trust(_channel_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  w RECORD;
  ch RECORD;
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
  cosigns int := 0;
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

  SELECT
    count(*),
    count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')),
    count(*) FILTER (WHERE moderation_state IN ('rejected','blocked')),
    count(*) FILTER (WHERE moderation_state IN ('pending_review','ai_review_required','human_review_required')),
    coalesce(avg(moderation_confidence) FILTER (WHERE moderation_confidence IS NOT NULL), 0)
  INTO total, approved, rejected, pending, avg_conf
  FROM public.curated_videos
  WHERE channel_id = ch.youtube_channel_id;

  SELECT
    count(*) FILTER (WHERE action IN ('manual_approve','approve')),
    count(*) FILTER (WHERE action IN ('manual_reject','reject','remove'))
  INTO manual_ok, manual_no
  FROM public.moderation_overrides
  WHERE metadata->>'channel_id' = ch.youtube_channel_id
     OR metadata->>'youtube_channel_id' = ch.youtube_channel_id;

  SELECT
    count(*) FILTER (WHERE source = 'strike'),
    count(*) FILTER (WHERE source = 'user_report'),
    count(*) FILTER (WHERE source = 'false_positive'),
    count(*) FILTER (WHERE source = 'false_negative')
  INTO strikes, reports, fp, fn
  FROM public.channel_trust_events
  WHERE channel_id = _channel_id;

  SELECT coalesce(max(share), 0) INTO cat_consistency
  FROM (
    SELECT (count(*)::numeric / NULLIF(total,0)) AS share
    FROM public.curated_videos
    WHERE channel_id = ch.youtube_channel_id AND category IS NOT NULL
    GROUP BY category
  ) s;

  SELECT (count(*)::numeric / GREATEST(1, 90.0/7.0)) INTO upload_freq
  FROM public.curated_videos
  WHERE channel_id = ch.youtube_channel_id
    AND published_at > now() - interval '90 days';

  IF total > 0 THEN
    historical_quality := approved::numeric / total::numeric;
  END IF;

  SELECT EXTRACT(EPOCH FROM (now() - max(created_at))) / 86400.0
  INTO review_freq_days
  FROM public.moderation_overrides
  WHERE metadata->>'channel_id' = ch.youtube_channel_id;

  -- Independent institutional co-signatures (capped so a single partner cannot
  -- dominate the composite; diversity of partners is what earns trust).
  cosigns := public.channel_cosign_strength(ch.youtube_channel_id);

  new_score :=
      w.baseline_score
    + w.w_manual_approval    * manual_ok
    + w.w_manual_rejection   * manual_no
    + w.w_ai_confidence      * (avg_conf - 50)
    + w.w_false_positive     * fp
    + w.w_false_negative     * fn
    + w.w_user_report        * reports
    + w.w_category_consistency * (cat_consistency * 100 - 50)
    + w.w_upload_frequency   * LEAST(upload_freq, 20)
    + w.w_historical_quality * (historical_quality * 100 - 50)
    + w.w_strike             * strikes
    + w.w_institution_cosign * LEAST(cosigns, 5);

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
    institution_cosign_count, last_recomputed_at
  ) VALUES (
    _channel_id, ch.youtube_channel_id, new_score, risk, strikes,
    manual_ok, manual_no, avg_conf,
    fp, fn, reports,
    cat_consistency, upload_freq, historical_quality,
    review_freq_days, total, approved, rejected,
    cosigns, now()
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
    institution_cosign_count = EXCLUDED.institution_cosign_count,
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
      'historical_quality', historical_quality,
      'institution_cosigns', cosigns
    )
  );

  RETURN new_score;
END;
$fn$;

-- Public, read-only summary of institutional attestation coverage for /verify.
CREATE OR REPLACE FUNCTION public.get_cosign_trust_summary()
RETURNS TABLE (
  active_institutions int,
  cosigned_videos int,
  cosigned_channels int,
  latest_cosign_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)::int FROM public.signing_institutions WHERE status = 'active'),
    (SELECT count(DISTINCT c.video_id)::int
       FROM public.attestation_cosignatures c
       JOIN public.signing_institutions i ON i.id = c.institution_id
      WHERE c.revoked_at IS NULL AND i.status = 'active'),
    (SELECT count(DISTINCT v.channel_id)::int
       FROM public.attestation_cosignatures c
       JOIN public.signing_institutions i ON i.id = c.institution_id
       JOIN public.curated_videos v ON v.video_id = c.video_id
      WHERE c.revoked_at IS NULL AND i.status = 'active'),
    (SELECT max(c.signed_at)
       FROM public.attestation_cosignatures c
       JOIN public.signing_institutions i ON i.id = c.institution_id
      WHERE c.revoked_at IS NULL AND i.status = 'active')
$$;

REVOKE ALL ON FUNCTION public.get_cosign_trust_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cosign_trust_summary() TO anon, authenticated, service_role;