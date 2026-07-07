
-- Restrict approved_channels to admins only (sensitive owner_key/approved_by columns)
DROP POLICY IF EXISTS "Public can read approved channels" ON public.approved_channels;
CREATE POLICY "Admins can read approved channels" ON public.approved_channels
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Restrict blocked_creators SELECT to admins only
DROP POLICY IF EXISTS "Anyone authenticated can view blocked creators" ON public.blocked_creators;
CREATE POLICY "Admins can view blocked creators" ON public.blocked_creators
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Restrict channel_audit_log SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can read audit log" ON public.channel_audit_log;
CREATE POLICY "Admins can read channel audit log" ON public.channel_audit_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Restrict video_audit_log SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can read video audit" ON public.video_audit_log;
CREATE POLICY "Admins can read video audit log" ON public.video_audit_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Restrict removed_videos SELECT to admins only (removes public exposure of reason/admin_id)
DROP POLICY IF EXISTS "public can read removed list" ON public.removed_videos;
CREATE POLICY "Admins can read removed videos" ON public.removed_videos
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Revoke anon grants on these sensitive tables
REVOKE SELECT ON public.approved_channels FROM anon;
REVOKE SELECT ON public.removed_videos FROM anon;
