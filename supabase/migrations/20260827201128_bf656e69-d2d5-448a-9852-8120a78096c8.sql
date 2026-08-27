-- 1. Lock the SECURITY DEFINER role/entitlement probes away from anonymous callers.
-- They are invoked from RLS policies with auth.uid(); `authenticated` keeps the
-- EXECUTE grant because RLS policy expressions are evaluated with the caller's
-- privileges. anon/PUBLIC never need direct access — the client uses the
-- self-scoped viewer_* wrappers.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_entitlement(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_premium(uuid) FROM PUBLIC, anon;

-- 2. Let creators delete their own files in the private creator-uploads bucket
-- so removing a draft/rejected upload no longer orphans private media.
DROP POLICY IF EXISTS creator_uploads_own_folder_delete ON storage.objects;
CREATE POLICY creator_uploads_own_folder_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'creator-uploads'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);