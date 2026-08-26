/**
 * moderate-backlog — cron-driven drainer for the `pending_review` video queue.
 *
 * Why this exists: ingestion parks every new video in `pending_review`, but
 * nothing ran the multi-stage pipeline over that queue in bulk, so ~151k
 * videos sat unchecked (and therefore unservable) for months. This worker
 * claims a batch, runs the SAME shared pipeline used by `moderate-video`
 * (rule -> reputation -> metadata -> AI), and persists an immutable decision
 * so the DB trigger moves the row out of `pending_review`.
 *
 * Halal floor is unchanged: only `auto_approved` rows become servable, and
 * they still have to clear the visual-safety sweep (`visual_state = 'clean'`)
 * before any surface can return them.
 *
 * Auth: cron token only (x-cron-token). No user-facing surface.
 * Body: { batch?: number (1-200), concurrency?: number (1-8) }
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  defaultPipeline,
  loadThresholds,
  persistDecision,
  runPipeline,
  type VideoContext,
} from "../_shared/moderation/index.ts";

const TIME_BUDGET_MS = 100_000;

type Row = {
  video_id: string;
  title: string;
  description: string | null;
  channel_id: string | null;
  channel_title: string | null;
  category: string | null;
  tags: string[] | null;
  language: string | null;
  duration_seconds: number | null;
  published_at: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server misconfigured" }, 500);

  const cronSecret = req.headers.get("x-cron-secret");
  const cronToken = req.headers.get("x-cron-token");
  const authorized =
    (!!cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) ||
    (!!cronToken && cronToken === Deno.env.get("INGEST_CRON_TOKEN")) ||
    (!!cronToken && cronToken === Deno.env.get("AUDIT_CRON_TOKEN"));
  if (!authorized) {
    console.log(
      `moderate-backlog: unauthorized (token_present=${!!cronToken}, secret_present=${!!cronSecret})`,
    );
    return json({ error: "unauthorized" }, 401);
  }
  console.log("moderate-backlog: authorized run starting");



  let body: { batch?: number; concurrency?: number } = {};
  try { body = await req.json(); } catch { /* defaults */ }
  const batch = Math.min(200, Math.max(1, Number(body.batch ?? 40)));
  const concurrency = Math.min(8, Math.max(1, Number(body.concurrency ?? 4)));

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const startedAt = Date.now();

  // Atomic claim: stamps the rows so parallel workers never pick the same
  // video, and a crashed worker's rows become claimable again after the
  // RPC's stale window.
  const { data: claimed, error: claimErr } = await admin.rpc("claim_moderation_backlog", {
    p_limit: batch,
  });
  if (claimErr) return json({ error: `claim failed: ${claimErr.message}` }, 500);

  const rows = (claimed ?? []) as Row[];
  if (rows.length === 0) return json({ claimed: 0, decided: 0, drained: true });

  const thresholds = await loadThresholds(SUPABASE_URL, SERVICE_KEY);
  const stages = defaultPipeline(SUPABASE_URL, SERVICE_KEY);

  const counts: Record<string, number> = {};
  let decided = 0;
  let failed = 0;
  let queue = 0;

  async function worker() {
    for (;;) {
      const i = queue++;
      if (i >= rows.length) return;
      if (Date.now() - startedAt > TIME_BUDGET_MS) return;
      const r = rows[i];
      const ctx: VideoContext = {
        video_id: r.video_id,
        title: r.title,
        description: r.description,
        channel_id: r.channel_id,
        channel_title: r.channel_title,
        category: r.category,
        tags: r.tags ?? [],
        language: r.language,
        duration_seconds: r.duration_seconds,
        published_at: r.published_at,
      };
      try {
        const outcome = await runPipeline(ctx, stages, thresholds);
        const res = await persistDecision(
          SUPABASE_URL!,
          SERVICE_KEY!,
          outcome,
          { id: null, kind: "system" },
          "pending_review",
        );
        if ("error" in res) { failed++; continue; }
        counts[outcome.final_state] = (counts[outcome.final_state] ?? 0) + 1;
        decided++;
      } catch {
        failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  const remaining = await admin
    .from("curated_videos")
    .select("video_id", { count: "exact", head: true })
    .eq("moderation_state", "pending_review");

  return json({
    claimed: rows.length,
    decided,
    failed,
    by_state: counts,
    pending_remaining: remaining.count ?? null,
    elapsed_ms: Date.now() - startedAt,
  });
});
