// notification-fanout — turns freshly-created in-app notifications into REAL
// background push notifications on desktop browsers, Android and iOS.
//
// Why this exists: `public.user_notifications` rows (connection requests,
// challenge invites, badges…) were only visible if the user happened to open
// the app. This worker delivers them while the app is closed:
//   • Web Push (VAPID) → Chrome/Edge/Firefox on desktop + Android, and iOS
//     16.4+ when the PWA is installed to the home screen.
//   • FCM legacy send → Capacitor Android/iOS builds (requires FCM_SERVER_KEY).
//
// Marks each row `pushed_at` so a push is sent exactly once. Runs every minute
// via pg_cron; protected by CRON_SECRET.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@heartifyapp.com";
import { fcmConfigured, sendFcm, dropStaleToken } from "../_shared/fcm.ts";

/** Deep-link map — kept in sync with src/lib/notificationRoutes.ts. */
function targetFor(kind: string, data: Record<string, unknown>): string {
  const explicit = (data.cta_url as string) || (data.url as string) || "";
  if (explicit) return explicit;
  switch (kind) {
    case "connection_request": return "/connections?tab=requests";
    case "connection_accepted":
    case "connection_declined":
    case "nudge": return "/connections?tab=circle";
    case "challenge_invite":
    case "challenge_started":
    case "challenge_completed": return "/connections?tab=challenges";
    case "badge_earned":
    case "achievement": return "/achievements";
    case "streak_risk":
    case "streak_milestone": return "/profile?tab=streak";
    case "khatm_invite":
    case "khatm_progress": return "/khatm";
    case "referral_reward": return "/profile?tab=referrals";
    case "weekly_recap": return "/recap";
    case "followed_scholar": return "/channels";
    case "next_salah": return "/prayer";
    case "creator_upload_reviewed": return "/studio";
    case "report_resolved": return data.video_id ? `/watch/${String(data.video_id)}` : "/profile";
    default: return "/";
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Cron/admin only.
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  // Fail closed: an unset CRON_SECRET must never allow anonymous fan-out.
  if (!CRON_SECRET || secret !== CRON_SECRET) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const vapidReady = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
  if (vapidReady) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  }

  const since = new Date(Date.now() - 6 * 3_600_000).toISOString();
  const { data: rows, error } = await admin
    .from("user_notifications")
    .select("id,user_id,kind,title,body,data,created_at")
    .is("pushed_at", null)
    .is("read_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return json({ error: error.message }, 500);

  let webSent = 0;
  let nativeSent = 0;
  let skipped = 0;
  const pushedIds: string[] = [];

  // Cache push opt-outs per (user, kind) so a burst of rows costs one query.
  const optOut = new Map<string, boolean>();
  async function pushDisabled(userId: string, kind: string): Promise<boolean> {
    const prefKind = /^(connection_|challenge_)/.test(kind) || kind === "nudge" ? "social" : kind;
    const key = `${userId}:${prefKind}`;
    if (optOut.has(key)) return optOut.get(key)!;
    const { data } = await admin
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", userId)
      .eq("kind", prefKind)
      .maybeSingle();
    // Default ON for transactional social events, so a connection request is
    // never silently dropped for users who never opened notification settings.
    const disabled = data ? data.push_enabled === false : false;
    optOut.set(key, disabled);
    return disabled;
  }

  for (const row of rows ?? []) {
    const data = (row.data ?? {}) as Record<string, unknown>;
    const url = targetFor(row.kind, data);
    if (await pushDisabled(row.user_id, row.kind)) {
      pushedIds.push(row.id);
      skipped++;
      continue;
    }

    const payload = JSON.stringify({
      title: row.title,
      body: row.body ?? "",
      url,
      tag: `${row.kind}:${row.id}`,
      kind: row.kind,
    });

    // --- Web Push (desktop + Android + installed iOS PWA) -----------------
    if (vapidReady) {
      const { data: subs } = await admin
        .from("web_push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .eq("user_id", row.user_id);
      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          webSent++;
        } catch (e: any) {
          const status = e?.statusCode ?? 0;
          // 404/410 = subscription is gone; prune so we stop retrying it.
          if (status === 404 || status === 410) {
            await admin.from("web_push_subscriptions").delete().eq("id", s.id);
          } else {
            console.warn("web push failed", status, String(e?.body ?? e));
          }
        }
      }
    }

    // --- Native (Capacitor Android/iOS) via FCM HTTP v1 -------------------
    if (fcmConfigured()) {
      const { data: tokens } = await admin
        .from("device_tokens")
        .select("token")
        .eq("user_id", row.user_id);
      for (const t of tokens ?? []) {
        const res = await sendFcm({
          token: t.token,
          title: row.title,
          body: row.body ?? "",
          data: { url, kind: row.kind, ...data },
        });
        if (res.ok) nativeSent++;
        else if (res.stale) await dropStaleToken(admin, t.token);
      }
    }


    pushedIds.push(row.id);
  }

  if (pushedIds.length) {
    const now = new Date().toISOString();
    for (let i = 0; i < pushedIds.length; i += 100) {
      await admin
        .from("user_notifications")
        .update({ pushed_at: now })
        .in("id", pushedIds.slice(i, i + 100));
    }
  }

  return json({
    ok: true,
    considered: rows?.length ?? 0,
    web_sent: webSent,
    native_sent: nativeSent,
    skipped_opt_out: skipped,
    vapid_configured: vapidReady,
    fcm_configured: fcmConfigured(),
  });
});
