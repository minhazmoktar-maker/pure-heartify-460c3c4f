
-- Super-admin bootstrap for minhazmoktar@gmail.com and admin-managed video removal blocklist

-- 1. Grant admin role to the fixed super-admin email if the user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email = 'minhazmoktar@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Update handle_new_user so this email auto-becomes admin on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  IF lower(NEW.email) = 'minhazmoktar@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Removed-videos blocklist for admin takedowns
CREATE TABLE IF NOT EXISTS public.removed_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL UNIQUE,
  reason text,
  removed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.removed_videos TO anon, authenticated;
GRANT INSERT, DELETE ON public.removed_videos TO authenticated;
GRANT ALL ON public.removed_videos TO service_role;

ALTER TABLE public.removed_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read removed list"
  ON public.removed_videos FOR SELECT
  USING (true);

CREATE POLICY "admins can add removals"
  ON public.removed_videos FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can undo removals"
  ON public.removed_videos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Also block removed videos from re-entering curated_videos
CREATE OR REPLACE FUNCTION public.reject_removed_video()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.removed_videos WHERE video_id = NEW.video_id) THEN
    RAISE EXCEPTION 'Video % is on the admin removal blocklist', NEW.video_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_removed_video ON public.curated_videos;
CREATE TRIGGER trg_reject_removed_video
  BEFORE INSERT OR UPDATE ON public.curated_videos
  FOR EACH ROW EXECUTE FUNCTION public.reject_removed_video();
