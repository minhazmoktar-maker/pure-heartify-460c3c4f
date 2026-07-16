
-- Discovery metadata on candidates (candidates table already has RLS + GRANTs)
ALTER TABLE public.channel_candidates
  ADD COLUMN IF NOT EXISTS source_channel_id text,
  ADD COLUMN IF NOT EXISTS discovery_method text,
  ADD COLUMN IF NOT EXISTS priority_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS halal_topic_hint text,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamp with time zone;

-- Broaden the source check to explicitly allow 'discovery'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'channel_candidates_source_check'
  ) THEN
    ALTER TABLE public.channel_candidates
      ADD CONSTRAINT channel_candidates_source_check
      CHECK (source IN ('manual','discovery','user_suggestion','import'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS channel_candidates_status_priority_idx
  ON public.channel_candidates (status, priority_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS channel_candidates_discovery_method_idx
  ON public.channel_candidates (discovery_method)
  WHERE discovery_method IS NOT NULL;

-- Daily quota ledger for the discovery crawler
CREATE TABLE IF NOT EXISTS public.discovery_quota_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL,
  api_name text NOT NULL,
  units_used integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (day, api_name)
);

GRANT SELECT ON public.discovery_quota_ledger TO authenticated;
GRANT ALL ON public.discovery_quota_ledger TO service_role;

ALTER TABLE public.discovery_quota_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read discovery quota"
  ON public.discovery_quota_ledger FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
