
CREATE TABLE public.referral_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  threshold INT NOT NULL CHECK (threshold > 0),
  reward_type TEXT NOT NULL,
  reward_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_tiers TO authenticated, anon;
GRANT ALL ON public.referral_tiers TO service_role;

ALTER TABLE public.referral_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view referral tiers"
  ON public.referral_tiers FOR SELECT USING (true);

CREATE POLICY "Owners can manage referral tiers"
  ON public.referral_tiers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.platform_owners WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_owners WHERE user_id = auth.uid()));

CREATE TRIGGER update_referral_tiers_updated_at
  BEFORE UPDATE ON public.referral_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.referral_tiers (slug, label, threshold, reward_type, reward_value, sort_order) VALUES
  ('bronze',   'Bronze Inviter',   1,  'badge',         '{"badge":"bronze_inviter"}'::jsonb,     10),
  ('silver',   'Silver Inviter',   5,  'streak_freeze', '{"count":2}'::jsonb,                    20),
  ('gold',     'Gold Inviter',    15,  'premium_days',  '{"days":30}'::jsonb,                    30),
  ('platinum', 'Platinum Inviter',50,  'premium_days',  '{"days":180,"badge":"platinum"}'::jsonb,40);

CREATE OR REPLACE FUNCTION public.get_referral_tier_progress()
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  redeemed_count INT;
  current_tier RECORD;
  next_tier RECORD;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error','unauthenticated');
  END IF;

  SELECT count(*)::int INTO redeemed_count
  FROM public.referrals
  WHERE inviter_id = uid AND status = 'redeemed';

  SELECT * INTO current_tier
  FROM public.referral_tiers
  WHERE threshold <= redeemed_count
  ORDER BY threshold DESC LIMIT 1;

  SELECT * INTO next_tier
  FROM public.referral_tiers
  WHERE threshold > redeemed_count
  ORDER BY threshold ASC LIMIT 1;

  RETURN jsonb_build_object(
    'redeemed_count', redeemed_count,
    'current_tier', CASE WHEN current_tier.id IS NULL THEN NULL ELSE
      jsonb_build_object('slug',current_tier.slug,'label',current_tier.label,'threshold',current_tier.threshold)
    END,
    'next_tier', CASE WHEN next_tier.id IS NULL THEN NULL ELSE
      jsonb_build_object('slug',next_tier.slug,'label',next_tier.label,'threshold',next_tier.threshold,
        'remaining', next_tier.threshold - redeemed_count)
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_tier_progress() TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_referral_tier_rewards()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  redeemed_count INT;
  t RECORD;
  granted_slugs TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error','unauthenticated');
  END IF;

  SELECT count(*)::int INTO redeemed_count
  FROM public.referrals
  WHERE inviter_id = uid AND status = 'redeemed';

  FOR t IN
    SELECT * FROM public.referral_tiers
    WHERE threshold <= redeemed_count
    ORDER BY threshold ASC
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.referral_rewards
      WHERE user_id = uid
        AND reward_value ? 'tier'
        AND reward_value->>'tier' = t.slug
    ) THEN
      INSERT INTO public.referral_rewards (user_id, role, reward_type, reward_value)
      VALUES (uid, 'inviter', t.reward_type, t.reward_value || jsonb_build_object('tier', t.slug));
      granted_slugs := array_append(granted_slugs, t.slug);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('granted', to_jsonb(granted_slugs), 'redeemed_count', redeemed_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_referral_tier_rewards() TO authenticated;
