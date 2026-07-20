// Generic push fan-out. Sends a title/body to every device_token for a user_id.
// Requires FCM_SERVER_KEY for actual delivery; without it, records intent only.
//
// Auth: caller MUST provide a valid JWT. A user may only push to themselves;
// admins may push to any user. This prevents anonymous attackers from
// spamming/harassing arbitrary users with fake push notifications.
import { createClient } from "npm:@supabase/supabase-js@2";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";
import { canSendPush, recordPushSend } from "../_shared/pushCap.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Require a JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401);
  }
  const sb = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const callerId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Rate limit — sender identity, not target.
  const limited = await enforceRateLimit(admin, {
    identity: getClientIdentity(req, callerId),
    action: "send-push",
    limit: 20,
    windowSeconds: 60,
  });
  if (limited) return json({ error: "rate_limited" }, 429);

  try {
    const { user_id, title, body, data } = await req.json();
    if (!user_id || !title) return json({ error: "user_id and title required" }, 400);

    // Authorization: self OR admin.
    if (user_id !== callerId) {
      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: callerId,
        _role: "admin",
      });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
    }

    // Server-side push cap: max 3 push notifications per user / rolling 7d.
    // Admin-originated pushes still count — the cap protects the user, not
    // the sender. Callers should surface remaining-quota UI when relevant.
    const cap = await canSendPush(admin, user_id);
    if (!cap.ok) {
      return json({
        ok: false,
        skipped: "push_cap_exceeded",
        sent_last_7d: cap.sent,
        limit: cap.limit,
      }, 429);
    }

    const { data: tokens, error } = await admin
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", user_id);
    if (error) throw error;

    const results: unknown[] = [];
    let delivered = 0;
    if (FCM_SERVER_KEY && tokens?.length) {
      for (const t of tokens) {
        const res = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `key=${FCM_SERVER_KEY}`,
          },
          body: JSON.stringify({
            to: t.token,
            notification: { title, body: body ?? "" },
            data: data ?? {},
          }),
        });
        if (res.ok) delivered++;
        results.push({ token: t.token.slice(0, 8), status: res.status });
      }
    }

    // Record the send so it counts toward the 7-day cap.
    if (delivered > 0) {
      await recordPushSend(admin, {
        user_id,
        kind: (data && typeof data === "object" && "kind" in (data as object)
          ? String((data as Record<string, unknown>).kind)
          : "generic"),
        title,
        body: body ?? null,
        data: (data ?? {}) as Record<string, unknown>,
      });
    }

    return json({
      ok: true,
      recipients: tokens?.length ?? 0,
      delivered: delivered,
      fcm_configured: !!FCM_SERVER_KEY,
      results,
      quota: { sent_last_7d: cap.sent + (delivered > 0 ? 1 : 0), limit: cap.limit },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
