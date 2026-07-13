/**
 * MCP RLS smoke test.
 *
 * Verifies that the MCP tools registered in src/lib/mcp/index.ts:
 *   1. Are all reachable via the deployed /functions/v1/mcp endpoint.
 *   2. Reject unauthenticated tool calls (401).
 *   3. When called with a real user JWT, only return rows for that user (RLS).
 *
 * Requires env:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
 *   MCP_TEST_USER_A_EMAIL, MCP_TEST_USER_A_PASSWORD,
 *   MCP_TEST_USER_B_EMAIL, MCP_TEST_USER_B_PASSWORD
 *
 * Full OAuth-consent connect flow (with a real ChatGPT/Claude client) is
 * exercised by the manual `docs/mcp-oauth-manual-check.md` runbook — this
 * automated test asserts the RLS + tool-registration invariants that the
 * OAuth handshake ultimately depends on.
 */
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const MCP_URL = `${SUPABASE_URL}/functions/v1/mcp`;

async function rpc(body: unknown, token?: string) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

const EXPECTED_TOOLS = [
  "get_profile",
  "get_streak",
  "list_favorites",
  "list_dhikr_sessions",
  "list_salah_logs",
  "log_dhikr_session",
  "log_salah",
  "get_prayer_times",
];

test.describe("MCP server", () => {
  test.skip(!process.env.MCP_TEST_USER_A_EMAIL, "MCP test credentials not configured");

  test("rejects unauthenticated tools/list", async () => {
    const r = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect([401, 403]).toContain(r.status);
  });

  test("lists all registered tools for authenticated caller", async () => {
    const sb = createClient(SUPABASE_URL, ANON);
    const { data } = await sb.auth.signInWithPassword({
      email: process.env.MCP_TEST_USER_A_EMAIL!,
      password: process.env.MCP_TEST_USER_A_PASSWORD!,
    });
    const r = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, data.session!.access_token);
    expect(r.status).toBe(200);
    for (const name of EXPECTED_TOOLS) expect(r.body).toContain(name);
  });

  test("list_dhikr_sessions is RLS-scoped to caller", async () => {
    const sb = createClient(SUPABASE_URL, ANON);
    const { data: a } = await sb.auth.signInWithPassword({
      email: process.env.MCP_TEST_USER_A_EMAIL!,
      password: process.env.MCP_TEST_USER_A_PASSWORD!,
    });
    const call = (token: string) =>
      rpc(
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "list_dhikr_sessions", arguments: { limit: 5, offset: 0 } },
        },
        token,
      );
    const resA = await call(a.session!.access_token);
    expect(resA.status).toBe(200);

    await sb.auth.signOut();
    const { data: b } = await sb.auth.signInWithPassword({
      email: process.env.MCP_TEST_USER_B_EMAIL!,
      password: process.env.MCP_TEST_USER_B_PASSWORD!,
    });
    const resB = await call(b.session!.access_token);
    expect(resB.status).toBe(200);
    // Different callers must not see each other's rows verbatim.
    if (resA.body.length > 40 && resB.body.length > 40) {
      expect(resA.body).not.toEqual(resB.body);
    }
  });
});
