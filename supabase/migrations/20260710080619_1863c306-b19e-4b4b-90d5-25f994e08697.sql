
CREATE OR REPLACE FUNCTION public.get_public_khatm_group(_id uuid, _code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _g public.khatm_groups;
  _claimed int;
  _completed int;
  _members int;
BEGIN
  SELECT * INTO _g FROM public.khatm_groups WHERE id = _id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Gate: public OR invite code matches
  IF NOT _g.is_public AND (_code IS NULL OR lower(_code) <> _g.invite_code) THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO _claimed FROM public.khatm_juz_claims WHERE group_id = _id;
  SELECT count(*) INTO _completed FROM public.khatm_juz_claims WHERE group_id = _id AND completed_at IS NOT NULL;
  SELECT count(*) INTO _members FROM public.khatm_group_members WHERE group_id = _id;

  RETURN jsonb_build_object(
    'id', _g.id,
    'name', _g.name,
    'description', _g.description,
    'intention', _g.intention,
    'invite_code', _g.invite_code,
    'is_public', _g.is_public,
    'target_completion_at', _g.target_completion_at,
    'completed_at', _g.completed_at,
    'juz_claimed', _claimed,
    'juz_completed', _completed,
    'member_count', _members,
    'created_at', _g.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_khatm_group(uuid, text) TO anon, authenticated;
