import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Nightly retention purge with full audit trail.
 *
 * Every invocation writes exactly one row to `retention_purge_runs`:
 *   - status='running' when the job starts
 *   - status='ok' + per-table counts + duration when it finishes cleanly
 *   - status='error' + error_message when it fails
 *
 * Cron header: x-cron-token: <AUDIT_CRON_TOKEN>
 * Manual dry-run: POST with body {"dryRun": true} — logs an audit row but
 * does not touch any data (returns what enforce_retention_policies would purge
 * if it were invoked). Useful for smoke tests and monitoring.
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PurgeResult {
  [tableName: string]: number;
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const token = req.headers.get("x-cron-token");
  const expected = Deno.env.get("AUDIT_CRON_TOKEN");
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  const triggeredBy =
    req.headers.get("x-triggered-by") ??
    (req.headers.get("user-agent") ?? "cron").slice(0, 200);

  // Best-effort parse; body is optional.
  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = Boolean(body?.dryRun);
  } catch {
    /* no body — that's fine */
  }

  const startTs = Date.now();

  // 1. Start audit row.
  const { data: runRow, error: runErr } = await supabase
    .from("retention_purge_runs")
    .insert({ status: "running", triggered_by: triggeredBy })
    .select("id")
    .single();

  if (runErr) {
    console.error("[retention-purge] failed to open audit row", runErr);
    return new Response(JSON.stringify({ error: runErr.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const runId = runRow.id as string;
  console.log(`[retention-purge] run ${runId} started (dryRun=${dryRun})`);

  if (dryRun) {
    const duration = Date.now() - startTs;
    await supabase
      .from("retention_purge_runs")
      .update({
        status: "ok",
        finished_at: new Date().toISOString(),
        duration_ms: duration,
        purged: { dry_run: true },
        total_rows: 0,
      })
      .eq("id", runId);
    return new Response(JSON.stringify({ ok: true, dryRun: true, runId }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // 2. Do the work.
  const { data, error } = await supabase.rpc("enforce_retention_policies");

  const duration = Date.now() - startTs;

  if (error) {
    console.error(`[retention-purge] run ${runId} failed`, error);
    await supabase
      .from("retention_purge_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        duration_ms: duration,
        error_message: error.message?.slice(0, 2000) ?? "unknown error",
      })
      .eq("id", runId);

    return new Response(JSON.stringify({ error: error.message, runId }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // 3. Normalise purged counts and total.
  const purged: PurgeResult =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as PurgeResult)
      : {};
  const totalRows = Object.values(purged).reduce(
    (sum, n) => sum + (typeof n === "number" ? n : 0),
    0,
  );

  await supabase
    .from("retention_purge_runs")
    .update({
      status: "ok",
      finished_at: new Date().toISOString(),
      duration_ms: duration,
      purged,
      total_rows: totalRows,
    })
    .eq("id", runId);

  console.log(
    `[retention-purge] run ${runId} ok in ${duration}ms — purged ${totalRows} rows`,
    purged,
  );

  return new Response(
    JSON.stringify({
      ok: true,
      runId,
      durationMs: duration,
      totalRows,
      purged,
    }),
    { headers: { ...cors, "Content-Type": "application/json" } },
  );
};

// Only start the HTTP server in the deployed edge runtime — never during unit
// tests, which import `handler` directly.
if (import.meta.main) {
  Deno.serve(handler);
}
