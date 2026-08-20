/**
 * Forged-bearer-token impersonation regression suite.
 *
 * Incident: `getCallerUserId()` in `supabase/functions/_shared/entitlements.ts`
 * trusted the `sub` claim from a local base64 decode of the JWT. Anyone could
 * mint `{"sub": "<victim uuid>", "role": "authenticated"}` with a garbage
 * signature and be served that user's personalized/premium surfaces.
 *
 * The fix forces cryptographic verification (`auth.getClaims`) before any user
 * id is trusted. This suite proves it across EVERY auth surface that resolves
 * an identity: PostgREST, GoTrue, and each identity-aware edge function.
 *
 * A forged token must never be accepted. Acceptable outcomes are:
 *   - a 401/403 rejection, or
 *   - a response that is provably anonymous (no user-scoped data).
 */
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://tbgxtwgliumqqtuppztu.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE";

const VICTIM_UUID = "11111111-1111-4111-8111-111111111111";

const b64url = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** Builds a structurally valid JWT with a bogus signature. */
function forge(claims: Record<string, unknown>, signature = "not-a-real-signature"): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({
    iss: `${SUPABASE_URL}/auth/v1`,
    aud: "authenticated",
    role: "authenticated",
    iat: now,
    exp: now + 3600,
    ...claims,
  });
  return `${header}.${payload}.${signature}`;
}

/** The full family of forgeries an attacker would realistically try. */
const FORGERIES: Array<{ name: string; token: string }> = [
  { name: "victim sub, garbage signature", token: forge({ sub: VICTIM_UUID }) },
  { name: "victim sub, empty signature", token: forge({ sub: VICTIM_UUID }, "") },
  {
    name: "alg:none downgrade",
    token: `${b64url({ alg: "none", typ: "JWT" })}.${b64url({
      sub: VICTIM_UUID,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    })}.`,
  },
  {
    name: "service_role claim escalation",
    token: forge({ sub: VICTIM_UUID, role: "service_role" }),
  },
  { name: "admin claim escalation", token: forge({ sub: VICTIM_UUID, user_role: "admin" }) },
  {
    name: "expired victim token",
    token: forge({ sub: VICTIM_UUID, exp: Math.floor(Date.now() / 1000) - 60 }),
  },
];

/** Identity-aware edge functions. All must refuse a forged identity. */
const IDENTITY_FUNCTIONS: Array<{ name: string; body?: Record<string, unknown> }> = [
  { name: "feed", body: { limit: 3 } },
  { name: "surfaces", body: { limit: 3 } },
  { name: "search", body: { q: "tafsir", limit: 3 } },
  { name: "recommendations", body: { limit: 3 } },
  { name: "export-account-data" },
  { name: "delete-account" },
  { name: "user-sync-pull" },
  { name: "user-sync-push", body: { changes: [] } },
  { name: "subscribe-web-push", body: { subscription: {} } },
  { name: "personalized-push" },
  { name: "admin-roles", body: { action: "list" } },
  { name: "admin-review", body: {} },
  { name: "log-privileged-action", body: { action: "test" } },
];

function bodyLeaksIdentity(text: string): boolean {
  return text.includes(VICTIM_UUID);
}

async function ctxFor(token: string): Promise<APIRequestContext> {
  return pwRequest.newContext({
    extraHTTPHeaders: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
}

test.describe("forged bearer tokens cannot impersonate a user", () => {
  for (const { name, token } of FORGERIES) {
    test(`PostgREST rejects: ${name}`, async () => {
      const ctx = await ctxFor(token);
      // A user-scoped table: a working forgery would return the victim's rows.
      const res = await ctx.get(
        `${SUPABASE_URL}/rest/v1/favorites?select=id,user_id&limit=5`,
      );
      const text = await res.text();
      await ctx.dispose();

      expect(
        res.status(),
        `forged token was accepted by PostgREST (${res.status()}): ${text.slice(0, 200)}`,
      ).not.toBe(200);
      expect(bodyLeaksIdentity(text)).toBe(false);
    });

    test(`GoTrue /user rejects: ${name}`, async () => {
      const ctx = await ctxFor(token);
      const res = await ctx.get(`${SUPABASE_URL}/auth/v1/user`);
      const text = await res.text();
      await ctx.dispose();
      expect(res.status(), `auth server accepted a forged token: ${text.slice(0, 200)}`).not.toBe(200);
    });

    test(`entitlements RPC cannot be spoofed: ${name}`, async () => {
      const ctx = await ctxFor(token);
      const res = await ctx.post(`${SUPABASE_URL}/rest/v1/rpc/grant_entitlement`, {
        headers: { "Content-Type": "application/json" },
        data: { _user_id: VICTIM_UUID, _plan: "premium", _reason: "e2e forged token" },
      });
      const text = await res.text();
      await ctx.dispose();
      expect(
        res.status(),
        `forged token granted premium (${res.status()}): ${text.slice(0, 200)}`,
      ).not.toBe(200);
    });
  }

  test("identity-aware edge functions never act on a forged sub", async () => {
    const token = forge({ sub: VICTIM_UUID });
    const failures: string[] = [];

    for (const fn of IDENTITY_FUNCTIONS) {
      const ctx = await ctxFor(token);
      const res = await ctx.post(`${SUPABASE_URL}/functions/v1/${fn.name}`, {
        headers: { "Content-Type": "application/json" },
        data: fn.body ?? {},
        failOnStatusCode: false,
      });
      const text = await res.text().catch(() => "");
      await ctx.dispose();

      // Leaking the victim's id back is an unconditional failure.
      if (bodyLeaksIdentity(text)) {
        failures.push(`${fn.name}: echoed victim id (${res.status()})`);
        continue;
      }
      // Functions that require an identity must reject outright.
      const requiresIdentity = ![
        "feed",
        "surfaces",
        "search",
        "recommendations",
      ].includes(fn.name);
      if (requiresIdentity && res.status() === 200) {
        failures.push(`${fn.name}: returned 200 for a forged identity`);
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("a forged premium token does not unlock premium-only feed rows", async () => {
    const ctx = await ctxFor(forge({ sub: VICTIM_UUID }));
    const res = await ctx.post(`${SUPABASE_URL}/functions/v1/feed`, {
      headers: { "Content-Type": "application/json" },
      data: { limit: 20 },
      failOnStatusCode: false,
    });
    const text = await res.text().catch(() => "");
    await ctx.dispose();

    if (res.status() !== 200) return; // rejected outright — also fine
    const parsed = JSON.parse(text || "{}");
    const items: Array<Record<string, unknown>> = parsed.items ?? parsed.videos ?? [];
    const premium = items.filter((i) => i.isPremiumOnly === true || i.is_premium_only === true);
    expect(premium, "forged token was served premium-only content").toEqual([]);
  });

  test("tampering with a real session token invalidates it", async () => {
    const pair = process.env.SUPABASE_TEST_USER_A;
    test.skip(!pair?.includes(":"), "SUPABASE_TEST_USER_A not configured");
    const idx = pair!.indexOf(":");
    const ctx = await pwRequest.newContext();
    const login = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: { email: pair!.slice(0, idx), password: pair!.slice(idx + 1) },
    });
    test.skip(!login.ok(), "test user sign-in failed");
    const access: string = (await login.json()).access_token;
    await ctx.dispose();

    // Swap the payload for the victim's id, keep the genuine signature.
    const [header, , signature] = access.split(".");
    const tampered = `${header}.${b64url({
      sub: VICTIM_UUID,
      role: "authenticated",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    })}.${signature}`;

    const attackCtx = await ctxFor(tampered);
    const rest = await attackCtx.get(`${SUPABASE_URL}/rest/v1/favorites?select=id,user_id&limit=5`);
    const restText = await rest.text();
    const user = await attackCtx.get(`${SUPABASE_URL}/auth/v1/user`);
    await attackCtx.dispose();

    expect(rest.status(), `payload-swap accepted: ${restText.slice(0, 200)}`).not.toBe(200);
    expect(user.status()).not.toBe(200);
  });
});
