/**
 * visual-safety-sweep — autonomous thumbnail-level safety worker.
 *
 * Text patterns can never catch a video like a TED talk whose title is clean
 * but whose thumbnail shows a woman, or a lecture with instruments on stage.
 * This worker closes that gap: every 5 minutes it claims a batch of
 * still-unchecked approved videos, sends their thumbnails to a vision model,
 * and writes back a verdict. Anything showing women, music/instruments, or
 * other prohibited imagery is archived immediately, and channels that keep
 * failing are auto-blocked by `escalate_visually_unsafe_channels()`.
 *
 * Auth: x-cron-token (INGEST_CRON_TOKEN) or x-cron-secret (CRON_SECRET).
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
import { aiApiKey, chatCompletionsUrl } from "../_shared/aiGateway.ts";
  classifyWithRetries,
  fallbackVerdict,
  guardedClassify,
  normalizeWorkerConfig,
  parseVerdict,
  runVisualSweep,
  unfetchableThumbnailVerdict,
  type Verdict,
  type WorkerConfig,
} from "./sweep.ts";

const MODEL = "google/gemini-3-flash-preview";

type Claimed = {
  video_id: string;
  title: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
};

const PROMPT = `You are a strict Islamic content-safety reviewer for a halal video platform.
Look at this video thumbnail and decide if it may be shown.

Reject if you see ANY of:
- a woman or girl (any age, any clothing, even fully covered, even partially visible, even a drawing/illustration)
- musical instruments, DJ gear, concert/stage-with-band imagery, singing performance
- immodest clothing, dancing, romance, film/TV/celebrity promotional imagery
- gambling, alcohol, or other clearly prohibited imagery

Respond with ONLY compact JSON, no prose:
{"state":"clean"|"female_detected"|"music"|"flagged","confidence":0-100,"flags":["short reasons"]}
Use "female_detected" when any female is visible, "music" for musical/performance imagery,
"flagged" for other prohibited imagery, "clean" only when clearly safe.
If the image is unreadable or you are unsure, answer "flagged".`;

/**
 * The provider fetches image URLs server-side, so a deleted/blocked thumbnail
 * makes it answer 400 forever. Probing the URL first turns those into a decided
 * verdict without spending a model call.
 */
async function thumbnailIsFetchable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
    await res.body?.cancel();
    if (!res.ok && res.status !== 206) return false;
    return (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    // Network hiccup on our side — let the model call decide.
    return true;
  }
}

async function classifyOnce(item: Claimed, key: string, timeoutMs: number): Promise<Verdict> {
  if (!item.thumbnail_url) return fallbackVerdict(item.video_id, "no_thumbnail");
  if (!(await thumbnailIsFetchable(item.thumbnail_url))) {
    return unfetchableThumbnailVerdict(item.video_id, "thumbnail_unreachable");
  }
  return await guardedClassify(item.video_id, async (signal) => {
    const res = await fetch(chatCompletionsUrl(), {
      method: "POST",
      signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${PROMPT}\n\nTitle: ${item.title ?? ""}\nChannel: ${item.channel_title ?? ""}` },
              { type: "image_url", image_url: { url: item.thumbnail_url } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error(`[visual-safety-sweep] gateway ${res.status}: ${detail}`);
      // 400 is terminal (bad/unfetchable image URL): retrying re-sends the same
      // dead link, so decide it now instead of looping it every cron tick.
      if (res.status === 400) {
        return unfetchableThumbnailVerdict(item.video_id, "thumbnail_unfetchable_by_model");
      }
      return fallbackVerdict(item.video_id, `gateway_${res.status}`);
    }
    const json = await res.json();
    return parseVerdict(item.video_id, json?.choices?.[0]?.message?.content ?? "");
  }, timeoutMs);
}

/**
 * One video, with safe retries: transient gateway failures and timeouts are
 * retried with exponential backoff + jitter, decided verdicts short-circuit,
 * and a missing thumbnail is never retried.
 */
async function classify(item: Claimed, key: string, cfg: WorkerConfig, deadline: number): Promise<Verdict> {
  if (!item.thumbnail_url) return fallbackVerdict(item.video_id, "no_thumbnail");
  return await classifyWithRetries((attempt) => {
    if (attempt > 0) console.log(`[visual-safety-sweep] retry ${attempt} for ${item.video_id}`);
    return classifyOnce(item, key, cfg.call_timeout_ms);
  }, {
    maxRetries: cfg.max_retries,
    backoffMs: cfg.backoff_ms,
    shouldStop: () => Date.now() > deadline,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const AI_KEY = aiApiKey();
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server misconfigured" }, 500);

  const cronSecret = req.headers.get("x-cron-secret");
  const cronToken = req.headers.get("x-cron-token");
  const authorized =
    (!!cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) ||
    (!!cronToken && cronToken === Deno.env.get("INGEST_CRON_TOKEN"));
  if (!authorized) return json({ error: "unauthorized" }, 401);

  let body: { batch?: number } = {};
  try { body = await req.json(); } catch { /* optional body */ }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Worker knobs are admin-adjustable at runtime (no redeploy) and always
  // clamped to safe bounds before use.
  const { data: cfgRow } = await admin
    .from("visual_scan_worker_config")
    .select("enabled, batch_size, concurrency, max_retries, backoff_ms, call_timeout_ms, budget_ms")
    .eq("id", "default")
    .maybeSingle();
  const cfg = normalizeWorkerConfig(cfgRow as Partial<WorkerConfig> | null);
  if (!cfg.enabled) return json({ scanned: 0, skipped: "worker_disabled" }, 200);

  const batch = body.batch !== undefined
    ? Math.max(1, Math.min(Number(body.batch), 300))
    : cfg.batch_size;
  const deadline = Date.now() + cfg.budget_ms;

  const { data: claimed, error: claimErr } = await admin.rpc("claim_visual_scan_batch", { p_limit: batch });
  if (claimErr) return json({ error: claimErr.message }, 500);
  const items = (claimed ?? []) as Claimed[];
  if (!items.length) {
    const { data: esc } = await admin.rpc("escalate_visually_unsafe_channels");
    return json({ scanned: 0, escalation: esc ?? null }, 200);
  }
  if (!AI_KEY) return json({ error: "AI gateway not configured (set AI_GATEWAY_API_KEY or LOVABLE_API_KEY)", claimed: items.length }, 500);

  // Stop claiming new waves once we approach the edge budget and apply what we
  // already have; unscanned rows keep visual_state = 'unchecked' and are
  // re-claimed by the next cron tick.
  const { verdicts, usable, truncated } = await runVisualSweep({
    items,
    classify: (it) => classify(it, AI_KEY, cfg, deadline),
    concurrency: cfg.concurrency,
    budgetMs: cfg.budget_ms,
  });

  const { data: applied, error: applyErr } = await admin.rpc("apply_visual_verdicts", { p_verdicts: usable });
  if (applyErr) return json({ error: applyErr.message, scanned: verdicts.length }, 500);

  const { data: escalation } = await admin.rpc("escalate_visually_unsafe_channels");

  return json({
    scanned: verdicts.length,
    truncated,
    applied,
    escalation: escalation ?? null,
    config: cfg,
  }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
