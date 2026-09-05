/**
 * Embeddability sweep.
 *
 * Videos whose owner disabled off-site playback render as
 * "Playback on other websites has been disabled by the video owner" inside
 * Heartify's player. This worker walks the approved corpus in batches, asks
 * YouTube `videos.list?part=status` (1 quota unit per 50 ids) and hides every
 * video that is not embeddable, not public, or has been removed.
 *
 * Designed for pg_cron. Cursor-free: it always picks the oldest
 * `embed_checked_at` rows, so repeated runs eventually cover everything and
 * then keep re-verifying the corpus.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { isQuotaError, parseIsoDuration, runEmbedSweep, type StatusResult } from "./sweep.ts";

const YOUTUBE_API_KEYS: string[] = [
  Deno.env.get("YOUTUBE_API_KEY"),
  Deno.env.get("YOUTUBE_API_KEY_2"),
  Deno.env.get("YOUTUBE_API_KEY_3"),
  Deno.env.get("YOUTUBE_API_KEY_4"),
  Deno.env.get("YOUTUBE_API_KEY_5"),
  Deno.env.get("YOUTUBE_API_KEY_6"),
  // Generic Google Cloud key (separate project => its own Search-quota budget).
  Deno.env.get("GOOGLE_API_KEY"),
].filter((k): k is string => !!k);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-cron-token",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sbFetch = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": SUPABASE_SERVICE_ROLE_KEY!,
      ...(init.headers ?? {}),
    },
  });

async function ytStatus(ids: string[]): Promise<StatusResult> {
  let sawQuotaError = false;
  for (const key of YOUTUBE_API_KEYS) {
    // `status` + `contentDetails` cost the same 1 quota unit per 50 ids as
    // `status` alone, so real durations come along for free.
    const url =
      `https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails&id=${
        ids.join(",")
      }&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      // Quota errors are not transient: every remaining call in this run — and
      // every run until quota resets — fails the same way. Log once per key and
      // let the caller stop instead of emitting hundreds of identical errors.
      if (isQuotaError(res.status, body)) {
        sawQuotaError = true;
        console.warn("[sweep-embeddable] youtube quota exhausted for one key — skipping");
        continue;
      }
      console.error(`[sweep-embeddable] youtube ${res.status}: ${body}`);
      continue;
    }
    const data = await res.json() as {
      items?: Array<{
        id: string;
        status?: Record<string, unknown>;
        contentDetails?: { duration?: string };
      }>;
    };
    const map = new Map<string, boolean>();
    const durations = new Map<string, number>();
    // Missing ids = deleted/private videos → not playable.
    for (const id of ids) map.set(id, false);
    for (const it of data.items ?? []) {
      const ok = it.status?.embeddable !== false &&
        it.status?.privacyStatus === "public" &&
        it.status?.uploadStatus !== "rejected";
      map.set(it.id, ok);
      const secs = parseIsoDuration(it.contentDetails?.duration);
      if (secs !== null) durations.set(it.id, secs);
    }
    return { map, durations };
  }
  return { map: null, quotaExhausted: sawQuotaError };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!YOUTUBE_API_KEYS.length || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "missing_configuration" }, 500);
  }

  // Auth: internal cron secret/token OR verified admin JWT (same gate as the
  // other pipeline workers). Never let anonymous callers burn YouTube quota.
  const cronSecret = req.headers.get("x-cron-secret");
  const cronToken = req.headers.get("x-cron-token");
  const isCron =
    (!!cronSecret && cronSecret === (Deno.env.get("CRON_SECRET") ?? "\u0000")) ||
    (!!cronToken && (cronToken === (Deno.env.get("INGEST_CRON_TOKEN") ?? "\u0000") ||
      cronToken === (Deno.env.get("AUDIT_CRON_TOKEN") ?? "\u0000")));

  if (!isCron) {
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!jwt) return json({ error: "unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userRes } = await admin.auth.getUser(jwt);
    const uid = userRes?.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);
  }

  const url = new URL(req.url);
  const batches = Math.min(Number(url.searchParams.get("batches") ?? 40) || 40, 200);

  const result = await runEmbedSweep({
    batches,
    fetchBatch: async () => {
      const servable =
        "&embeddable=eq.true&is_archived=eq.false&is_hidden=eq.false&limit=50";
      // Priority 1: rows that have never had their real duration verified —
      // the Daily Dose falls back to an assumed length for those, so drain them
      // first. Priority 2: the normal oldest-embed-check rotation.
      for (
        const query of [
          `curated_videos?select=video_id&duration_checked_at=is.null${servable}`,
          `curated_videos?select=video_id${servable}&order=embed_checked_at.asc.nullsfirst`,
        ]
      ) {
        const res = await sbFetch(query);
        if (!res.ok) {
          console.error(`[sweep-embeddable] fetch failed ${res.status}`);
          return null;
        }
        const rows = await res.json() as Array<{ video_id: string }>;
        if (rows.length) return rows.map((r) => r.video_id);
      }
      return [];
    },
    ytStatus,
    // Row locks are always taken in the same (sorted) id order so parallel
    // sweep runs queue behind each other instead of deadlocking.
    markGood: async (ids) => {
      const ordered = [...ids].sort();
      await sbFetch(`curated_videos?video_id=in.(${ordered.join(",")})`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ embed_checked_at: new Date().toISOString() }),
      });
    },
    markBad: async (ids) => {
      const ordered = [...ids].sort();
      const r = await sbFetch(`curated_videos?video_id=in.(${ordered.join(",")})`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          embeddable: false,
          is_hidden: true,
          embed_checked_at: new Date().toISOString(),
        }),
      });
      if (!r.ok) console.error(`[sweep-embeddable] hide failed ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return r.ok;
    },
    // One RPC per 50-id batch instead of 50 PATCHes; always stamps
    // duration_checked_at so live streams don't loop in the priority queue.
    writeDurations: async (rows) => {
      const ordered = [...rows].sort((a, b) => a.video_id < b.video_id ? -1 : a.video_id > b.video_id ? 1 : 0);
      const r = await sbFetch("rpc/apply_video_durations", {
        method: "POST",
        body: JSON.stringify({ _payload: ordered }),
      });
      if (!r.ok) {
        console.error(
          `[sweep-embeddable] duration write failed ${r.status}: ${(await r.text()).slice(0, 200)}`,
        );
        return 0;
      }
      return ordered.filter((x) => x.duration_seconds !== null).length;
    },

  });

  const { checked, hidden, durationsWritten, quotaExhausted, deferred, stopReason } = result;

  console.log(
    `[sweep-embeddable] checked=${checked} hidden=${hidden} durations=${durationsWritten} ` +
      `deferred=${deferred.length} stop=${stopReason} quota_exhausted=${quotaExhausted}`,
  );
  return json({
    ok: true,
    checked,
    hidden,
    durations_written: durationsWritten,
    deferred: deferred.length,
    stop_reason: stopReason,
    quota_exhausted: quotaExhausted,
  });

});

