
-- === Dedupe channels_state by channel_id (keep row with highest total_pulled, then oldest) ===
WITH ranked AS (
  SELECT id, channel_id,
         ROW_NUMBER() OVER (
           PARTITION BY channel_id
           ORDER BY total_pulled DESC NULLS LAST, created_at ASC
         ) AS rn
  FROM public.channels_state
  WHERE channel_id IS NOT NULL
)
DELETE FROM public.channels_state cs
USING ranked r
WHERE cs.id = r.id AND r.rn > 1;

-- === channels_state hardening ===
ALTER TABLE public.channels_state
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS consecutive_failures int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_channel_id uuid REFERENCES public.approved_channels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority int NOT NULL DEFAULT 100;

CREATE UNIQUE INDEX IF NOT EXISTS channels_state_channel_id_uk
  ON public.channels_state (channel_id)
  WHERE channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS channels_state_scheduler_idx
  ON public.channels_state (status, priority, next_attempt_at)
  WHERE status <> 'dead';

-- === Backfill: every active approved channel gets a channels_state row ===
INSERT INTO public.channels_state (channel_name, channel_id, approved_channel_id, priority, status, next_attempt_at)
SELECT ac.title, ac.youtube_channel_id, ac.id, 10, 'pending', now()
FROM public.approved_channels ac
WHERE ac.status = 'active'
  AND ac.youtube_channel_id ~ '^UC[A-Za-z0-9_-]{22}$'
ON CONFLICT (channel_id) WHERE channel_id IS NOT NULL
DO UPDATE SET
  approved_channel_id = EXCLUDED.approved_channel_id,
  priority = LEAST(public.channels_state.priority, EXCLUDED.priority),
  channel_name = COALESCE(public.channels_state.channel_name, EXCLUDED.channel_name);

-- === Trigger: auto-register newly approved channels ===
CREATE OR REPLACE FUNCTION public._sync_approved_channel_to_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.youtube_channel_id ~ '^UC[A-Za-z0-9_-]{22}$' THEN
    INSERT INTO public.channels_state
      (channel_name, channel_id, approved_channel_id, priority, status, next_attempt_at)
    VALUES (NEW.title, NEW.youtube_channel_id, NEW.id, 10, 'pending', now())
    ON CONFLICT (channel_id) WHERE channel_id IS NOT NULL
    DO UPDATE SET
      approved_channel_id = EXCLUDED.approved_channel_id,
      priority = LEAST(public.channels_state.priority, 10),
      status = CASE WHEN public.channels_state.status = 'dead' THEN 'pending' ELSE public.channels_state.status END,
      next_attempt_at = LEAST(public.channels_state.next_attempt_at, now());
  ELSIF NEW.status <> 'active' THEN
    UPDATE public.channels_state
       SET status = 'paused'
     WHERE channel_id = NEW.youtube_channel_id
       AND status <> 'dead';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._sync_approved_channel_to_state() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_approved_to_state ON public.approved_channels;
CREATE TRIGGER trg_sync_approved_to_state
AFTER INSERT OR UPDATE OF status, youtube_channel_id, title ON public.approved_channels
FOR EACH ROW EXECUTE FUNCTION public._sync_approved_channel_to_state();

-- === Health view ===
CREATE OR REPLACE VIEW public.v_ingestion_health AS
WITH channel_video_counts AS (
  SELECT ac.id AS approved_channel_id, ac.youtube_channel_id, ac.title,
         COUNT(cv.id) AS video_count,
         MAX(cv.ingested_at) AS last_video_ingested_at
  FROM public.approved_channels ac
  LEFT JOIN public.curated_videos cv ON lower(cv.channel_title) = lower(ac.title)
  WHERE ac.status = 'active'
  GROUP BY ac.id, ac.youtube_channel_id, ac.title
)
SELECT
  (SELECT COUNT(*) FROM public.approved_channels WHERE status='active') AS approved_active,
  (SELECT COUNT(*) FROM channel_video_counts WHERE video_count > 0) AS approved_with_videos,
  (SELECT COUNT(*) FROM channel_video_counts WHERE video_count = 0) AS approved_without_videos,
  (SELECT COUNT(*) FROM public.channels_state WHERE approved_channel_id IS NOT NULL) AS state_rows_linked,
  (SELECT COUNT(*) FROM public.channels_state WHERE status = 'dead') AS dead_letter_count,
  (SELECT COUNT(*) FROM public.channels_state WHERE status = 'failing') AS failing_count,
  (SELECT COUNT(*) FROM public.channels_state WHERE last_success_at > now() - interval '24 hours') AS successful_last_24h,
  (SELECT COUNT(*) FROM public.curated_videos WHERE ingested_at > now() - interval '24 hours') AS videos_ingested_last_24h,
  (SELECT COUNT(*) FROM public.curated_videos WHERE ingested_at > now() - interval '7 days') AS videos_ingested_last_7d;

GRANT SELECT ON public.v_ingestion_health TO authenticated, service_role;
