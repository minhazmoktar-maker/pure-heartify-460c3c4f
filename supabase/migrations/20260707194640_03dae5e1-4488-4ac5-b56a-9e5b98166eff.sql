
-- Owner key normalizer for alias/backup detection
CREATE OR REPLACE FUNCTION public.compute_owner_key(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    regexp_replace(
      lower(coalesce(_name, '')),
      '\s*(official|tv|hd|4k|backup|archive|channel|network|studio|productions?|media|[0-9]+)\s*$',
      '', 'g'
    ),
    '[^a-z0-9]+', '', 'g'
  );
$$;

-- Channel candidates (pending review)
CREATE TABLE public.channel_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_channel_id text UNIQUE NOT NULL,
  handle text,
  title text NOT NULL,
  description text,
  category text,
  language text,
  country text,
  subscriber_count integer,
  source text NOT NULL DEFAULT 'manual',
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','flagged')),
  confidence integer,
  duplicate_risk text CHECK (duplicate_risk IN ('low','medium','high')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_candidates TO authenticated;
GRANT ALL ON public.channel_candidates TO service_role;
ALTER TABLE public.channel_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage candidates" ON public.channel_candidates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_channel_candidates_updated
  BEFORE UPDATE ON public.channel_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approved channels (canonical whitelist)
CREATE TABLE public.approved_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_channel_id text UNIQUE NOT NULL,
  title text NOT NULL,
  handle text,
  category text,
  owner_key text NOT NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_rechecked_at timestamptz,
  consistency_score integer DEFAULT 100,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','flagged','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX approved_channels_owner_key_idx ON public.approved_channels(owner_key);
CREATE INDEX approved_channels_title_trgm ON public.approved_channels USING gin(title gin_trgm_ops);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approved_channels TO authenticated;
GRANT SELECT ON public.approved_channels TO anon;
GRANT ALL ON public.approved_channels TO service_role;
ALTER TABLE public.approved_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read approved channels" ON public.approved_channels
  FOR SELECT USING (true);

CREATE POLICY "Admins manage approved channels" ON public.approved_channels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_approved_channels_updated
  BEFORE UPDATE ON public.approved_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Channel audit log (immutable trail)
CREATE TABLE public.channel_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.channel_candidates(id) ON DELETE SET NULL,
  channel_ref uuid REFERENCES public.approved_channels(id) ON DELETE SET NULL,
  youtube_channel_id text,
  action text NOT NULL CHECK (action IN ('approved','rejected','flagged','rechecked','removed')),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confidence integer,
  duplicate_risk text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX channel_audit_created_idx ON public.channel_audit_log(created_at DESC);
CREATE INDEX channel_audit_action_idx ON public.channel_audit_log(action);

GRANT SELECT, INSERT ON public.channel_audit_log TO authenticated;
GRANT ALL ON public.channel_audit_log TO service_role;
ALTER TABLE public.channel_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read audit log" ON public.channel_audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can write audit log" ON public.channel_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Video candidates
CREATE TABLE public.video_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  channel_title text,
  youtube_channel_id text,
  thumbnail_url text,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','flagged')),
  confidence integer,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_candidates TO authenticated;
GRANT ALL ON public.video_candidates TO service_role;
ALTER TABLE public.video_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage video candidates" ON public.video_candidates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_video_candidates_updated
  BEFORE UPDATE ON public.video_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Video audit log
CREATE TABLE public.video_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.video_candidates(id) ON DELETE SET NULL,
  youtube_video_id text,
  action text NOT NULL CHECK (action IN ('approved','rejected','flagged','rechecked','removed')),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confidence integer,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX video_audit_created_idx ON public.video_audit_log(created_at DESC);

GRANT SELECT, INSERT ON public.video_audit_log TO authenticated;
GRANT ALL ON public.video_audit_log TO service_role;
ALTER TABLE public.video_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read video audit" ON public.video_audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can write video audit" ON public.video_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Duplicate detection: exact YouTube ID → owner_key → title similarity
CREATE OR REPLACE FUNCTION public.check_channel_duplicate(
  _yt_id text, _title text, _handle text
)
RETURNS TABLE(match_type text, matched_channel_id uuid, matched_title text, score real)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_key text := public.compute_owner_key(coalesce(_handle, _title));
BEGIN
  -- Exact YouTube channel ID
  RETURN QUERY
  SELECT 'exact_id'::text, id, title, 1.0::real
  FROM public.approved_channels
  WHERE youtube_channel_id = _yt_id
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- Owner key (aliases/backups)
  RETURN QUERY
  SELECT 'owner_key'::text, id, title, 0.95::real
  FROM public.approved_channels
  WHERE owner_key = _owner_key AND _owner_key <> ''
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- Fuzzy title similarity (pg_trgm)
  RETURN QUERY
  SELECT 'title_similarity'::text, id, title, similarity(title, _title)
  FROM public.approved_channels
  WHERE similarity(title, _title) > 0.7
  ORDER BY similarity(title, _title) DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_channel_duplicate(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_owner_key(text) TO authenticated, service_role, anon;
