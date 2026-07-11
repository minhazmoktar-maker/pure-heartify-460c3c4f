/**
 * notify-streak-risk: retention push.
 * Sends a "keep your streak alive" push to users whose current_streak >= 1
 * and who haven't completed today's dose yet. Deduped per-user per UTC day
 * via user_notifications (kind='streak_risk'). Safe to invoke hourly via
 * pg_cron; only sends when UTC hour >= 20 (covers most timezones' evening).
 *
 * Falls back to in-app notification when FCM_SERVER_KEY isn't configured, so
 * the retention nudge still surfaces via the NotificationsBell.
 */
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.103.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronToken = Deno.env.get("AUDIT_CRON_TOKEN");
  const cronHeader = req.headers.get("x-cron-token") ?? "";
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  let allowed = !!cronToken && cronHeader === cronToken;
  if (!allowed) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
      const sb = createClient(SUPABASE_URL, anon, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await sb.auth.getUser();
      if (userData?.user) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: userData.user.id,
          _role: "admin",
        });
        allowed = !!isAdmin;
      }
    }
  }
  if (!allowed) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const utcHour = now.getUTCHours();
  // Only nudge in the global "evening" band (20:00-03:00 UTC covers EU/ME/Asia evenings).
  const inWindow = utcHour >= 20 || utcHour < 3;
  const force = new URL(req.url).searchParams.get("force") === "1";
  if (!inWindow && !force) {
    return new Response(JSON.stringify({ skipped: "outside_window", utcHour }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isoToday = now.toISOString().slice(0, 10);

  const { data: atRisk } = await supabase
    .from("streaks")
    .select("user_id, current_streak, last_completed_date")
    .gte("current_streak", 1)
    .or(`last_completed_date.is.null,last_completed_date.lt.${isoToday}`)
    .limit(5000);

  if (!atRisk?.length) {
    return new Response(JSON.stringify({ candidates: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userIds = atRisk.map((r) => r.user_id);

  // Dedupe: skip users already nudged today.
  const dayStart = `${isoToday}T00:00:00Z`;
  const { data: already } = await supabase
    .from("user_notifications")
    .select("user_id")
    .eq("kind", "streak_risk")
    .gte("created_at", dayStart)
    .in("user_id", userIds);
  const alreadySet = new Set((already ?? []).map((n) => n.user_id));

  let sent = 0;
  let inAppOnly = 0;
  let skipped = alreadySet.size;

  for (const row of atRisk) {
    if (alreadySet.has(row.user_id)) continue;

    const title = "Keep your streak alive 🔥";
    const body = `You're on a ${row.current_streak}-day streak. Tap to finish today's dose in under 2 minutes.`;
    const ctaLabel = "Complete today's dose";
    const ctaUrl = "/?focus=daily-dose";

    // In-app notification (always).
    await supabase.from("user_notifications").insert({
      user_id: row.user_id,
      kind: "streak_risk",
      title,
      body,
      data: {
        current_streak: row.current_streak,
        cta_label: ctaLabel,
        cta_url: ctaUrl,
        url: ctaUrl,
      },
    });

    // Push (if we have tokens + FCM configured).
    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", row.user_id);

    if (!tokens?.length || !FCM_SERVER_KEY) {
      inAppOnly++;
      continue;
    }

    for (const t of tokens) {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${FCM_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: t.token,
          notification: {
            title,
            body,
            click_action: ctaUrl,
          },
          data: {
            kind: "streak_risk",
            current_streak: String(row.current_streak),
            cta_label: ctaLabel,
            cta_url: ctaUrl,
            url: ctaUrl,
          },
          webpush: {
            fcm_options: { link: ctaUrl },
            notification: {
              actions: [{ action: "open_dose", title: ctaLabel }],
            },
          },
        }),
      });
      if (res.ok) sent++;
    }

  }

  return new Response(
    JSON.stringify({
      candidates: atRisk.length,
      sent,
      in_app_only: inAppOnly,
      skipped_deduped: skipped,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
