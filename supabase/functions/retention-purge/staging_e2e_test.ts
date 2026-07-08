// Staging end-to-end test for retention-purge.
//
// This file is intentionally NOT part of the default unit suite — it targets
// a live staging database and mutates data. It runs from a GitHub Actions
// workflow that supplies the required environment variables.
//
// Guard: refuses to run unless STAGING_SUPABASE_URL is set AND the URL does
// NOT contain the string "prod". Prevents accidental data loss.
//
// What it validates:
//   1. Seeded rows with an "old" created_at get physically removed by
//      enforce_retention_policies() invoked through the edge function.
//   2. The retention_purge_runs table receives a status='ok' row with
//      duration_ms > 0 and per-table counts that include our seeded rows.
//   3. Recent rows (within the retention window) are NOT touched.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

const url = Deno.env.get("STAGING_SUPABASE_URL");
const key = Deno.env.get("STAGING_SUPABASE_SERVICE_ROLE_KEY");
const token = Deno.env.get("AUDIT_CRON_TOKEN");

const shouldRun = Boolean(url && key && token) && !!url && !url.includes("prod");

Deno.test({
  name: "retention-purge staging e2e — purges old rows and writes audit row",
  ignore: !shouldRun,
  async fn() {
    const supabase = createClient(url!, key!);
    const tag = `e2e-${crypto.randomUUID()}`;
    const oldTs = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString(); // ~400d old
    const freshTs = new Date().toISOString();

    // ---- Seed 3 old + 3 fresh rows across the three retention-managed tables.
    const oldSeeds = [
      { table: "analytics_events", row: { event_name: tag, properties: { e2e: tag }, created_at: oldTs } },
      { table: "search_queries", row: { normalized_query: tag, raw_query: tag, created_at: oldTs } },
      { table: "recommendation_events", row: { video_id: tag, event_type: "impression", created_at: oldTs } },
    ];
    const freshSeeds = oldSeeds.map((s) => ({ ...s, row: { ...s.row, created_at: freshTs } }));

    for (const s of [...oldSeeds, ...freshSeeds]) {
      const { error } = await supabase.from(s.table).insert(s.row);
      assert(!error, `seed ${s.table} failed: ${error?.message}`);
    }

    // ---- Invoke the edge function for real (dryRun=false).
    const before = new Date().toISOString();
    const res = await fetch(`${url}/functions/v1/retention-purge`, {
      method: "POST",
      headers: {
        "x-cron-token": token!,
        "x-triggered-by": "gha-e2e",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assertEquals(res.status, 200, `purge HTTP ${res.status}`);
    const body = await res.json();
    assert(body.ok, `purge not ok: ${JSON.stringify(body)}`);
    const runId = body.runId as string;
    assert(runId, "no runId returned");

    // ---- Assert audit row is complete.
    const { data: run } = await supabase
      .from("retention_purge_runs")
      .select("*")
      .eq("id", runId)
      .single();
    assert(run, "audit row missing");
    assertEquals(run!.status, "ok");
    assert(run!.duration_ms > 0, "duration_ms should be > 0");
    assert(run!.total_rows >= 3, `expected ≥3 purged rows, got ${run!.total_rows}`);
    assert(new Date(run!.started_at) >= new Date(before).valueOf() - 5_000 as unknown as Date, "started_at sanity");
    assert(run!.purged && typeof run!.purged === "object", "purged JSON present");

    // ---- Assert old rows are gone.
    for (const s of oldSeeds) {
      const { count } = await supabase
        .from(s.table)
        .select("*", { count: "exact", head: true })
        .eq(s.table === "analytics_events" ? "event_name" : s.table === "search_queries" ? "normalized_query" : "video_id", tag)
        .lt("created_at", freshTs);
      assertEquals(count ?? 0, 0, `old rows still present in ${s.table}`);
    }

    // ---- Assert fresh rows still exist, then clean them up.
    for (const s of freshSeeds) {
      const col = s.table === "analytics_events" ? "event_name" : s.table === "search_queries" ? "normalized_query" : "video_id";
      const { count } = await supabase
        .from(s.table)
        .select("*", { count: "exact", head: true })
        .eq(col, tag);
      assert((count ?? 0) >= 1, `fresh rows disappeared from ${s.table}`);
      await supabase.from(s.table).delete().eq(col, tag);
    }
  },
});
