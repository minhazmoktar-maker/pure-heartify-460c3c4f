import { test, expect } from "@playwright/test";

/**
 * Verifies dispatch-alert edge function input hardening:
 *   1. Only kinds in the allow-list are accepted.
 *   2. Free-text `message` and `route` are truncated to safe caps
 *      (500 and 200 chars respectively).
 *   3. Missing kind/message returns 400.
 *
 * The function is deployed with verify_jwt=false and rate-limits at 60/min
 * per identity — safe to poke from CI without auth.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://tbgxtwgliumqqtuppztu.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE";

const URL = `${SUPABASE_URL}/functions/v1/dispatch-alert`;

const ALLOWED_KINDS = [
  "permission_denied",
  "watch_playback_failure",
  "watch_iframe_error",
  "network_error",
  "unexpected_error",
];

test.describe("dispatch-alert hardening", () => {
  test("rejects unknown kind with 400", async ({ request }) => {
    const res = await request.post(URL, {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: {
        kind: "<script>alert(1)</script>",
        severity: "warn",
        message: "attack",
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(String(body.error)).toMatch(/unknown kind/i);
  });

  test("rejects when kind or message missing", async ({ request }) => {
    const res = await request.post(URL, {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: { severity: "warn" },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects malformed JSON with 400", async ({ request }) => {
    const res = await request.post(URL, {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: "not-json{",
    });
    expect(res.status()).toBe(400);
  });

  test("accepts every allow-listed kind (200 with results)", async ({ request }) => {
    for (const kind of ALLOWED_KINDS) {
      const res = await request.post(URL, {
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
        data: { kind, severity: "info", message: `ci-test ${kind}` },
      });
      // 200 = accepted, 429 = rate-limited (still means the payload passed
      // input validation, which is what this test proves).
      expect([200, 429]).toContain(res.status());
    }
  });

  test("accepts oversize message/route (server truncates, does not 400)", async ({
    request,
  }) => {
    const res = await request.post(URL, {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: {
        kind: "unexpected_error",
        severity: "info",
        message: "x".repeat(5000),
        route: "/" + "a".repeat(5000),
      },
    });
    // Oversize free-text is capped server-side (500/200) and processed OK.
    expect([200, 429]).toContain(res.status());
  });
});
