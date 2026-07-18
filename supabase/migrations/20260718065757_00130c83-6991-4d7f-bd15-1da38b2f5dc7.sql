UPDATE public.channel_candidates
SET status = 'pending',
    tier = 'B',
    tier_reason = array_append(COALESCE(tier_reason, '{}'::text[]), 'human_reescalated:reputable_reject'),
    updated_at = now()
WHERE created_at > now() - interval '2 days'
  AND tier = 'D'
  AND status = 'rejected'
  AND (
    (subscriber_count >= 200000 AND COALESCE(risk_score, 100) <= 65)
    OR (subscriber_count >= 500000 AND COALESCE(risk_score, 100) <= 72)
  );