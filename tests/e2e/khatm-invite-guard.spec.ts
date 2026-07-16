import { test, expect, request as pwRequest } from "@playwright/test";

/**
 * Private-group khatm invite validation tests.
 *
 * Confirms:
 *   1. A signed-in user cannot bypass invite-code checks by directly
 *      INSERT-ing into `khatm_group_members` for a private group.
 *   2. Calling `join_khatm_group` RPC with a wrong/absent invite code fails.
 *   3. The RPC succeeds when supplied with the correct code.
 *
 * Requires SUPABASE_TEST_USER_A_EMAIL/PASSWORD (creates the private group)
 * and SUPABASE_TEST_USER_B_EMAIL/PASSWORD (the outsider trying to join).
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

test.describe("khatm private-group join guard", () => {
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

  test("outsider cannot join private group without valid invite code", async ({
    request,
  }) => {
    const A = await signIn(emailA!, passA!);
    const B = await signIn(emailB!, passB!);
    expect(A).not.toBeNull();
    expect(B).not.toBeNull();

    const invite = `inv${Date.now().toString().slice(-8)}`;
    // Owner A creates a private group with a known invite code.
    const create = await request.post(`${SUPABASE_URL}/rest/v1/khatm_groups`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${A!.token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      data: {
        owner_id: A!.userId,
        name: "Private test circle",
        invite_code: invite,
        is_public: false,
      },
    });
    if (!create.ok()) {
      test.skip(true, `khatm_groups insert not permitted: ${create.status()}`);
      return;
    }
    const [group] = await create.json();
    expect(group?.id).toBeTruthy();

    try {
      // Attempt 1 — outsider B tries to insert directly into the members table.
      // The tightened `kgm_self_join` policy must reject this for a private group.
      const directInsert = await request.post(
        `${SUPABASE_URL}/rest/v1/khatm_group_members`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${B!.token}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          data: { group_id: group.id, user_id: B!.userId },
        },
      );
      if (directInsert.ok()) {
        // Some deployments return 201 with an empty body when RLS filters it.
        const rows = await directInsert.json().catch(() => []);
        expect(rows).toEqual([]);
      } else {
        expect([400, 401, 403, 409]).toContain(directInsert.status());
      }

      // Attempt 2 — RPC with a WRONG invite code must fail.
      const wrongRpc = await request.post(
        `${SUPABASE_URL}/rest/v1/rpc/join_khatm_group`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${B!.token}`,
            "Content-Type": "application/json",
          },
          data: { _group_id: group.id, _invite_code: "not-the-code" },
        },
      );
      expect(wrongRpc.ok()).toBe(false);
      expect([400, 401, 403]).toContain(wrongRpc.status());

      // Attempt 3 — RPC with the CORRECT invite code succeeds.
      const rightRpc = await request.post(
        `${SUPABASE_URL}/rest/v1/rpc/join_khatm_group`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${B!.token}`,
            "Content-Type": "application/json",
          },
          data: { _group_id: group.id, _invite_code: invite },
        },
      );
      expect(rightRpc.ok()).toBe(true);

      // Membership row now exists.
      const check = await request.get(
        `${SUPABASE_URL}/rest/v1/khatm_group_members?group_id=eq.${group.id}&user_id=eq.${B!.userId}&select=*`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${B!.token}`,
          },
        },
      );
      expect(check.ok()).toBe(true);
      const rows = await check.json();
      expect(rows.length).toBe(1);
    } finally {
      // Cleanup (owner can delete the group; membership cascades).
      await request.delete(
        `${SUPABASE_URL}/rest/v1/khatm_groups?id=eq.${group.id}`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${A!.token}`,
          },
        },
      );
    }
  });
});
