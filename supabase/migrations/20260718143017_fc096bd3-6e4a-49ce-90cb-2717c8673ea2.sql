
-- DB-layer rate limit for public contact form to blunt spam / PII flooding.
-- Max 3 submissions per (lowercased) email per hour, and max 5 per remote
-- session (auth uid when signed in) per hour. Applies to anon + authenticated.
CREATE OR REPLACE FUNCTION public._contact_messages_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_by_email INT;
  recent_by_user INT;
BEGIN
  SELECT COUNT(*) INTO recent_by_email
  FROM public.contact_messages
  WHERE lower(email) = lower(NEW.email)
    AND created_at > now() - interval '1 hour';

  IF recent_by_email >= 3 THEN
    RAISE EXCEPTION 'contact_rate_limited'
      USING HINT = 'Too many contact submissions from this email. Please try again later.';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT COUNT(*) INTO recent_by_user
    FROM public.contact_messages
    WHERE user_id = auth.uid()
      AND created_at > now() - interval '1 hour';
    IF recent_by_user >= 5 THEN
      RAISE EXCEPTION 'contact_rate_limited'
        USING HINT = 'Too many contact submissions from this account. Please try again later.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._contact_messages_rate_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS contact_messages_rate_limit ON public.contact_messages;
CREATE TRIGGER contact_messages_rate_limit
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public._contact_messages_rate_limit();
