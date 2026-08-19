import { test, expect, request as pwRequest } from "@playwright/test";

/**
 * SECURITY REGRESSION SUITE
 *
 * Re-verifies every hardening fix landed in the P0 security pass. It runs in
 * CI on every push (see .github/workflows/security-regression.yml) and fails
 * loudly if any of these surfaces re-opens.
 *
 * Coverage:
 *   1. Privileged RPCs (IDOR class) — must reject anon and cross-user calls.
 *   2. Internal worker RPCs — must not be callable by anon/authenticated.
 *   3. Edge functions with auth gates — must 401 anonymous callers.
 *   4. Sensitive tables — anonymous reads must never leak rows.
 *   5. Admin routes — must not render admin UI for anonymous visitors.
 *
 * Cross-user cases activate when SUPABASE_TEST_USER_A / _B credentials are
 * present (format: "email:password"). Without them the anonymous cases still
 * run, which is enough to catch a policy/grant regression.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://tbgxtwgliumqqtuppztu.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE";

const RANDOM_UUID = "00000000-0000-4000-8000-000000000abc";

/** RPCs that must be server-only: no anon, no authenticated. */
const SERVER_ONLY_RPCS: Array<{ name: string; body: Record<string, unknown> }> = [
  { name: "export_user_data", body: { p_user_id: RANDOM_UUID } },
  { name: "scrub_user_data", body: { p_user_id: RANDOM_UUID } },
  { name: "purge_function_metrics", body: {} },
  { name: "backfill_video_attestations", body: {} },
  { name: "enqueue_benefit_labels", body: {} },
];

/** RPCs callable by signed-in users but which must refuse other users' IDs. */
const SELF_SCOPED_RPCS: Array<{ name: string; body: Record<string, unknown> }> = [
  { name: "compute_weekly_recap", body: { p_user_id: RANDOM_UUID } },
  { name: "seed_default_notification_prefs", body: { p_user_id: RANDOM_UUID } },
];

/** Edge functions that must reject unauthenticated callers. */
const GATED_FUNCTIONS = [
  "sweep-embeddable",
  "personalized-push",
  "admin-roles",
  "admin-review",
  "retention-purge",
  "ingest-videos",
];

/** Tables that must never leak rows to anonymous callers. */
const SENSITIVE_TABLES = [
  "favorites",
  "watch_history",
  "notification_prefs",
  "audio_playback_positions",
  "user_roles",
  "attributions",
  "gift_codes",
  "function_metrics",
  "production_alerts",
];

async function signIn(pair?: string): Promise<string | null> {
  if (!pair || !pair.includes(":")) return null;
  const idx = pair.indexOf(":");
  const email = pair.slice(0, idx);
  const password = pair.slice(idx + 1);
  const ctx = await pwRequest.newContext();
  try {
    const res = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: { email, password },
    });
    if (!res.ok()) return null;
    return (await res.json()).access_token ?? null;
  } finally {
    await ctx.dispose();
  }
}

function denied(status: number) {
  return [400, 401, 403, 404].includes(status);
}

test.describe("security regression: privileged RPCs", () => {
  for (const rpc of SERVER_ONLY_RPCS) {
    test(`anon cannot execute ${rpc.name}`, async ({ request }) => {
      const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${rpc.name}`, {
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
        data: rpc.body,
        failOnStatusCode: false,
      });
      expect(denied(res.status()), `${rpc.name} returned ${res.status()}`).toBe(true);
    });

    test(`signed-in user cannot execute ${rpc.name}`, async ({ request }) => {
      const jwt = await signIn(process.env.SUPABASE_TEST_USER_A);
      test.skip(!jwt, "SUPABASE_TEST_USER_A not configured");
      const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${rpc.name}`, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        data: rpc.body,
        failOnStatusCode: false,
      });
      expect(denied(res.status()), `${rpc.name} returned ${res.status()}`).toBe(true);
    });
  }

  for (const rpc of SELF_SCOPED_RPCS) {
    test(`${rpc.name} rejects another user's id`, async ({ request }) => {
      const jwt = await signIn(process.env.SUPABASE_TEST_USER_A);
      test.skip(!jwt, "SUPABASE_TEST_USER_A not configured");
      const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${rpc.name}`, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        data: rpc.body,
        failOnStatusCode: false,
      });
      expect(denied(res.status()), `${rpc.name} returned ${res.status()}`).toBe(true);
    });

    test(`anon cannot execute ${rpc.name}`, async ({ request }) => {
      const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${rpc.name}`, {
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
        data: rpc.body,
        failOnStatusCode: false,
      });
      expect(denied(res.status())).toBe(true);
    });
  }

  test("admin-only function_health refuses non-admins", async ({ request }) => {
    const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/function_health`, {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: { p_hours: 24 },
      failOnStatusCode: false,
    });
    expect(denied(res.status())).toBe(true);
  });
});

test.describe("security regression: gated edge functions", () => {
  for (const fn of GATED_FUNCTIONS) {
    test(`${fn} rejects anonymous callers`, async ({ request }) => {
      const res = await request.post(`${SUPABASE_URL}/functions/v1/${fn}`, {
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
        data: {},
        failOnStatusCode: false,
      });
      expect([401, 403], `${fn} returned ${res.status()}`).toContain(res.status());
    });
  }
});

test.describe("security regression: RLS on sensitive tables", () => {
  for (const table of SENSITIVE_TABLES) {
    test(`anon cannot read ${table}`, async ({ request }) => {
      const res = await request.get(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=5`, {
        headers: { apikey: ANON_KEY },
        failOnStatusCode: false,
      });
      if (res.ok()) {
        const rows = await res.json();
        expect(Array.isArray(rows), table).toBe(true);
        expect(rows.length, `${table} leaked ${rows.length} rows to anon`).toBe(0);
      } else {
        expect(denied(res.status()), `${table} returned ${res.status()}`).toBe(true);
      }
    });

    test(`anon cannot write ${table}`, async ({ request }) => {
      const res = await request.post(`${SUPABASE_URL}/rest/v1/${table}`, {
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
        data: { id: RANDOM_UUID },
        failOnStatusCode: false,
      });
      expect(res.ok(), `${table} accepted an anonymous insert`).toBe(false);
    });
  }

  test("cross-user read of favorites returns nothing", async ({ request }) => {
    const jwtA = await signIn(process.env.SUPABASE_TEST_USER_A);
    const jwtB = await signIn(process.env.SUPABASE_TEST_USER_B);
    test.skip(!jwtA || !jwtB, "SUPABASE_TEST_USER_A/_B not configured");

    const me = await request.get(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwtB}` },
    });
    const userB = (await me.json()).id as string;

    const res = await request.get(
      `${SUPABASE_URL}/rest/v1/favorites?select=*&user_id=eq.${userB}`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwtA}` }, failOnStatusCode: false },
    );
    if (res.ok()) expect((await res.json()).length).toBe(0);
    else expect(denied(res.status())).toBe(true);
  });
});

test.describe("security regression: admin route gating", () => {
  for (const path of ["/admin/ops-health", "/admin/rec-health", "/admin/roles"]) {
    test(`${path} does not render admin data for anonymous visitors`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const body = ((await page.textContent("body")) ?? "").toLowerCase();
      const gated =
        /sign in|log in|admins only|restricted|not authorized|verifying access/.test(body) ||
        !/\/admin/.test(page.url()) ||
        body.trim().length < 200;
      expect(gated, `${path} appears to render admin content anonymously`).toBe(true);
    });
  }
});
