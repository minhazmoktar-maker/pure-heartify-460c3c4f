-- Channel growth was 0/day against a target of 40: only tier S/A candidates were
-- ever dispatched into the video-sampling safety gate, and S/A is vanishingly
-- rare (8 candidates ever). Tier B/C sat in a "human queue" nobody staffs.
-- Route B/C through the SAME automated gate with strictly harder clean-sample
-- requirements. The halal invariants are unchanged: a single violating sample
-- still rejects the whole channel.

CREATE OR REPLACE FUNCTION public.on_channel_sample_recorded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cand           public.channel_candidates%ROWTYPE;
  auto_enabled   BOOLEAN;
  required       INTEGER;
  promote_ok     BOOLEAN := false;
BEGIN
  SELECT * INTO cand FROM public.channel_candidates WHERE id = NEW.candidate_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  auto_enabled := COALESCE((SELECT (value)::boolean FROM public.moderation_config WHERE key='auto_approve_enabled'), false);

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

    -- Graded evidence bar: the less we trust the metadata signal, the more
    -- clean videos the channel must produce before it can serve.
    IF cand.tier IN ('S','A') THEN
      promote_ok := cand.clean_samples >= required;
    ELSIF cand.tier = 'B' THEN
      promote_ok := cand.clean_samples >= GREATEST(required * 2, 5);
    ELSIF cand.tier = 'C' THEN
      promote_ok := cand.clean_samples >= GREATEST(required * 3, 12);
    END IF;

    IF auto_enabled
       AND promote_ok
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
         'sampling_clean:' || cand.clean_samples || '/' || required || ':tier_' || cand.tier,
         jsonb_build_object('clean',cand.clean_samples,'required',required,'tier',cand.tier),
         cand.status, 'approved', true);
    END IF;
  END IF;

  RETURN NEW;
END
$$;

-- Promote the already-classified B/C backlog into the sampling gate so the
-- pipeline has work to do on its next tick.
UPDATE public.channel_candidates
   SET status = 'pre_approved',
       pre_approved_at = COALESCE(pre_approved_at, now()),
       updated_at = now()
 WHERE status = 'pending'
   AND tier IN ('B','C')
   AND COALESCE(failed_samples, 0) = 0;
