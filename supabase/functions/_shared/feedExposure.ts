/**
 * First-class server-side session + exposure tracking.
 *
 * Every feed response records:
 *  - one `feed_sessions` row per session key (upserted, counters incremented),
 *  - one `feed_exposures` row per served video, with its 0-based position.
 *
 * This is authoritative across every client (web, iOS, Android, PWA) because it
 * is written on the serving path, not by client analytics that can be dropped,
 * blocked, or replayed. It is what powers repetition/fatigue detection,
 * novelty-decay measurement, and the 1,000-session simulation harness.
 *
 * Writes are fire-and-forget: telemetry must never add latency to, or fail, a
 * feed request.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type ExposureItem = {
  video_id: string;
  duplicate_group_id?: string | null;
  content_language?: string | null;
  channel_id?: string | null;
};

export type ExposureContext = {
  sessionKey: string;
  userId: string | null;
  surface: string;
  sort: string | null;
  pageIndex: number;
  variant: string | null;
  country: string | null;
  primaryLanguage: string | null;
};

/** Max exposure rows written per request — guards against a pathological limit. */
const MAX_ROWS = 100;

export function buildExposureRows(items: ExposureItem[], ctx: ExposureContext) {
  return items.slice(0, MAX_ROWS).map((v, i) => ({
    session_key: ctx.sessionKey,
    user_id: ctx.userId,
    video_id: v.video_id,
    position: ctx.pageIndex * items.length + i,
    surface: ctx.surface,
    sort: ctx.sort,
    page_index: ctx.pageIndex,
    variant: ctx.variant,
    duplicate_group_id: v.duplicate_group_id ?? null,
    content_language: v.content_language ?? null,
    channel_id: v.channel_id ?? null,
  }));
}

export function recordFeedServe(
  admin: SupabaseClient,
  items: ExposureItem[],
  ctx: ExposureContext,
): void {
  if (!ctx.sessionKey || ctx.sessionKey === "anon") return;

  void admin
    .rpc("touch_feed_session", {
      _session_key: ctx.sessionKey,
      _user_id: ctx.userId,
      _country: ctx.country,
      _primary_language: ctx.primaryLanguage,
      _surface: ctx.surface,
      _item_count: items.length,
    })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn("[feedExposure] session upsert failed:", error.message);
    });

  if (!items.length) return;
  void admin
    .from("feed_exposures")
    .insert(buildExposureRows(items, ctx))
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn("[feedExposure] exposure insert failed:", error.message);
    });
}

/**
 * Groups this session has already been shown. Used to keep a *later page* of
 * the same session from re-serving a different upload of the same lecture,
 * which the per-request collapse alone cannot see.
 */
export async function loadSessionServedGroups(
  admin: SupabaseClient,
  sessionKey: string,
): Promise<Set<string>> {
  if (!sessionKey || sessionKey === "anon") return new Set();
  try {
    const { data, error } = await admin
      .from("feed_exposures")
      .select("duplicate_group_id")
      .eq("session_key", sessionKey)
      .not("duplicate_group_id", "is", null)
      .order("served_at", { ascending: false })
      .limit(1200);
    if (error) throw new Error(error.message);
    return new Set(
      ((data ?? []) as Array<{ duplicate_group_id: string | null }>)
        .map((r) => r.duplicate_group_id)
        .filter((g): g is string => !!g),
    );
  } catch (e) {
    console.warn("[feedExposure] served-group load skipped:", (e as Error).message);
    return new Set();
  }
}
