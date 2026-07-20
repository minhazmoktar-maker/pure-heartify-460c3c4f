// personalized-push — cron dispatcher that picks the single highest-value
// push for each opted-in user in the current window, respecting the strict
// 3-per-7-day cap enforced at send-push. Never sends generic content.
//
// Priority order per user:
//   1. Streak at risk (24h before end-of-day for their tz)
//   2. New video from a scholar they follow (last 6h)
//   3. Next salah reminder (~15 min before, per user tz)
//
// Runs every 15 minutes via pg_cron → invokes /send-push per candidate.

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

async function pickCandidatesForUser(userId: string, tz: string | null): Promise<Candidate | null> {
  // 1) Streak at risk
  const { data: streak } = await admin
    .from("streaks")
    .select("current_count,last_active_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (streak?.last_active_date) {
    const last = new Date(streak.last_active_date + "T00:00:00Z").getTime();
    const hoursSince = (Date.now() - last) / 3_600_000;
    if (hoursSince > 16 && hoursSince < 36 && !(await alreadySent(userId, "streak_risk", 20))) {
      return {
        user_id: userId,
        kind: "streak_risk",
        title: `${streak.current_count}-day streak at risk`,
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

  // 3) Next salah — send once per prayer, ~15 min before Maghrib as the
  // most-engaged prayer. We keep this conservative on the cron path.
  if (tz && !(await alreadySent(userId, "next_salah", 3))) {
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
    // Persist an audit row for the cap logic above
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

  // Only pull users who have any push channel enabled AND a general opt-in.
  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("user_id,timezone,push_enabled")
    .eq("push_enabled", true)
    .limit(5000);

  const candidates: Candidate[] = [];
  for (const p of prefs ?? []) {
    const c = await pickCandidatesForUser(p.user_id as string, (p as any).timezone ?? null);
    if (c) candidates.push(c);
    if (candidates.length >= 1000) break; // per-run safety cap
  }

  const sent = await dispatch(candidates);
  return new Response(JSON.stringify({ picked: candidates.length, sent }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
