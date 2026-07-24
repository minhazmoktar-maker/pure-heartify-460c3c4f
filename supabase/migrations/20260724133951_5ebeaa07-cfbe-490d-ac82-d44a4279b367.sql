
INSERT INTO blocked_creators (pattern, reason) VALUES
  ('alhudatv kenya', 'User-requested block: AlhudaTv Kenya')
ON CONFLICT DO NOTHING;

UPDATE curated_videos
SET is_archived = true, is_hidden = true
WHERE channel_id = 'UCdTAsRrQEp-IVoMzKoRG4ZQ'
   OR channel_title ILIKE '%alhudatv kenya%';

UPDATE approved_channels SET status = 'banned'
WHERE youtube_channel_id = 'UCdTAsRrQEp-IVoMzKoRG4ZQ';
