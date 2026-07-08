
-- C2: Remove hardcoded owner email from security-critical functions.
-- Ownership is now decided solely by rows in public.platform_owners,
-- and prevent_last_owner_removal already guarantees the table stays populated.

CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_owners WHERE user_id = _user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  -- Owner promotion is intentionally NOT automatic. Owners are managed
  -- explicitly via the platform_owners table by an existing owner.
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_platform_owners()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- The last-owner safeguard is enforced by prevent_last_owner_removal.
  -- This trigger is now a no-op placeholder retained for schema stability.
  RETURN COALESCE(NEW, OLD);
END;
$function$;
