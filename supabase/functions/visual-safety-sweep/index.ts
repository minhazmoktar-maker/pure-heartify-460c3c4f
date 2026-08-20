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

const MODEL = "google/gemini-3-flash-preview";
const CONCURRENCY = 8;

type Claimed = {
  video_id: string;
  title: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
};

type Verdict = {
  video_id: string;
  state: "clean" | "female_detected" | "music" | "flagged" | "unchecked";
  confidence: number;
  flags: string[];
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

// Each classification gets its own hard timeout: without it a single hung
// gateway request keeps the whole invocation alive until the edge runtime
// kills it, which is what surfaced as 504s on the 5-minute cron.
const CALL_TIMEOUT_MS = 20_000;

async function classify(item: Claimed, key: string): Promise<Verdict> {
  const fallback: Verdict = { video_id: item.video_id, state: "unchecked", confidence: 0, flags: ["model_error"] };
  if (!item.thumbnail_url) return fallback;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
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
      console.error(`[visual-safety-sweep] gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return fallback;
    }
    const json = await res.json();

    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]) as { state?: string; confidence?: number; flags?: unknown };
    const state = ["clean", "female_detected", "music", "flagged"].includes(String(parsed.state))
      ? (parsed.state as Verdict["state"])
      : "flagged";
    return {
      video_id: item.video_id,
      state,
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence ?? 0))),
      flags: Array.isArray(parsed.flags) ? parsed.flags.map(String).slice(0, 6) : [],
    };
  } catch {
    return fallback;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const AI_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server misconfigured" }, 500);

  const cronSecret = req.headers.get("x-cron-secret");
  const cronToken = req.headers.get("x-cron-token");
  const authorized =
    (!!cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) ||
    (!!cronToken && cronToken === Deno.env.get("INGEST_CRON_TOKEN"));
  if (!authorized) return json({ error: "unauthorized" }, 401);

  let body: { batch?: number } = {};
  try { body = await req.json(); } catch { /* optional body */ }
  const batch = Math.max(1, Math.min(Number(body.batch ?? 40), 100));

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: claimed, error: claimErr } = await admin.rpc("claim_visual_scan_batch", { p_limit: batch });
  if (claimErr) return json({ error: claimErr.message }, 500);
  const items = (claimed ?? []) as Claimed[];
  if (!items.length) {
    const { data: esc } = await admin.rpc("escalate_visually_unsafe_channels");
    return json({ scanned: 0, escalation: esc ?? null }, 200);
  }
  if (!AI_KEY) return json({ error: "LOVABLE_API_KEY not configured", claimed: items.length }, 500);

  const verdicts: Verdict[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const slice = items.slice(i, i + CONCURRENCY);
    verdicts.push(...(await Promise.all(slice.map((it) => classify(it, AI_KEY)))));
  }

  const usable = verdicts.filter((v) => v.state !== "unchecked");
  const { data: applied, error: applyErr } = await admin.rpc("apply_visual_verdicts", { p_verdicts: usable });
  if (applyErr) return json({ error: applyErr.message, scanned: verdicts.length }, 500);

  const { data: escalation } = await admin.rpc("escalate_visually_unsafe_channels");

  return json({ scanned: verdicts.length, applied, escalation: escalation ?? null }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
