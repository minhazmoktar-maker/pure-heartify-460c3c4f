// Watch/Widget companion endpoint.
//
// One tiny, cacheable payload sized for watchOS complications, Smart Stack
// widgets and Android/Wear tiles. Callers on constrained radios should hit
// this instead of fanning out to /prayer-times + /user-sync-pull + feed.
//
// Auth is OPTIONAL and verified in code (verify_jwt = false):
//   - anonymous + lat/lng  -> prayer block only (no account data, ever)
//   - bearer token         -> prayer block + streak/dhikr/salah glance
//
// Contract is mirrored in Swift (HeartifyKit) — see docs/WATCHOS_ROADMAP.md.
// Keep the response shape additive-only; watch apps ship slowly.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";

const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
type PrayerName = (typeof PRAYER_ORDER)[number];

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  method: z
    .enum(["MWL", "ISNA", "Egypt", "Makkah", "Karachi", "Tehran", "Jafari"])
    .default("MWL"),
  tz_offset: z.coerce.number().min(-840).max(840).optional(),
});

function json(body: unknown, status = 200, cache = "private, no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": cache },
  });
}

/** Minutes-since-midnight for an "HH:MM" string. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Resolves the next prayer from a times map, in the caller's local clock.
 * Wraps to tomorrow's Fajr after Isha so complications never show a blank.
 */
function resolveNextPrayer(
  times: Record<string, string>,
  localMinutes: number,
): { name: PrayerName; at: string; in_minutes: number; is_tomorrow: boolean } | null {
  const known = PRAYER_ORDER.filter((p) => typeof times[p] === "string");
  if (known.length === 0) return null;

  for (const name of known) {
    const at = times[name];
    const mins = toMinutes(at);
    if (mins > localMinutes) {
      return { name, at, in_minutes: mins - localMinutes, is_tomorrow: false };
    }
  }
  const first = known[0];
  const at = times[first];
  return {
    name: first,
    at,
    in_minutes: 24 * 60 - localMinutes + toMinutes(at),
    is_tomorrow: true,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "method not allowed" }, 405);

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return json({ error: "invalid query" }, 400);
  const { lat, lng, method, tz_offset } = parsed.data;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Cheap DoS defence. Watch complications refresh every ~15 min, so 120/min
  // per identity is generous while still bounding invocation spend.
  if (serviceKey) {
    const admin = createClient(supabaseUrl, serviceKey);
    const limited = await enforceRateLimit(admin, {
      identity: getClientIdentity(req, null),
      action: "watch-companion",
      limit: 120,
      windowSeconds: 60,
    });
    if (limited) return json({ error: "rate_limited" }, 429);
  }

  // ---- prayer block (anonymous-safe) -------------------------------------
  let prayer: Record<string, unknown> | null = null;
  if (typeof lat === "number" && typeof lng === "number") {
    try {
      const qs = new URLSearchParams({ lat: String(lat), lng: String(lng), method });
      const res = await fetch(`${supabaseUrl}/functions/v1/prayer-times?${qs}`, {
        headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
      });
      if (res.ok) {
        const body = await res.json();
        // /prayer-times returns UTC clock strings, so the countdown is computed
        // in UTC too. tz_offset is echoed back for display formatting only.
        const times = (body?.times_utc ?? {}) as Record<string, string>;
        const now = new Date();
        const nowUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
        prayer = {
          method,
          date: body?.date ?? null,
          times_utc: times,
          tz_offset: typeof tz_offset === "number" ? tz_offset : null,
          next: resolveNextPrayer(times, nowUtcMinutes),
        };
      }
    } catch {
      prayer = null; // never fail the whole payload on a prayer upstream hiccup
    }
  }

  // ---- account block (requires a valid bearer token) ----------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  let account: Record<string, unknown> | null = null;

  if (authHeader) {
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await client.auth.getUser();
    const userId = userData.user?.id;
    if (userId) {
      const today = new Date().toISOString().slice(0, 10);
      const [streaks, dhikr, salah] = await Promise.all([
        client.from("streaks").select("current_streak,longest_streak,last_completed_date").eq("user_id", userId).maybeSingle(),
        client.from("dhikr_sessions").select("count,target,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1),
        client.from("salah_log").select("prayer").eq("user_id", userId).eq("prayer_date", today),
      ]);

      const loggedToday = (salah.data ?? []).map((row: { prayer: string }) => row.prayer);

      account = {
        streak: {
          current: streaks.data?.current_streak ?? 0,
          longest: streaks.data?.longest_streak ?? 0,
          last_completed_date: streaks.data?.last_completed_date ?? null,
        },
        dhikr: dhikr.data?.[0]
          ? { count: dhikr.data[0].count ?? 0, target: dhikr.data[0].target ?? null }
          : null,
        salah_today: {
          logged: loggedToday,
          remaining: PRAYER_ORDER.filter((p) => !loggedToday.includes(p)),
        },
      };
    }
  }

  return json({
    schema: 1,
    server_time: new Date().toISOString(),
    authenticated: account !== null,
    prayer,
    account,
  });
});
