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
    const { error } = await supabase.from("analytics_events").insert([{
      event_name,
      user_id: user_id ?? null,
      properties: properties as never,
    }]);
    if (error && import.meta.env.DEV) {
      console.warn("[analytics] rejected", event_name, error.message);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[analytics] error", e);
  }
}
