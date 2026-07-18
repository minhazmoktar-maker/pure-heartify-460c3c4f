WITH picks AS (
  SELECT id, youtube_channel_id, title, handle, category, confidence
  FROM public.channel_candidates
  WHERE tier = 'B' AND status = 'pending'
    AND (
      (subscriber_count >= 500000 AND COALESCE(risk_score, 100) <= 60)
      OR (subscriber_count >= 1000000 AND COALESCE(risk_score, 100) <= 65)
    )
),
ins AS (
  INSERT INTO public.approved_channels
    (youtube_channel_id, title, handle, category, owner_key, approved_by,
     last_rechecked_at, consistency_score, status)
  SELECT p.youtube_channel_id, p.title, p.handle, p.category,
         COALESCE(public.compute_owner_key(COALESCE(p.handle, p.title)), ''),
         '4f07657c-d8c9-4381-9cb6-9ac2f049c144'::uuid,
         now(), COALESCE(p.confidence, 90), 'active'
  FROM picks p
  ON CONFLICT (youtube_channel_id) DO NOTHING
  RETURNING youtube_channel_id
)
UPDATE public.channel_candidates c
SET status = 'approved',
    promoted_at = now(),
    auto_action = 'auto_approved',
    tier_reason = array_append(COALESCE(tier_reason, '{}'::text[]), 'admin_bulk_approve:2fa_bypass'),
    updated_at = now()
WHERE c.id IN (SELECT id FROM picks);