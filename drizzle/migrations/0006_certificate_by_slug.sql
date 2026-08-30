CREATE OR REPLACE FUNCTION public.issue_learning_certificate_by_slug(_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_path uuid;
BEGIN
  SELECT id INTO v_path FROM learning_paths WHERE slug = _slug AND published = true;
  IF v_path IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  RETURN public.issue_learning_certificate(v_path);
END $$;
REVOKE ALL ON FUNCTION public.issue_learning_certificate_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_learning_certificate_by_slug(text) TO authenticated;