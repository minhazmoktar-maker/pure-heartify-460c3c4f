INSERT INTO public.blocked_creators (pattern, reason, match_mode)
VALUES
  ('Touba TV Officiel', 'off-policy: female-featured content', 'channel_exact'),
  ('Touba TV', 'off-policy: female-featured content', 'channel_exact'),
  ('IslamInSpanishTV', 'off-policy: female-featured content', 'channel_exact'),
  ('IslamInSpanish', 'off-policy: female-featured content', 'channel_exact'),
  ('Eman Channel', 'off-policy: female-featured content', 'channel_exact'),
  ('HALAL MEDIA JAPAN', 'off-policy: female-featured content', 'channel_exact')
ON CONFLICT DO NOTHING;

UPDATE public.curated_videos v
SET is_hidden = true, is_archived = true, moderation_state = 'rejected',
    moderation_reasoning = COALESCE(v.moderation_reasoning,'') || ' | policy: blocked channel'
WHERE (v.is_archived = false OR v.is_hidden = false)
  AND lower(COALESCE(v.channel_title,'')) IN (
    'touba tv officiel','touba tv','islaminspanishtv','islaminspanish',
    'eman channel','halal media japan'
  );