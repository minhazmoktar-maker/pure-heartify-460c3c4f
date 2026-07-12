
-- ============================================================
-- 1. VIDEO COMMENTS
-- ============================================================
CREATE TABLE public.video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.video_comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','removed')),
  likes_count integer NOT NULL DEFAULT 0,
  replies_count integer NOT NULL DEFAULT 0,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX video_comments_video_created_idx ON public.video_comments(video_id, created_at DESC) WHERE status = 'visible';
CREATE INDEX video_comments_parent_idx ON public.video_comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX video_comments_user_idx ON public.video_comments(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_comments TO authenticated;
GRANT SELECT ON public.video_comments TO anon;
GRANT ALL ON public.video_comments TO service_role;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visible comments"
  ON public.video_comments FOR SELECT
  USING (status = 'visible' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can post comments"
  ON public.video_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'visible');

CREATE POLICY "Users edit own comments; admins any"
  ON public.video_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own comments; admins any"
  ON public.video_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- updated_at + edited_at trigger
CREATE OR REPLACE FUNCTION public.video_comments_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' AND NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.edited_at := now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER video_comments_touch_trg BEFORE UPDATE ON public.video_comments
FOR EACH ROW EXECUTE FUNCTION public.video_comments_touch();

-- replies_count maintenance
CREATE OR REPLACE FUNCTION public.video_comments_replies_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE public.video_comments SET replies_count = replies_count + 1 WHERE id = NEW.parent_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE public.video_comments SET replies_count = GREATEST(replies_count - 1, 0) WHERE id = OLD.parent_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER video_comments_replies_count_trg
AFTER INSERT OR DELETE ON public.video_comments
FOR EACH ROW EXECUTE FUNCTION public.video_comments_replies_count();

-- ============================================================
-- 2. COMMENT REACTIONS
-- ============================================================
CREATE TABLE public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.video_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'like' CHECK (kind IN ('like','ameen')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, kind)
);
CREATE INDEX comment_reactions_comment_idx ON public.comment_reactions(comment_id);

GRANT SELECT, INSERT, DELETE ON public.comment_reactions TO authenticated;
GRANT SELECT ON public.comment_reactions TO anon;
GRANT ALL ON public.comment_reactions TO service_role;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comment reactions"
  ON public.comment_reactions FOR SELECT USING (true);
CREATE POLICY "Users add own reactions"
  ON public.comment_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions"
  ON public.comment_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- likes_count maintenance
CREATE OR REPLACE FUNCTION public.comment_reactions_likes_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.video_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.video_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER comment_reactions_likes_count_trg
AFTER INSERT OR DELETE ON public.comment_reactions
FOR EACH ROW EXECUTE FUNCTION public.comment_reactions_likes_count();

-- ============================================================
-- 3. FOLLOWS (user -> approved_channel)
-- ============================================================
CREATE TABLE public.channel_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.approved_channels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, channel_id)
);
CREATE INDEX channel_follows_follower_idx ON public.channel_follows(follower_id, created_at DESC);
CREATE INDEX channel_follows_channel_idx ON public.channel_follows(channel_id);

GRANT SELECT, INSERT, DELETE ON public.channel_follows TO authenticated;
GRANT ALL ON public.channel_follows TO service_role;
ALTER TABLE public.channel_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows readable to self and channel owner"
  ON public.channel_follows FOR SELECT TO authenticated
  USING (
    auth.uid() = follower_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.approved_channels ac WHERE ac.id = channel_id AND ac.owner_key = auth.uid()::text)
  );
CREATE POLICY "Users create own follows"
  ON public.channel_follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users delete own follows"
  ON public.channel_follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- ============================================================
-- 4. PLAYLISTS + PLAYLIST ITEMS
-- ============================================================
CREATE TABLE public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','unlisted','public')),
  cover_video_id text,
  items_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX playlists_owner_idx ON public.playlists(owner_id, updated_at DESC);
CREATE INDEX playlists_public_idx ON public.playlists(created_at DESC) WHERE visibility = 'public';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT SELECT ON public.playlists TO anon;
GRANT ALL ON public.playlists TO service_role;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playlists readable by owner, public, or unlisted"
  ON public.playlists FOR SELECT
  USING (
    visibility IN ('public','unlisted')
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Users create own playlists"
  ON public.playlists FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users update own playlists"
  ON public.playlists FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users delete own playlists"
  ON public.playlists FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.playlists_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
CREATE TRIGGER playlists_touch_trg BEFORE UPDATE ON public.playlists
FOR EACH ROW EXECUTE FUNCTION public.playlists_touch();

CREATE TABLE public.playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, video_id)
);
CREATE INDEX playlist_items_playlist_idx ON public.playlist_items(playlist_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_items TO authenticated;
GRANT SELECT ON public.playlist_items TO anon;
GRANT ALL ON public.playlist_items TO service_role;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playlist items follow parent visibility"
  ON public.playlist_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.playlists p
    WHERE p.id = playlist_id
      AND (p.visibility IN ('public','unlisted') OR auth.uid() = p.owner_id OR public.has_role(auth.uid(),'admin'))
  ));
CREATE POLICY "Owner manages playlist items"
  ON public.playlist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.playlist_items_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.playlists SET items_count = items_count + 1, updated_at = now() WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.playlists SET items_count = GREATEST(items_count - 1, 0), updated_at = now() WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER playlist_items_count_trg
AFTER INSERT OR DELETE ON public.playlist_items
FOR EACH ROW EXECUTE FUNCTION public.playlist_items_count();

-- ============================================================
-- 5. USER BLOCKS
-- ============================================================
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_user_id),
  CHECK (blocker_id <> blocked_user_id)
);
CREATE INDEX user_blocks_blocker_idx ON public.user_blocks(blocker_id);

GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own block list"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);
CREATE POLICY "Users create own blocks"
  ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users remove own blocks"
  ON public.user_blocks FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

-- ============================================================
-- 6. APPEALS
-- ============================================================
CREATE TABLE public.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES public.moderation_decisions(id) ON DELETE SET NULL,
  subject_kind text NOT NULL CHECK (subject_kind IN ('video','comment','account','channel')),
  subject_ref text NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved','denied','withdrawn')),
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appeals_status_created_idx ON public.appeals(status, created_at DESC);
CREATE INDEX appeals_user_idx ON public.appeals(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.appeals TO authenticated;
GRANT ALL ON public.appeals TO service_role;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own appeals; admins read all"
  ON public.appeals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users file appeals"
  ON public.appeals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'open');
CREATE POLICY "Users withdraw; admins resolve"
  ON public.appeals FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND status = 'open')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (auth.uid() = user_id AND status IN ('open','withdrawn'))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.appeals_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IN ('approved','denied') AND OLD.status = 'open' THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
    NEW.resolved_by := COALESCE(NEW.resolved_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER appeals_touch_trg BEFORE UPDATE ON public.appeals
FOR EACH ROW EXECUTE FUNCTION public.appeals_touch();

-- ============================================================
-- 7. HIDDEN VIDEOS (per-user "not interested")
-- ============================================================
CREATE TABLE public.user_hidden_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  reason text CHECK (reason IS NULL OR reason IN ('not_interested','dislike','already_watched','offensive','other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
CREATE INDEX user_hidden_videos_user_idx ON public.user_hidden_videos(user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.user_hidden_videos TO authenticated;
GRANT ALL ON public.user_hidden_videos TO service_role;
ALTER TABLE public.user_hidden_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hidden videos"
  ON public.user_hidden_videos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. PUBLIC TRANSPARENCY VIEW  (aggregated, no PII)
-- ============================================================
CREATE OR REPLACE VIEW public.transparency_report AS
SELECT
  date_trunc('month', created_at)::date AS period,
  stage::text AS stage,
  state::text AS state,
  count(*)::bigint AS decisions
FROM public.moderation_decisions
WHERE created_at > now() - interval '18 months'
GROUP BY 1, 2, 3;

GRANT SELECT ON public.transparency_report TO anon, authenticated;

CREATE OR REPLACE VIEW public.transparency_appeals AS
SELECT
  date_trunc('month', created_at)::date AS period,
  status,
  count(*)::bigint AS appeals
FROM public.appeals
WHERE created_at > now() - interval '18 months'
GROUP BY 1, 2;

GRANT SELECT ON public.transparency_appeals TO anon, authenticated;

-- Add realtime replica identity so counters stream cleanly if enabled later
ALTER TABLE public.video_comments REPLICA IDENTITY FULL;
ALTER TABLE public.comment_reactions REPLICA IDENTITY FULL;
