
CREATE OR REPLACE FUNCTION public._user_scoped_columns()
RETURNS TABLE(table_name text, column_name text, mode text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
  SELECT c.table_name::text, c.column_name::text,
    CASE
      WHEN c.table_name IN ('privileged_actions_log','moderation_overrides',
                            'moderation_rules','channel_trust_weights',
                            'search_synonyms','team_streaks','plus_seat_invites',
                            'video_audit_log','channel_audit_log','moderation_log',
                            'moderation_decisions','report_moderation_actions')
        THEN 'anonymize' ELSE 'delete' END AS mode
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.column_name IN ('user_id','owner_id','invitee_id','inviter_id',
                          'created_by','admin_id','actor_id','profile_id','author_id')
    AND c.table_name NOT IN ('platform_owners');
$$;

CREATE OR REPLACE FUNCTION public.scrub_user_data(_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE rec RECORD; result jsonb := '{}'::jsonb; affected int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'uid required'; END IF;
  FOR rec IN SELECT * FROM public._user_scoped_columns() LOOP
    BEGIN
      IF rec.mode = 'delete' THEN
        EXECUTE format('DELETE FROM public.%I WHERE %I = $1', rec.table_name, rec.column_name) USING _uid;
      ELSE
        EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I = $1', rec.table_name, rec.column_name, rec.column_name) USING _uid;
      END IF;
      GET DIAGNOSTICS affected = ROW_COUNT;
      result := result || jsonb_build_object(rec.table_name || '.' || rec.column_name, affected);
    EXCEPTION WHEN OTHERS THEN
      result := result || jsonb_build_object(rec.table_name || '.' || rec.column_name, 'error: ' || SQLERRM);
    END;
  END LOOP;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.scrub_user_data(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scrub_user_data(uuid) TO service_role;
REVOKE ALL ON FUNCTION public._user_scoped_columns() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._user_scoped_columns() TO service_role;

CREATE OR REPLACE FUNCTION public.export_user_data(_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE rec RECORD; result jsonb := '{}'::jsonb; rows jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'uid required'; END IF;
  FOR rec IN
    SELECT DISTINCT ON (table_name) table_name, column_name
    FROM public._user_scoped_columns() ORDER BY table_name, column_name
  LOOP
    BEGIN
      EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM public.%I t WHERE %I = $1',
                     rec.table_name, rec.column_name) INTO rows USING _uid;
      IF jsonb_array_length(rows) > 0 THEN
        result := result || jsonb_build_object(rec.table_name, rows);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      result := result || jsonb_build_object(rec.table_name, jsonb_build_object('error', SQLERRM));
    END;
  END LOOP;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.export_user_data(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO service_role;
