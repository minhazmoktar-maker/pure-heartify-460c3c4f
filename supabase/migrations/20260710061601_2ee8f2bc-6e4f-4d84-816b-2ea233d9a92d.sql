
-- 1. Dua ameens: remove public SELECT (duplicate of authenticated policy)
DROP POLICY IF EXISTS "Anyone can read ameens" ON public.dua_ameens;

-- 2. User badges: remove public SELECT (own-read policy remains)
DROP POLICY IF EXISTS "ub_public_read" ON public.user_badges;

-- 3. Production alerts: restrict INSERT to service_role (edge functions)
DROP POLICY IF EXISTS "Anyone can report alerts" ON public.production_alerts;
CREATE POLICY "Service role inserts alerts"
  ON public.production_alerts FOR INSERT TO service_role
  WITH CHECK (true);

-- 4. Referral clicks: replace WITH CHECK (true) with a shape check
DROP POLICY IF EXISTS "rc_insert_any" ON public.referral_clicks;
CREATE POLICY "rc_insert_valid_code"
  ON public.referral_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (
    code IS NOT NULL
    AND char_length(code) BETWEEN 4 AND 32
    AND code = upper(code)
  );
