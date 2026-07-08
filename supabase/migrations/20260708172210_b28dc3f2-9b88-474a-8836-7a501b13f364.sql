
CREATE TABLE IF NOT EXISTS public.gsc_sync_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  site_url text,
  data jsonb NOT NULL,
  ok boolean NOT NULL DEFAULT true,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gsc_snap_kind_time ON public.gsc_sync_snapshots (kind, created_at DESC);

GRANT SELECT ON public.gsc_sync_snapshots TO authenticated;
GRANT ALL ON public.gsc_sync_snapshots TO service_role;

ALTER TABLE public.gsc_sync_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads gsc snapshots"
  ON public.gsc_sync_snapshots FOR SELECT TO authenticated
  USING (is_owner(auth.uid()));

CREATE POLICY "no client writes gsc snapshots"
  ON public.gsc_sync_snapshots FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
