
CREATE TABLE IF NOT EXISTS public.attributions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   text NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ref_code     text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_term     text,
  utm_content  text,
  landing_url  text,
  referrer     text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

GRANT SELECT, INSERT, UPDATE ON public.attributions TO anon, authenticated;
GRANT ALL ON public.attributions TO service_role;

ALTER TABLE public.attributions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous first-time visitors) may create their own
-- first-touch row. session_id is a client-generated uuid.
CREATE POLICY "attribution first-touch insert"
  ON public.attributions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- A visitor may update their own row until it is claimed by a user.
-- Once user_id is set, only that user may update.
CREATE POLICY "attribution owner update"
  ON public.attributions FOR UPDATE
  TO anon, authenticated
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Owners see their own; admins see everything.
CREATE POLICY "attribution owner select"
  ON public.attributions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS attributions_user_idx     ON public.attributions (user_id);
CREATE INDEX IF NOT EXISTS attributions_campaign_idx ON public.attributions (utm_campaign);
CREATE INDEX IF NOT EXISTS attributions_source_idx   ON public.attributions (utm_source);
CREATE INDEX IF NOT EXISTS attributions_created_idx  ON public.attributions (created_at DESC);

CREATE TRIGGER attributions_updated_at
  BEFORE UPDATE ON public.attributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
