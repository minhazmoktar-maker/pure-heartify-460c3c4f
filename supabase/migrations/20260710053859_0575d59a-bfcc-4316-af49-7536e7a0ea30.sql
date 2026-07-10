
-- Gifts table
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('streak_freeze','premium_month')),
  months INT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gifts_sender ON public.gifts(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gifts_recipient ON public.gifts(recipient_id, created_at DESC);

GRANT SELECT, INSERT ON public.gifts TO authenticated;
GRANT ALL ON public.gifts TO service_role;

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gifts they sent or received"
  ON public.gifts FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- No direct INSERT: all writes go through SECURITY DEFINER RPCs.
CREATE POLICY "No direct inserts"
  ON public.gifts FOR INSERT TO authenticated
  WITH CHECK (false);

-- Streak freeze gift RPC
CREATE OR REPLACE FUNCTION public.gift_streak_freeze(_recipient UUID, _note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender UUID := auth.uid();
  _freeze_id UUID;
  _today_count INT;
BEGIN
  IF _sender IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _recipient IS NULL OR _recipient = _sender THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _recipient) THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  -- Anti-abuse: max 5 gifts per sender per day
  SELECT count(*) INTO _today_count FROM public.gifts
    WHERE sender_id = _sender AND created_at >= now() - interval '24 hours';
  IF _today_count >= 5 THEN
    RAISE EXCEPTION 'Daily gift limit reached';
  END IF;

  -- Consume one of sender's unused freezes
  SELECT id INTO _freeze_id FROM public.streak_freezes
    WHERE user_id = _sender AND used_at IS NULL
    ORDER BY granted_at ASC LIMIT 1 FOR UPDATE;
  IF _freeze_id IS NULL THEN
    RAISE EXCEPTION 'You have no freezes to gift';
  END IF;

  UPDATE public.streak_freezes SET used_at = now(), reason = 'gifted'
    WHERE id = _freeze_id;

  -- Grant a new freeze to the recipient
  INSERT INTO public.streak_freezes(user_id, reason)
    VALUES (_recipient, 'gift');

  -- Log gift (bypass RLS via SECURITY DEFINER)
  INSERT INTO public.gifts(sender_id, recipient_id, kind, note)
    VALUES (_sender, _recipient, 'streak_freeze', _note);

  -- Notify recipient
  INSERT INTO public.user_notifications(user_id, kind, title, body, data)
    VALUES (_recipient, 'gift_received', 'You received a streak freeze 🧊',
            'A friend gifted you a streak freeze — use it to protect your streak.',
            jsonb_build_object('kind','streak_freeze','sender_id',_sender));

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.gift_streak_freeze(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.gift_streak_freeze(UUID, TEXT) TO authenticated;

-- Premium month gift RPC
CREATE OR REPLACE FUNCTION public.gift_premium_month(_recipient UUID, _months INT DEFAULT 1, _note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender UUID := auth.uid();
  _has_premium BOOLEAN;
  _current_expiry TIMESTAMPTZ;
  _new_expiry TIMESTAMPTZ;
  _today_count INT;
BEGIN
  IF _sender IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _recipient IS NULL OR _recipient = _sender THEN RAISE EXCEPTION 'Invalid recipient'; END IF;
  IF _months IS NULL OR _months < 1 OR _months > 12 THEN RAISE EXCEPTION 'Months must be 1-12'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _recipient) THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  -- Sender must currently have premium (only premium users can gift premium)
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE user_id = _sender AND plan = 'premium'
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO _has_premium;
  IF NOT _has_premium THEN
    RAISE EXCEPTION 'Only premium members can gift premium';
  END IF;

  SELECT count(*) INTO _today_count FROM public.gifts
    WHERE sender_id = _sender AND created_at >= now() - interval '24 hours';
  IF _today_count >= 5 THEN
    RAISE EXCEPTION 'Daily gift limit reached';
  END IF;

  -- Extend or create recipient entitlement
  SELECT expires_at INTO _current_expiry FROM public.entitlements
    WHERE user_id = _recipient AND plan = 'premium'
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  _new_expiry := greatest(coalesce(_current_expiry, now()), now()) + (_months || ' months')::interval;

  IF _current_expiry IS NOT NULL THEN
    UPDATE public.entitlements SET expires_at = _new_expiry, updated_at = now()
      WHERE user_id = _recipient AND plan = 'premium';
  ELSE
    INSERT INTO public.entitlements(user_id, plan, expires_at)
      VALUES (_recipient, 'premium', _new_expiry);
  END IF;

  INSERT INTO public.gifts(sender_id, recipient_id, kind, months, note)
    VALUES (_sender, _recipient, 'premium_month', _months, _note);

  INSERT INTO public.user_notifications(user_id, kind, title, body, data)
    VALUES (_recipient, 'gift_received',
            'You received ' || _months || ' month(s) of Premium 🎁',
            'A friend gifted you Heartify Premium — enjoy!',
            jsonb_build_object('kind','premium_month','months',_months,'sender_id',_sender));

  RETURN jsonb_build_object('ok', true, 'expires_at', _new_expiry);
END;
$$;

REVOKE ALL ON FUNCTION public.gift_premium_month(UUID, INT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.gift_premium_month(UUID, INT, TEXT) TO authenticated;

-- Seed feature flags
INSERT INTO public.feature_flags(key, enabled, rollout_percent, description) VALUES
  ('viral.gift_freeze', true, 100, 'Allow users to gift a streak freeze to a friend'),
  ('viral.gift_premium', true, 100, 'Allow premium users to gift a premium month')
ON CONFLICT (key) DO NOTHING;
