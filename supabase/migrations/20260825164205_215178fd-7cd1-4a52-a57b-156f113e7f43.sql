-- 1. Bengali ingestion verification audit ------------------------------------
CREATE TABLE public.bn_ingest_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,
  content_language text,
  passed boolean NOT NULL DEFAULT false,
  duplicate_of text,
  halal_ok boolean NOT NULL DEFAULT false,
  halal_score integer,
  metadata_ok boolean NOT NULL DEFAULT false,
  missing_fields text[] NOT NULL DEFAULT '{}',
  reasons text[] NOT NULL DEFAULT '{}',
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bn_ingest_verifications_video_idx ON public.bn_ingest_verifications (video_id);
CREATE INDEX bn_ingest_verifications_checked_idx ON public.bn_ingest_verifications (checked_at DESC);

GRANT SELECT ON public.bn_ingest_verifications TO authenticated;
GRANT ALL ON public.bn_ingest_verifications TO service_role;
ALTER TABLE public.bn_ingest_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bn_ingest_verifications_admin_read"
  ON public.bn_ingest_verifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 2. Mobile wallet payments (bKash / Nagad) ----------------------------------
CREATE TABLE public.mobile_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  wallet text NOT NULL CHECK (wallet IN ('bkash','nagad')),
  plan text NOT NULL CHECK (plan IN ('plus','family','lifetime')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'BDT',
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','initiated','pending','completed','failed','cancelled','refunded')),
  platform text NOT NULL DEFAULT 'web' CHECK (platform IN ('ios','android','web')),
  merchant_invoice text NOT NULL UNIQUE,
  gateway_payment_id text,
  gateway_trx_id text,
  gateway_status text,
  failure_reason text,
  redirect_url text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mobile_payments_user_idx ON public.mobile_payments (user_id, created_at DESC);
CREATE INDEX mobile_payments_gateway_idx ON public.mobile_payments (gateway_payment_id);

GRANT SELECT ON public.mobile_payments TO authenticated;
GRANT ALL ON public.mobile_payments TO service_role;
ALTER TABLE public.mobile_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mobile_payments_own_read"
  ON public.mobile_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.mobile_payments_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER mobile_payments_touch_trg BEFORE UPDATE ON public.mobile_payments
  FOR EACH ROW EXECUTE FUNCTION public.mobile_payments_touch();

-- 3. Entitlement grant on verified payment (backend only) --------------------
CREATE OR REPLACE FUNCTION public.grant_plan_entitlement(
  p_user_id uuid,
  p_plan text,
  p_months integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires timestamptz;
BEGIN
  IF p_user_id IS NULL OR p_plan NOT IN ('plus','family','lifetime') THEN
    RAISE EXCEPTION 'invalid plan grant';
  END IF;
  IF p_plan = 'lifetime' THEN
    v_expires := NULL;
  ELSE
    v_expires := greatest(now(), coalesce(
      (SELECT expires_at FROM entitlements WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1),
      now()
    )) + make_interval(months => greatest(1, coalesce(p_months, 1)));
  END IF;

  INSERT INTO entitlements (user_id, plan, expires_at)
  VALUES (p_user_id, p_plan, v_expires);
END;
$$;
REVOKE ALL ON FUNCTION public.grant_plan_entitlement(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_plan_entitlement(uuid, text, integer) TO service_role;

-- 4. Admin readout: Bengali catalog health -----------------------------------
CREATE OR REPLACE FUNCTION public.bn_catalog_health(p_language text DEFAULT 'bn')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'language', p_language,
    'total', count(*),
    'servable', count(*) FILTER (
      WHERE coalesce(is_hidden,false) = false
        AND coalesce(is_archived,false) = false
        AND visual_state = 'clean'
    ),
    'unchecked', count(*) FILTER (WHERE visual_state IS NULL OR visual_state = 'unchecked'),
    'flagged', count(*) FILTER (WHERE visual_state = 'flagged'),
    'missing_metadata', count(*) FILTER (
      WHERE thumbnail_url IS NULL OR title IS NULL OR channel_id IS NULL OR category IS NULL
    ),
    'channels', count(DISTINCT channel_id),
    'added_7d', count(*) FILTER (WHERE ingested_at > now() - interval '7 days')
  )
  INTO v
  FROM curated_videos
  WHERE content_language = p_language;

  RETURN v || jsonb_build_object(
    'verifications_24h', (
      SELECT jsonb_build_object(
        'checked', count(*),
        'passed', count(*) FILTER (WHERE passed),
        'duplicates', count(*) FILTER (WHERE duplicate_of IS NOT NULL),
        'halal_rejects', count(*) FILTER (WHERE NOT halal_ok),
        'metadata_rejects', count(*) FILTER (WHERE NOT metadata_ok)
      )
      FROM bn_ingest_verifications
      WHERE checked_at > now() - interval '24 hours'
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.bn_catalog_health(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bn_catalog_health(text) TO authenticated;