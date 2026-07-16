
-- 1) Discovery jobs table (progress + monitoring)
CREATE TABLE IF NOT EXISTS public.discovery_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled','timed_out')),
  mode TEXT NOT NULL DEFAULT 'auto',
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  heartbeat_at TIMESTAMPTZ,
  cancel_requested BOOLEAN NOT NULL DEFAULT false,
  quota_used INTEGER NOT NULL DEFAULT 0,
  enqueued_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  seeds_processed INTEGER NOT NULL DEFAULT 0,
  api_failures INTEGER NOT NULL DEFAULT 0,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.discovery_jobs TO authenticated;
GRANT ALL ON public.discovery_jobs TO service_role;

ALTER TABLE public.discovery_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read discovery jobs"
  ON public.discovery_jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages discovery jobs"
  ON public.discovery_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_discovery_jobs_status_created
  ON public.discovery_jobs (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.discovery_jobs_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_discovery_jobs_touch ON public.discovery_jobs;
CREATE TRIGGER trg_discovery_jobs_touch
  BEFORE UPDATE ON public.discovery_jobs
  FOR EACH ROW EXECUTE FUNCTION public.discovery_jobs_touch();

-- 2) Batch duplicate check RPC — cuts per-candidate round trips.
CREATE OR REPLACE FUNCTION public.check_channel_duplicates_batch(
  _ids TEXT[]
)
RETURNS TABLE (youtube_channel_id TEXT, exists_in TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.yt AS youtube_channel_id,
         CASE
           WHEN a.youtube_channel_id IS NOT NULL THEN 'approved'
           WHEN cc.youtube_channel_id IS NOT NULL THEN 'candidate'
           ELSE NULL
         END AS exists_in
  FROM unnest(_ids) AS c(yt)
  LEFT JOIN public.approved_channels a ON a.youtube_channel_id = c.yt
  LEFT JOIN public.channel_candidates cc ON cc.youtube_channel_id = c.yt
  WHERE a.youtube_channel_id IS NOT NULL OR cc.youtube_channel_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.check_channel_duplicates_batch(TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_channel_duplicates_batch(TEXT[]) TO service_role;
