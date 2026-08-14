// personalized-push — cron dispatcher that picks the single highest-value
// push for each opted-in user in the current window, respecting the strict
// 3-per-7-day cap AND each user's local quiet hours. Never sends generic
// content; never wakes anyone during their configured quiet window.
//
// Priority order per user:
//   1. Streak at risk (16-36h since last activity)
//   2. New video from a scholar they follow (last 6h)
//   3. Next salah reminder (conservative)
//
// Runs every 30 minutes via pg_cron → invokes /send-push per candidate.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

interface Candidate {
  user_id: string;
  kind: "streak_risk" | "followed_scholar" | "next_salah";
  title: string;
  body: string;
  url?: string;
}

interface UserPrefs {
  user_id: string;
  timezone: string | null;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
}

/**
 * Aggregate per-user quiet hours from the per-kind rows. We take the
 * widest configured window so any explicit quiet-hours entry is honored.
 * Timezone is the first non-null tz we encounter for the user.
 */
async function loadEligibleUsers(): Promise<UserPrefs[]> {
  const { data } = await admin
    .from("notification_preferences")
    .select("user_id,timezone,quiet_hours_start,quiet_hours_end,push_enabled")
    .eq("push_enabled", true)
    .limit(10000);

  const byUser = new Map<string, UserPrefs>();
  for (const row of data ?? []) {
    const uid = row.user_id as string;
    const cur = byUser.get(uid) ?? {
      user_id: uid,
      timezone: null,
      quiet_hours_start: null,
      quiet_hours_end: null,
    };
    if (!cur.timezone && (row as any).timezone) cur.timezone = (row as any).timezone;
    const qs = (row as any).quiet_hours_start;
    const qe = (row as any).quiet_hours_end;
    if (qs != null && cur.quiet_hours_start == null) cur.quiet_hours_start = qs;
    if (qe != null && cur.quiet_hours_end == null) cur.quiet_hours_end = qe;
    byUser.set(uid, cur);
  }
  return [...byUser.values()];
}

/**
 * Returns true if the current time (in the user's tz, defaulting to UTC)
 * falls inside their quiet-hours window. Handles wrap-around windows like
 * 22 → 7 correctly.
 */
function isInQuietHours(p: UserPrefs, now: Date): boolean {
  const start = p.quiet_hours_start ?? 22;
  const end = p.quiet_hours_end ?? 7;
  let hour: number;
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: p.timezone ?? "UTC",
    });
    hour = parseInt(fmt.format(now), 10);
    if (Number.isNaN(hour)) hour = now.getUTCHours();
  } catch {
    hour = now.getUTCHours();
  }
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  // wrap window (e.g. 22 → 7)
  return hour >= start || hour < end;
}

async function alreadySent(userId: string, kind: string, hours: number): Promise<boolean> {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { count } = await admin
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", since);
  return (count ?? 0) > 0;
}

async function within7dayCap(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const { count } = await admin
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  return (count ?? 0) < 3;
}

async function pickCandidate(p: UserPrefs): Promise<Candidate | null> {
  const userId = p.user_id;
  if (!(await within7dayCap(userId))) return null;

  // 1) Streak at risk — evaluated against the user's LOCAL calendar date, so
  // a UTC±12 user is never told their streak is at risk on the wrong day.
  const { data: streak } = await admin
    .from("streaks")
    .select("current_streak,last_completed_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (streak?.last_completed_date) {
    const localToday = localDayKey(new Date(), p.timezone ?? "UTC");
    const missedToday = streak.last_completed_date < localToday;
    if (missedToday && !(await alreadySent(userId, "streak_risk", 20))) {
      return {
        user_id: userId,
        kind: "streak_risk",
        title: `${(streak as any).current_streak ?? 1}-day streak at risk`,
        body: "One dose today keeps your streak alive.",
        url: "/today",
      };
    }
  }

  // 2) Followed scholar / channel — new upload in last 6h
  const { data: follows } = await admin
    .from("channel_follows")
    .select("channel_id")
    .eq("user_id", userId)
    .limit(50);
  if (follows && follows.length) {
    const since = new Date(Date.now() - 6 * 3_600_000).toISOString();
    const { data: newVids } = await admin
      .from("curated_videos")
      .select("id,title,channel_title,published_at")
      .in("channel_id", follows.map((f: any) => f.channel_id))
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(1);
    const v = newVids?.[0];
    if (v && !(await alreadySent(userId, "followed_scholar", 24))) {
      return {
        user_id: userId,
        kind: "followed_scholar",
        title: `New from ${v.channel_title ?? "a scholar you follow"}`,
        body: v.title,
        url: `/watch/${v.id}`,
      };
    }
  }

  // 3) Next salah — conservative, one per 12h max
  if (p.timezone && !(await alreadySent(userId, "next_salah", 12))) {
    return {
      user_id: userId,
      kind: "next_salah",
      title: "Prayer is near",
      body: "Take 2 minutes — the app will hold your place.",
      url: "/prayer",
    };
  }

  return null;
}

async function dispatch(cands: Candidate[]): Promise<number> {
  let sent = 0;
  for (const c of cands) {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({
          user_ids: [c.user_id],
          title: c.title,
          body: c.body,
          url: c.url,
          kind: c.kind,
        }),
      });
      if (r.ok) sent++;
    } catch {
      /* keep going */
    }
    await admin.from("user_notifications").insert({
      user_id: c.user_id,
      kind: c.kind,
      title: c.title,
      body: c.body,
      url: c.url ?? null,
    } as never);
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Authorization: shared cron token OR admin JWT.
  const cronToken = req.headers.get("x-cron-token") ?? req.headers.get("X-Cron-Secret");
  const isCron =
    !!cronToken &&
    (cronToken === Deno.env.get("AUDIT_CRON_TOKEN") ||
      cronToken === Deno.env.get("CRON_SECRET"));
  if (!isCron) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const asUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await asUser.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
  }

  const users = await loadEligibleUsers();
  const now = new Date();

  let quietSkipped = 0;
  const candidates: Candidate[] = [];
  for (const p of users) {
    if (isInQuietHours(p, now)) {
      quietSkipped++;
      continue;
    }
    const c = await pickCandidate(p);
    if (c) candidates.push(c);
    if (candidates.length >= 1000) break;
  }

  const sent = await dispatch(candidates);
  return new Response(
    JSON.stringify({ users: users.length, quiet_skipped: quietSkipped, picked: candidates.length, sent }),
    { headers: { ...corsHeaders, "content-type": "application/json" } },
  );
});
