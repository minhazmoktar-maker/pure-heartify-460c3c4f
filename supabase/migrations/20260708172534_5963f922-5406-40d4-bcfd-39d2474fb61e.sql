
CREATE TABLE IF NOT EXISTS public._internal_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public._internal_config TO service_role;
REVOKE ALL ON public._internal_config FROM authenticated, anon;
ALTER TABLE public._internal_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access" ON public._internal_config FOR ALL TO authenticated USING (false) WITH CHECK (false);
