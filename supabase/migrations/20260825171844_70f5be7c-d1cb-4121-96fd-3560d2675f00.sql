
CREATE TABLE public.creator_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  handle text NOT NULL UNIQUE,
  bio text,
  country text,
  languages text[] NOT NULL DEFAULT ARRAY['en']::text[],
  status text NOT NULL DEFAULT 'active',
  strikes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_accounts_status_chk CHECK (status IN ('active','suspended','banned')),
  CONSTRAINT creator_accounts_handle_chk CHECK (handle ~ '^[a-z0-9._-]{3,32}$')
);

GRANT SELECT ON public.creator_accounts TO anon;
GRANT SELECT, INSERT, UPDATE ON public.creator_accounts TO authenticated;
GRANT ALL ON public.creator_accounts TO service_role;
ALTER TABLE public.creator_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_accounts_public_read_active" ON public.creator_accounts
  FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "creator_accounts_self_read" ON public.creator_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "creator_accounts_self_insert" ON public.creator_accounts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'active' AND strikes = 0);
CREATE POLICY "creator_accounts_self_update" ON public.creator_accounts
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.creator_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  language text NOT NULL DEFAULT 'en',
  category text,
  video_path text,
  thumbnail_path text,
  duration_seconds integer,
  size_bytes bigint,
  status text NOT NULL DEFAULT 'draft',
  visual_state text NOT NULL DEFAULT 'unchecked',
  halal_score integer,
  moderation_reason text,
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  published_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_uploads_status_chk CHECK (status IN ('draft','uploading','pending_review','approved','rejected','removed')),
  CONSTRAINT creator_uploads_visual_chk CHECK (visual_state IN ('unchecked','clean','flagged')),
  CONSTRAINT creator_uploads_title_chk CHECK (char_length(title) BETWEEN 3 AND 160)
);

CREATE INDEX creator_uploads_status_published_idx ON public.creator_uploads (status, published_at DESC);
CREATE INDEX creator_uploads_owner_idx ON public.creator_uploads (user_id, created_at DESC);
CREATE INDEX creator_uploads_language_idx ON public.creator_uploads (language, status);

GRANT SELECT ON public.creator_uploads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_uploads TO authenticated;
GRANT ALL ON public.creator_uploads TO service_role;
ALTER TABLE public.creator_uploads ENABLE ROW LEVEL SECURITY;

-- Public: only approved + visually verified uploads are ever servable.
CREATE POLICY "creator_uploads_public_read_approved" ON public.creator_uploads
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND visual_state = 'clean');
CREATE POLICY "creator_uploads_owner_read" ON public.creator_uploads
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "creator_uploads_moderator_read" ON public.creator_uploads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));
-- Owners may edit metadata only while the upload is not live, and may never
-- self-approve: status/visual_state/halal_score transitions are done by the
-- edge functions with the service role.
CREATE POLICY "creator_uploads_owner_update_draft" ON public.creator_uploads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('draft','rejected'))
  WITH CHECK (user_id = auth.uid() AND status IN ('draft','rejected') AND visual_state <> 'clean');
CREATE POLICY "creator_uploads_owner_delete_draft" ON public.creator_uploads
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status IN ('draft','rejected'));
CREATE POLICY "creator_uploads_moderator_update" ON public.creator_uploads
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.creator_upload_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.creator_uploads(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_kind text NOT NULL DEFAULT 'system',
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX creator_upload_events_upload_idx ON public.creator_upload_events (upload_id, created_at DESC);

GRANT SELECT ON public.creator_upload_events TO authenticated;
GRANT ALL ON public.creator_upload_events TO service_role;
ALTER TABLE public.creator_upload_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_upload_events_owner_read" ON public.creator_upload_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.creator_uploads u
    WHERE u.id = creator_upload_events.upload_id AND u.user_id = auth.uid()
  ));
CREATE POLICY "creator_upload_events_moderator_read" ON public.creator_upload_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.creator_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER creator_accounts_touch BEFORE UPDATE ON public.creator_accounts
  FOR EACH ROW EXECUTE FUNCTION public.creator_touch_updated_at();
CREATE TRIGGER creator_uploads_touch BEFORE UPDATE ON public.creator_uploads
  FOR EACH ROW EXECUTE FUNCTION public.creator_touch_updated_at();

-- Server-side halal floor for native uploads: the same trigger discipline the
-- YouTube corpus uses. An upload can never be published with unverified
-- imagery, and blocked terms in the title/description are rejected in the DB.
CREATE OR REPLACE FUNCTION public.creator_uploads_halal_floor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.visual_state <> 'clean' THEN
    RAISE EXCEPTION 'creator upload % cannot be approved before visual verification', NEW.id;
  END IF;
  IF public._inappropriate_pattern(coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,'')) THEN
    NEW.status := 'rejected';
    NEW.visual_state := 'flagged';
    NEW.moderation_reason := coalesce(NEW.moderation_reason, 'halal_text_pattern');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER creator_uploads_halal_floor_trg
  BEFORE INSERT OR UPDATE ON public.creator_uploads
  FOR EACH ROW EXECUTE FUNCTION public.creator_uploads_halal_floor();

-- Safe view counter: callers cannot write view_count directly (owner policy
-- blocks approved rows), so bumping goes through this definer function.
CREATE OR REPLACE FUNCTION public.bump_creator_upload_view(p_upload_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.creator_uploads
  SET view_count = view_count + 1
  WHERE id = p_upload_id AND status = 'approved' AND visual_state = 'clean';
$$;

REVOKE ALL ON FUNCTION public.bump_creator_upload_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_creator_upload_view(uuid) TO anon, authenticated, service_role;

-- Moderation queue summary for /admin/creator-review.
CREATE OR REPLACE FUNCTION public.creator_review_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'generated_at', now(),
    'pending', count(*) FILTER (WHERE status = 'pending_review'),
    'approved', count(*) FILTER (WHERE status = 'approved'),
    'rejected', count(*) FILTER (WHERE status = 'rejected'),
    'drafts', count(*) FILTER (WHERE status IN ('draft','uploading')),
    'creators', (SELECT count(*) FROM public.creator_accounts WHERE status = 'active'),
    'oldest_pending_minutes',
      coalesce(round(extract(epoch FROM now() - min(created_at) FILTER (WHERE status = 'pending_review')) / 60), 0)
  ) INTO result FROM public.creator_uploads;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.creator_review_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_review_summary() TO authenticated, service_role;
