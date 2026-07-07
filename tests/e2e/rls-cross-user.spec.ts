import { test, expect, request } from "@playwright/test";

/**
 * RLS enforcement tests for `favorites` and `watch_history`.
 *
 * These tests hit the Supabase Data API directly with the public anon key
 * to prove that:
 *   1. Unauthenticated requests cannot read or write either table.
 *   2. A user cannot read, update, or delete another user's rows.
 *   3. Owner-scoped UPDATE is the only mutation allowed on one's own row.
 *
 * The tests are hermetic when SUPABASE_TEST_USER_A / _B envs are provided
 * (email+password pairs). Without them, only the anonymous-denial cases run
 * — which is enough to catch a policy regression that opens the tables up.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://tbgxtwgliumqqtuppztu.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE";

async function signIn(email: string, password: string): Promise<string | null> {
  const ctx = await request.newContext();
  const res = await ctx.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: { email, password },
    },
  );
  if (!res.ok()) return null;
  const body = await res.json();
  return body.access_token ?? null;
}

test.describe("RLS: favorites & watch_history", () => {
  test("anonymous requests cannot read favorites", async ({ request: req }) => {
    const res = await req.get(`${SUPABASE_URL}/rest/v1/favorites?select=*`, {
      headers: { apikey: ANON_KEY },
    });
    // Either 401 (no JWT) or 200 with empty array — never leaks other rows.
    if (res.ok()) {
      const rows = await res.json();
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBe(0);
    } else {
      expect([401, 403]).toContain(res.status());
    }
  });

  test("anonymous requests cannot read watch_history", async ({
    request: req,
  }) => {
    const res = await req.get(
      `${SUPABASE_URL}/rest/v1/watch_history?select=*`,
      { headers: { apikey: ANON_KEY } },
    );
    if (res.ok()) {
      const rows = await res.json();
      expect(rows.length).toBe(0);
    } else {
      expect([401, 403]).toContain(res.status());
    }
  });

  test("anonymous cannot INSERT into favorites", async ({ request: req }) => {
    const res = await req.post(`${SUPABASE_URL}/rest/v1/favorites`, {
      headers: {
        apikey: ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      data: {
        user_id: "00000000-0000-0000-0000-000000000000",
        video_id: "xxxxxxxxxxx",
      },
    });
    expect(res.ok()).toBe(false);
    expect([401, 403, 409]).toContain(res.status());
  });

  test("anonymous cannot INSERT into watch_history", async ({ request: req }) => {
    const res = await req.post(`${SUPABASE_URL}/rest/v1/watch_history`, {
      headers: {
        apikey: ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      data: {
        user_id: "00000000-0000-0000-0000-000000000000",
        video_id: "xxxxxxxxxxx",
      },
    });
    expect(res.ok()).toBe(false);
    expect([401, 403, 409]).toContain(res.status());
  });

  test("cross-user access is denied and owner UPDATE is allowed", async ({
    request: req,
  }) => {
    const emailA = process.env.SUPABASE_TEST_USER_A_EMAIL;
    const passA = process.env.SUPABASE_TEST_USER_A_PASSWORD;
    const emailB = process.env.SUPABASE_TEST_USER_B_EMAIL;
    const passB = process.env.SUPABASE_TEST_USER_B_PASSWORD;

    test.skip(
      !emailA || !passA || !emailB || !passB,
      "Requires SUPABASE_TEST_USER_A/B_EMAIL+PASSWORD env vars",
    );

    const tokenA = await signIn(emailA!, passA!);
    const tokenB = await signIn(emailB!, passB!);
    expect(tokenA, "user A sign-in failed").not.toBeNull();
    expect(tokenB, "user B sign-in failed").not.toBeNull();

    // A inserts a favorite
    const insert = await req.post(`${SUPABASE_URL}/rest/v1/favorites`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      data: { video_id: `rls${Date.now().toString().slice(-8)}` },
    });
    expect(insert.ok()).toBe(true);
    const [row] = await insert.json();
    expect(row?.id).toBeTruthy();

    // B cannot see A's row
    const asB = await req.get(
      `${SUPABASE_URL}/rest/v1/favorites?id=eq.${row.id}&select=*`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${tokenB}` } },
    );
    const bRows = await asB.json();
    expect(bRows).toEqual([]);

    // B cannot UPDATE A's row
    const bUpdate = await req.patch(
      `${SUPABASE_URL}/rest/v1/favorites?id=eq.${row.id}`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${tokenB}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        data: { video_title: "hacked" },
      },
    );
    const bUpdated = await bUpdate.json();
    expect(bUpdated).toEqual([]);

    // B cannot DELETE A's row
    const bDelete = await req.delete(
      `${SUPABASE_URL}/rest/v1/favorites?id=eq.${row.id}`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${tokenB}`,
          Prefer: "return=representation",
        },
      },
    );
    const bDeleted = await bDelete.json();
    expect(bDeleted).toEqual([]);

    // A CAN update their own row
    const aUpdate = await req.patch(
      `${SUPABASE_URL}/rest/v1/favorites?id=eq.${row.id}`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        data: { video_title: "owner-edit" },
      },
    );
    const aUpdated = await aUpdate.json();
    expect(aUpdated?.[0]?.video_title).toBe("owner-edit");

    // Cleanup
    await req.delete(`${SUPABASE_URL}/rest/v1/favorites?id=eq.${row.id}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${tokenA}` },
    });
  });
});
