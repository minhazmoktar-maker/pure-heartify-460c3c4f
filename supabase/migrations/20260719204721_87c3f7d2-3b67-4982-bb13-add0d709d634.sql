
-- Same as before, but skip rows on the removal blocklist to avoid trigger rejection.
UPDATE public.curated_videos v
SET content_language = CASE
  WHEN title ~ '[\u0600-\u06FF]' AND title !~ '[\u0980-\u09FF]' THEN 'ar'
  WHEN title ~ '[\u0980-\u09FF]' THEN 'bn'
  WHEN title ~ '[\u0900-\u097F]' THEN 'hi'
  WHEN title ~ '[\u0A80-\u0AFF]' THEN 'gu'
  WHEN title ~ '[\u0B80-\u0BFF]' THEN 'ta'
  WHEN title ~ '[\u4E00-\u9FFF]' THEN 'zh'
  WHEN title ~ '[\u3040-\u309F\u30A0-\u30FF]' THEN 'ja'
  WHEN title ~ '[\uAC00-\uD7AF]' THEN 'ko'
  WHEN title ~ '[\u0400-\u04FF]' THEN 'ru'
  ELSE NULL
END
WHERE content_language IS NULL
  AND title ~ '[^\x00-\x7F]'
  AND NOT EXISTS (SELECT 1 FROM public.removed_videos r WHERE r.video_id = v.video_id);

UPDATE public.curated_videos v SET content_language = 'id'
WHERE content_language IS NULL AND channel_title IN (
  'Yufid.TV - Pengajian & Ceramah Islam','Ustadz Abdul Somad Official',
  'Adi Hidayat Official','Khalid Basalamah Official','Firanda Andirja')
  AND NOT EXISTS (SELECT 1 FROM public.removed_videos r WHERE r.video_id = v.video_id);

UPDATE public.curated_videos v SET content_language = 'ur'
WHERE content_language IS NULL AND (
  channel_title ILIKE '%urdu%' OR channel_title ILIKE '%engineer muhammad ali mirza%'
  OR channel_title ILIKE '%dr israr ahmed%' OR channel_title ILIKE '%tuaha ibn jalil%')
  AND NOT EXISTS (SELECT 1 FROM public.removed_videos r WHERE r.video_id = v.video_id);

UPDATE public.curated_videos v SET content_language = 'tr'
WHERE content_language IS NULL AND (
  channel_title ILIKE '%İhsan Şenocak%' OR channel_title ILIKE '%ihsan senocak%'
  OR channel_title ILIKE '%diyanet%' OR channel_title ILIKE '%türk%')
  AND NOT EXISTS (SELECT 1 FROM public.removed_videos r WHERE r.video_id = v.video_id);

UPDATE public.curated_videos v SET content_language = 'ms'
WHERE content_language IS NULL 
  AND (channel_title ILIKE '%melayu%' OR channel_title ILIKE '%malaysia%')
  AND NOT EXISTS (SELECT 1 FROM public.removed_videos r WHERE r.video_id = v.video_id);

UPDATE public.curated_videos v SET content_language = 'en'
WHERE content_language IS NULL
  AND title !~ '[^\x00-\x7F]'
  AND NOT EXISTS (SELECT 1 FROM public.removed_videos r WHERE r.video_id = v.video_id);

CREATE INDEX IF NOT EXISTS idx_curated_videos_content_language
  ON public.curated_videos (content_language)
  WHERE content_language IS NOT NULL;
