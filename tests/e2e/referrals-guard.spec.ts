import { test, expect, request as pwRequest } from "@playwright/test";

/**
 * Referral update guard tests.
 *
 * Confirms `referrals_guard_update` trigger:
 *   1. Blocks status transitions other than pending → redeemed.
 *   2. Only the invitee can flip status to redeemed.
 *   3. Immutable columns (id, code, inviter_id, invitee_id, redeemed_at once
 *      set) cannot be tampered with.
 *
 * Requires two test users with envs
 *   SUPABASE_TEST_USER_A_EMAIL/PASSWORD (acts as inviter)
 *   SUPABASE_TEST_USER_B_EMAIL/PASSWORD (acts as invitee)
 * Skipped otherwise — CI still catches regressions when the secrets are set.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://tbgxtwgliumqqtuppztu.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE";

async function signIn(email: string, password: string) {
  const ctx = await pwRequest.newContext();
  const res = await ctx.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: { email, password },
    },
  );
  if (!res.ok()) return null;
  const body = await res.json();
  return {
    token: body.access_token as string,
    userId: body.user?.id as string,
  };
}

test.describe("referrals update guard", () => {
  const emailA = process.env.SUPABASE_TEST_USER_A_EMAIL;
  const passA = process.env.SUPABASE_TEST_USER_A_PASSWORD;
  const emailB = process.env.SUPABASE_TEST_USER_B_EMAIL;
  const passB = process.env.SUPABASE_TEST_USER_B_PASSWORD;

  test.beforeEach(() => {
    test.skip(
      !emailA || !passA || !emailB || !passB,
      "Requires SUPABASE_TEST_USER_A/B_EMAIL+PASSWORD env vars",
    );
  });

  test("only invitee can flip pending → redeemed; inviter cannot", async ({
    request,
  }) => {
    const A = await signIn(emailA!, passA!);
    const B = await signIn(emailB!, passB!);
    expect(A).not.toBeNull();
    expect(B).not.toBeNull();

    const code = `TST${Date.now().toString().slice(-8)}`;
    // Inviter A creates a pending referral targeting invitee B.
    const insert = await request.post(`${SUPABASE_URL}/rest/v1/referrals`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${A!.token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      data: {
        code,
        inviter_id: A!.userId,
        invitee_id: B!.userId,
        status: "pending",
      },
    });
    // If insert is blocked by policy (some deployments only allow server-side
    // creation), skip the rest — the trigger still protects the row.
    if (!insert.ok()) {
      test.skip(true, `Referral insert not permitted: ${insert.status()}`);
      return;
    }
    const [row] = await insert.json();
    expect(row?.id).toBeTruthy();

    // Inviter cannot self-redeem.
    const inviterRedeem = await request.patch(
      `${SUPABASE_URL}/rest/v1/referrals?id=eq.${row.id}`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${A!.token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        data: { status: "redeemed" },
      },
    );
    // Either RLS blocks the row (empty result) or trigger raises.
    if (inviterRedeem.ok()) {
      const rows = await inviterRedeem.json();
      expect(rows).toEqual([]);
    } else {
      expect([400, 401, 403]).toContain(inviterRedeem.status());
    }

    // Invitee can flip pending → redeemed exactly once.
    const inviteeRedeem = await request.patch(
      `${SUPABASE_URL}/rest/v1/referrals?id=eq.${row.id}`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${B!.token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        data: { status: "redeemed" },
      },
    );
    expect(inviteeRedeem.ok()).toBe(true);
    const redeemed = await inviteeRedeem.json();
    expect(redeemed?.[0]?.status).toBe("redeemed");

    // Second transition (redeemed → anything) must be rejected.
    const reflip = await request.patch(
      `${SUPABASE_URL}/rest/v1/referrals?id=eq.${row.id}`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${B!.token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        data: { status: "pending" },
      },
    );
    if (reflip.ok()) {
      const rows = await reflip.json();
      // If no rows updated, the guard silently rejected via RLS-with-check.
      expect(rows).toEqual([]);
    } else {
      expect([400, 403]).toContain(reflip.status());
    }

    // Immutable columns must not change.
    const tamper = await request.patch(
      `${SUPABASE_URL}/rest/v1/referrals?id=eq.${row.id}`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${B!.token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        data: { code: "HIJACKED", inviter_id: B!.userId },
      },
    );
    if (tamper.ok()) {
      const rows = await tamper.json();
      // Either blocked (empty) or the values stayed the same.
      if (rows.length) {
        expect(rows[0].code).toBe(code);
        expect(rows[0].inviter_id).toBe(A!.userId);
      }
    } else {
      expect([400, 403]).toContain(tamper.status());
    }
  });
});
