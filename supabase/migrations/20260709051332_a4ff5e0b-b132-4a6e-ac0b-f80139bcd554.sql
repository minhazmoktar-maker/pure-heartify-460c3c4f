-- Production alerts monitoring table
CREATE TABLE public.production_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'warn',
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  route text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_production_alerts_created ON public.production_alerts (created_at DESC);
CREATE INDEX idx_production_alerts_kind ON public.production_alerts (kind, created_at DESC);
CREATE INDEX idx_production_alerts_unresolved ON public.production_alerts (created_at DESC) WHERE resolved_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.production_alerts TO authenticated;
GRANT INSERT ON public.production_alerts TO anon;
GRANT ALL ON public.production_alerts TO service_role;

ALTER TABLE public.production_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert alerts (client-side error reporting)
CREATE POLICY "Anyone can report alerts"
ON public.production_alerts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read alerts"
ON public.production_alerts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update (resolve)
CREATE POLICY "Admins can resolve alerts"
ON public.production_alerts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));