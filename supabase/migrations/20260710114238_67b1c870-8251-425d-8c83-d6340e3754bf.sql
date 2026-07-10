
CREATE TABLE public.plus_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  preferred_tier TEXT NOT NULL DEFAULT 'plus',
  country_code TEXT,
  interested_features JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX plus_waitlist_email_lower_idx ON public.plus_waitlist (LOWER(email));
CREATE INDEX plus_waitlist_user_idx ON public.plus_waitlist (user_id);

GRANT SELECT, INSERT ON public.plus_waitlist TO authenticated;
GRANT INSERT ON public.plus_waitlist TO anon;
GRANT ALL ON public.plus_waitlist TO service_role;

ALTER TABLE public.plus_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) may join the waitlist. Email is validated by the CHECK below.
CREATE POLICY "Anyone can join waitlist"
  ON public.plus_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 254
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND preferred_tier IN ('plus','family','lifetime')
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Signed-in users can see their own waitlist row.
CREATE POLICY "Users read own waitlist entry"
  ON public.plus_waitlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR LOWER(email) = LOWER(COALESCE((auth.jwt() ->> 'email'), '')));

-- Owners/admins can read all.
CREATE POLICY "Admins read waitlist"
  ON public.plus_waitlist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));
