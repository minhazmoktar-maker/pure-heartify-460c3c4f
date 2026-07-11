/**
 * submit-report — user-facing endpoint for reporting a video or channel.
 *
 * Guarantees:
 *  - Requires an authenticated session (JWT verified in-code).
 *  - Rate-limits to 5 reports / minute and 20 / hour per user (DB-backed).
 *  - Validates payload with Zod, caps details length.
 *  - Never auto-removes content — inserts a pending report for moderators.
 *  - Records ingest metadata (UA, platform) for downstream triage.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

const BodySchema = z.object({
  video_id: z.string().min(1).max(64).optional(),
  channel_id: z.string().min(1).max(128).optional(),
  video_title: z.string().max(300).optional(),
  channel_title: z.string().max(200).optional(),
  reason: z.enum([
    "inappropriate_content","misinformation","copyright","spam","hate_speech",
    "sexual_content","violence","music_or_haram","wrong_metadata","broken_video","other",
  ]),
  details: z.string().max(2000).optional(),
  severity: z.enum(["low","normal","high","critical"]).optional(),
  notify_reporter: z.boolean().optional(),
  platform: z.string().max(60).optional(),
  captcha_token: z.string().max(4000).optional(),
}).refine(
  (v) => !!(v.video_id || v.channel_id),
  { message: "video_id or channel_id required" },
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return json({ error: "server misconfigured" }, 500);
  }

  // Verify JWT — the caller must be signed in.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);

  const anon = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userRes, error: userErr } = await anon.auth.getUser();
  if (userErr || !userRes.user) return json({ error: "unauthorized" }, 401);
  const userId = userRes.user.id;

  // Parse + validate body.
  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "validation_failed", issues: parsed.error.flatten().fieldErrors }, 400);
  }
  const body = parsed.data;

  // CAPTCHA (fail-open if TURNSTILE_SECRET_KEY not set).
  const captcha = await verifyTurnstile(body.captcha_token ?? null, req);
  if (!captcha.ok) {
    return json({ error: "captcha_failed", reason: captcha.reason }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);


  // Rate limit: 5 per minute, 20 per hour.
  const minLimit = await enforceRateLimit(admin, {
    identity: userId, action: "submit_report_min", limit: 5, windowSeconds: 60,
  });
  if (minLimit) return json({ error: "rate_limited", scope: "per_minute" }, 429);
  const hourLimit = await enforceRateLimit(admin, {
    identity: userId, action: "submit_report_hour", limit: 20, windowSeconds: 3600,
  });
  if (hourLimit) return json({ error: "rate_limited", scope: "per_hour" }, 429);

  // Duplicate suppression: same user + video/channel + reason in last 24h => noop success.
  const dupQuery = admin.from("video_reports")
    .select("id")
    .eq("user_id", userId)
    .eq("reason", body.reason)
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .limit(1);
  if (body.video_id) dupQuery.eq("video_id", body.video_id);
  if (body.channel_id) dupQuery.eq("channel_id", body.channel_id);
  const { data: dup } = await dupQuery;
  if (dup && dup.length > 0) {
    return json({ ok: true, duplicate: true, id: dup[0].id });
  }

  const { data: inserted, error: insErr } = await admin
    .from("video_reports")
    .insert({
      user_id: userId,
      video_id: body.video_id ?? null,
      channel_id: body.channel_id ?? null,
      video_title: body.video_title ?? null,
      channel_title: body.channel_title ?? null,
      reason: body.reason,
      details: body.details ?? null,
      severity: body.severity ?? "normal",
      notify_reporter: body.notify_reporter ?? true,
      user_agent: req.headers.get("user-agent") ?? null,
      platform: body.platform ?? "web",
      status: "open",
    })
    .select("id")
    .single();

  if (insErr) return json({ error: "insert_failed", message: insErr.message }, 500);
  return json({ ok: true, id: inserted.id });
});
