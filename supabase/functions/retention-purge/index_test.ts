import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assertEquals,
  assertStringIncludes,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

/**
 * Unit tests for the retention-purge edge function.
 *
 * These tests exercise the exported `handler` directly with a stubbed
 * @supabase/supabase-js client so they do not require network access,
 * a running database, or the AUDIT_CRON_TOKEN secret in CI. To verify
 * end-to-end SQL behaviour of enforce_retention_policies() run the
 * function against a staging project with `curl` (see docs/PRODUCTION_AUDIT.md).
 */

Deno.env.set("SUPABASE_URL", "http://stub.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "stub-key");
Deno.env.set("AUDIT_CRON_TOKEN", "test-token");

// ---- Client stub --------------------------------------------------------

interface RunRecord {
  id: string;
  status: string;
  purged?: Record<string, number>;
  total_rows?: number;
  error_message?: string;
  duration_ms?: number;
  finished_at?: string;
  triggered_by?: string;
}

const state = {
  runs: [] as RunRecord[],
  rpcResult: null as unknown,
  rpcError: null as { message: string } | null,
};

function makeClient() {
  return {
    from(table: string) {
      if (table !== "retention_purge_runs") throw new Error(`unexpected table ${table}`);
      return {
        insert(row: Partial<RunRecord>) {
          const rec: RunRecord = {
            id: crypto.randomUUID(),
            status: row.status ?? "running",
            triggered_by: row.triggered_by,
          };
          state.runs.push(rec);
          return {
            select() {
              return {
                single: async () => ({ data: { id: rec.id }, error: null }),
              };
            },
          };
        },
        update(patch: Partial<RunRecord>) {
          return {
            eq(_col: string, id: string) {
              const rec = state.runs.find((r) => r.id === id);
              if (rec) Object.assign(rec, patch);
              return Promise.resolve({ data: rec, error: null });
            },
          };
        },
      };
    },
    async rpc(_name: string) {
      if (state.rpcError) return { data: null, error: state.rpcError };
      return { data: state.rpcResult, error: null };
    },
  };
}

// Stub `createClient` on the esm.sh module before importing the handler.
import * as sb from "https://esm.sh/@supabase/supabase-js@2.45.0";
// deno-lint-ignore no-explicit-any
(sb as any).createClient = () => makeClient();

const { handler } = await import("./index.ts");

// ---- Helpers ------------------------------------------------------------

function req(
  body: unknown,
  headers: Record<string, string> = { "x-cron-token": "test-token" },
) {
  return new Request("http://local/retention-purge", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body ?? {}),
  });
}

function resetState() {
  state.runs = [];
  state.rpcResult = null;
  state.rpcError = null;
}

// ---- Tests --------------------------------------------------------------

Deno.test("rejects requests with a missing cron token", async () => {
  resetState();
  const res = await handler(req({}, {}));
  assertEquals(res.status, 401);
  await res.text();
  assertEquals(state.runs.length, 0, "no audit row for unauthorised call");
});

Deno.test("dry run logs an audit row but does not call the purge RPC", async () => {
  resetState();
  const res = await handler(req({ dryRun: true }));
  assertEquals(res.status, 200);
  const body = await res.json();
  assert(body.ok);
  assertEquals(body.dryRun, true);
  assertEquals(state.runs.length, 1);
  assertEquals(state.runs[0].status, "ok");
  assertEquals(state.runs[0].purged?.dry_run, true);
});

Deno.test("successful run records per-table counts and total_rows", async () => {
  resetState();
  state.rpcResult = { analytics_events: 3, search_queries: 5, recommendation_events: 2 };

  const res = await handler(req({}));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.ok, true);
  assertEquals(body.totalRows, 10);
  assertEquals(body.purged.analytics_events, 3);

  const rec = state.runs[0];
  assertEquals(rec.status, "ok");
  assertEquals(rec.total_rows, 10);
  assertEquals(rec.purged?.search_queries, 5);
  assert(typeof rec.duration_ms === "number" && rec.duration_ms! >= 0);
  assert(rec.finished_at);
});

Deno.test("failed RPC updates audit row to error and returns 500", async () => {
  resetState();
  state.rpcError = { message: "boom" };

  const res = await handler(req({}));
  assertEquals(res.status, 500);
  const body = await res.json();
  assertStringIncludes(body.error, "boom");

  const rec = state.runs[0];
  assertEquals(rec.status, "error");
  assertStringIncludes(rec.error_message ?? "", "boom");
});
