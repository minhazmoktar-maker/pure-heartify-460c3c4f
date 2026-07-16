import { supabase } from "@/integrations/supabase/client";

/**
 * Typed analytics event insert. Server-side trigger validates event_name and
 * required properties against event_schemas. Never throws — analytics failures
 * must not break UX.
 */
export async function track(
  event_name: string,
  properties: Record<string, unknown> = {},
  user_id?: string | null,
): Promise<void> {
  try {
    // Skip insert for anonymous callers — analytics_events RLS requires an
    // authenticated session and would return 401, flooding the console on
    // every public page load. Authenticated tracking still runs normally.
    let uid = user_id ?? null;
    if (!uid) {
      const { data } = await supabase.auth.getSession();
      uid = data.session?.user?.id ?? null;
      if (!uid) return;
    }
    const { error } = await supabase.from("analytics_events").insert([{
      event_name,
      user_id: uid,
      properties: properties as never,
    }]);
    if (error && import.meta.env.DEV) {
      console.warn("[analytics] rejected", event_name, error.message);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[analytics] error", e);
  }
}
