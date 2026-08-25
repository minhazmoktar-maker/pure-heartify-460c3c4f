-- Resumable (TUS) uploads go directly from the browser to storage using the
-- creator's own JWT, so storage.objects needs an owner-scoped policy. The
-- first path segment is always the uploader's auth user id, which the edge
-- functions also enforce when they mint signed URLs.
CREATE POLICY "creator_uploads_own_folder_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'creator-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "creator_uploads_own_folder_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'creator-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'creator-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "creator_uploads_own_folder_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'creator-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );