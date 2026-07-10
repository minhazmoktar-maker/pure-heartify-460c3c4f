
-- Anonymous Āmīn table + RPC: allows signed-out visitors to add a single Āmīn per browser fingerprint.
CREATE TABLE IF NOT EXISTS public.dua_anon_ameens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dua_id uuid NOT NULL REFERENCES public.dua_requests(id) ON DELETE CASCADE,
  fp text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dua_id, fp)
);

GRANT SELECT ON public.dua_anon_ameens TO anon, authenticated;
GRANT ALL ON public.dua_anon_ameens TO service_role;
ALTER TABLE public.dua_anon_ameens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view anon ameens" ON public.dua_anon_ameens;
CREATE POLICY "Anyone can view anon ameens" ON public.dua_anon_ameens FOR SELECT USING (true);

-- Only the RPC (security definer) writes. No direct INSERT policy.

CREATE OR REPLACE FUNCTION public.dua_anon_ameens_bump()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.dua_requests SET ameen_count = ameen_count + 1 WHERE id = NEW.dua_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.dua_requests SET ameen_count = GREATEST(0, ameen_count - 1) WHERE id = OLD.dua_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS dua_anon_ameens_bump_ins ON public.dua_anon_ameens;
DROP TRIGGER IF EXISTS dua_anon_ameens_bump_del ON public.dua_anon_ameens;
CREATE TRIGGER dua_anon_ameens_bump_ins AFTER INSERT ON public.dua_anon_ameens
  FOR EACH ROW EXECUTE FUNCTION public.dua_anon_ameens_bump();
CREATE TRIGGER dua_anon_ameens_bump_del AFTER DELETE ON public.dua_anon_ameens
  FOR EACH ROW EXECUTE FUNCTION public.dua_anon_ameens_bump();

-- Public RPC: idempotent anonymous Āmīn. Returns the new total count.
CREATE OR REPLACE FUNCTION public.add_anon_ameen(_dua_id uuid, _fp text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  IF _fp IS NULL OR length(_fp) < 8 OR length(_fp) > 128 THEN
    RAISE EXCEPTION 'invalid fingerprint';
  END IF;

  INSERT INTO public.dua_anon_ameens (dua_id, fp)
  VALUES (_dua_id, _fp)
  ON CONFLICT (dua_id, fp) DO NOTHING;

  SELECT ameen_count INTO _count FROM public.dua_requests WHERE id = _dua_id;
  RETURN COALESCE(_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.add_anon_ameen(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_anon_ameen(uuid, text) TO anon, authenticated;
