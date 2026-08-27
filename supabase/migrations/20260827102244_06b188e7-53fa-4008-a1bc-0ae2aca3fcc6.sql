REVOKE EXECUTE ON FUNCTION public.admin_run_serving_audit(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_unserved_videos(text, text, integer, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reliability_timeline(integer) FROM anon;

CREATE OR REPLACE FUNCTION public.check_serving_predicate_failures(
  p_warn_delta numeric DEFAULT 1.0,
  p_error_delta numeric DEFAULT 3.0
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _total bigint; _not_clean bigint; _halal bigint;
  _cur_not_clean numeric; _cur_halal numeric;
  _base_not_clean numeric; _base_halal numeric;
  _alerts jsonb := '[]'::jsonb;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')
                            AND (visual_state IS NULL OR visual_state <> 'clean')),
         count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')
                            AND visual_state = 'clean'
                            AND (SELECT tier1 OR tier2 FROM public.halal_text_flags(title, channel_title)))
    INTO _total, _not_clean, _halal
  FROM public.curated_videos
  WHERE is_archived = false;

  _cur_not_clean := round(100.0 * _not_clean / GREATEST(_total, 1), 3);
  _cur_halal := round(100.0 * _halal / GREATEST(_total, 1), 3);

  SELECT round(avg((rates->>'visual_not_clean_pct')::numeric), 3),
         round(avg((rates->>'halal_filter_pct')::numeric), 3)
    INTO _base_not_clean, _base_halal
  FROM (SELECT rates FROM public.serving_audit_reports
        WHERE ran_at >= now() - interval '8 days' AND ran_at < now() - interval '12 hours'
        ORDER BY ran_at DESC LIMIT 7) r;

  IF _base_not_clean IS NOT NULL AND _cur_not_clean - _base_not_clean >= p_warn_delta THEN
    INSERT INTO public.production_alerts (kind, severity, message, route, context)
    VALUES ('serving_predicate_visual_spike',
      CASE WHEN _cur_not_clean - _base_not_clean >= p_error_delta THEN 'critical' ELSE 'error' END,
      format('Visual-state-not-clean exclusion rose to %s%% (7-day baseline %s%%)',
             _cur_not_clean, _base_not_clean),
      '/admin/unserved-videos',
      jsonb_build_object('metric','visual_not_clean_pct','value',_cur_not_clean,
        'baseline',_base_not_clean,'delta',round(_cur_not_clean - _base_not_clean,3),
        'affected',_not_clean,'total',_total));
    _alerts := _alerts || jsonb_build_object('kind','serving_predicate_visual_spike',
      'value',_cur_not_clean,'baseline',_base_not_clean);
  END IF;

  IF _base_halal IS NOT NULL AND _cur_halal - _base_halal >= p_warn_delta THEN
    INSERT INTO public.production_alerts (kind, severity, message, route, context)
    VALUES ('serving_predicate_halal_spike',
      CASE WHEN _cur_halal - _base_halal >= p_error_delta THEN 'critical' ELSE 'error' END,
      format('Halal-filter exclusion rose to %s%% (7-day baseline %s%%)',
             _cur_halal, _base_halal),
      '/admin/unserved-videos',
      jsonb_build_object('metric','halal_filter_pct','value',_cur_halal,
        'baseline',_base_halal,'delta',round(_cur_halal - _base_halal,3),
        'affected',_halal,'total',_total));
    _alerts := _alerts || jsonb_build_object('kind','serving_predicate_halal_spike',
      'value',_cur_halal,'baseline',_base_halal);
  END IF;

  RETURN jsonb_build_object('checked_at', now(), 'total', _total,
    'visual_not_clean_pct', _cur_not_clean, 'visual_baseline', _base_not_clean,
    'halal_filter_pct', _cur_halal, 'halal_baseline', _base_halal,
    'alerts', _alerts, 'raised', jsonb_array_length(_alerts));
END; $$;

REVOKE ALL ON FUNCTION public.check_serving_predicate_failures(numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_serving_predicate_failures(numeric, numeric) TO service_role;
