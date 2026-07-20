// Shared server-side cap on push notifications.
// Policy (see docs/NOTIFICATION_POLICY.md):
//   Maximum 3 PUSH notifications per user in any rolling 7-day window.
//
// Counting rule: rows in public.user_notifications where
//   data->>'channel' = 'push' AND created_at >= now() - 7 days.
// In-app-only rows (channel='in_app' or absent) do NOT count.
//
// All senders MUST call `canSendPush(...)` before dispatching a push, and
// then insert the delivery record with `data.channel = 'push'` (helper
// `recordPushSend` does both fields in one insert).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

export const PUSH_CAP_LIMIT = 3;
export const PUSH_CAP_WINDOW_DAYS = 7;

export async function canSendPush(
  admin: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; sent: number; limit: number }> {
  const since = new Date(
    Date.now() - PUSH_CAP_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { count, error } = await admin
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .filter("data->>channel", "eq", "push")
    .gte("created_at", since);
  if (error) {
    // Fail closed: don't spam users if we can't measure.
    return { ok: false, sent: -1, limit: PUSH_CAP_LIMIT };
  }
  const sent = count ?? 0;
  return { ok: sent < PUSH_CAP_LIMIT, sent, limit: PUSH_CAP_LIMIT };
}

export async function recordPushSend(
  admin: SupabaseClient,
  args: {
    user_id: string;
    kind: string;
    title: string;
    body?: string | null;
    data?: Record<string, unknown>;
  },
) {
  return await admin.from("user_notifications").insert({
    user_id: args.user_id,
    kind: args.kind,
    title: args.title,
    body: args.body ?? null,
    data: { ...(args.data ?? {}), channel: "push" },
  });
}
