-- 1) Allow tier B channels (confidence 85-94) to be promoted by the *evidence*
--    gate (video sampling) with a strictly higher bar than S/A: double the
--    required clean samples, minimum 5, and zero failures ever. C/D still
--    require human review. This unlocks South Asian native-language supply
--    without weakening the halal floor.
CREATE OR REPLACE FUNCTION public.on_channel_sample_recorded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

    IF cand.tier IN ('S','A') THEN
      promote_ok := cand.clean_samples >= required;
    ELSIF cand.tier = 'B' THEN
      promote_ok := cand.clean_samples >= GREATEST(required * 2, 5);
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
END $function$;

-- 2) Security hardening: personalized pools take a user id argument and are
--    only ever invoked with the service role from edge functions. Anonymous
--    (and signed-in) clients must not be able to read another user's pool.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN (
        'pool_for_you_v2','pool_because_you_watched','pool_continue_watching',
        'pool_from_follows','pool_similar_to_liked','return_digest'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon', r.nspname, r.proname, r.args);
  END LOOP;
END $$;