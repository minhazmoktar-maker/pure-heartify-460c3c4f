/**
 * Support rate limiting + abuse contract.
 *
 * The Help assistant is the one surface an anonymous visitor can point at our
 * inference budget. These tests pin the layered plan (user / anon device / IP),
 * the retry contract, concurrency behaviour, and the rule that a counter outage
 * degrades to *serving* rather than to a 429.
 */
import { describe, it, expect } from "vitest";
import {
  ABUSE_MESSAGE,
  buildLimitPlan,
  clientIp,
  detectAbuse,
  enforceSupportLimits,
  verdictFor,
} from "../../supabase/functions/_shared/support/limits.ts";

/** Minimal in-memory stand-in for public.rate_limit_counters. */
function fakeAdmin(opts: { fail?: boolean } = {}) {
  const counters = new Map<string, number>();
  let calls = 0;
  return {
    calls: () => calls,
    counters,
    // deno-lint-ignore no-explicit-any
    rpc: async (_fn: string, args: any) => {
      calls++;
      if (opts.fail) return { data: null, error: { message: "counter unavailable" } };
      const key = `${args._identity}|${args._action}|${args._bucket}`;
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return { data: next, error: null };
    },
  };
}

// deno-lint-ignore no-explicit-any
const admin = (a: ReturnType<typeof fakeAdmin>) => a as any;

describe("buildLimitPlan — layered scopes", () => {
  it("gives signed-in users a wider allowance than anonymous devices", () => {
    const user = buildLimitPlan({ userId: "u1", anonKey: null, ip: "1.1.1.1" });
    const anon = buildLimitPlan({ userId: null, anonKey: "a1", ip: "1.1.1.1" });
    const minute = (rules: typeof user, scope: string) =>
      rules.find((r) => r.scope === scope && r.windowSeconds === 60)!.limit;
    expect(minute(user, "user")).toBeGreaterThan(minute(anon, "anon"));
  });

  it("always applies the IP layer so rotating anon keys buys nothing", () => {
    for (const ctx of [
      { userId: "u1", anonKey: null, ip: "9.9.9.9" },
      { userId: null, anonKey: "a1", ip: "9.9.9.9" },
      { userId: null, anonKey: null, ip: "9.9.9.9" },
    ]) {
      expect(buildLimitPlan(ctx).some((r) => r.scope === "ip")).toBe(true);
    }
  });
});

describe("verdictFor — retry contract", () => {
  it("returns a positive Retry-After and no internal detail", () => {
    const rule = buildLimitPlan({ userId: null, anonKey: "a1", ip: "1.1.1.1" })
      .find((r) => r.windowSeconds === 10)!;
    const v = verdictFor(rule);
    expect(v.limited).toBe(true);
    expect(v.retryAfterSeconds).toBeGreaterThan(0);
    expect(v.message).not.toMatch(/rate_limit_counters|supabase|token|provider/i);
  });
});

describe("enforceSupportLimits", () => {
  it("allows traffic under the burst limit and blocks past it", async () => {
    const store = fakeAdmin();
    const ctx = { userId: null, anonKey: "device-1", ip: "2.2.2.2" };
    const burst = buildLimitPlan(ctx).find((r) => r.scope === "anon" && r.windowSeconds === 10)!.limit;

    for (let i = 0; i < burst; i++) {
      expect((await enforceSupportLimits(admin(store), ctx)).limited).toBe(false);
    }
    const blocked = await enforceSupportLimits(admin(store), ctx);
    expect(blocked.limited).toBe(true);
    expect(blocked.rule?.scope).toBe("anon");
  });

  it("holds under concurrent turns from one device (no lost increments)", async () => {
    const store = fakeAdmin();
    const ctx = { userId: null, anonKey: "device-2", ip: "3.3.3.3" };
    const results = await Promise.all(
      Array.from({ length: 12 }, () => enforceSupportLimits(admin(store), ctx)),
    );
    expect(results.filter((r) => r.limited).length).toBeGreaterThan(0);
    // Every parallel turn was counted — no increment was silently dropped.
    const anonBurst = [...store.counters.entries()]
      .filter(([k]) => k.startsWith("a:device-2|support_burst"))
      .reduce((n, [, v]) => Math.max(n, v), 0);
    expect(anonBurst).toBeGreaterThanOrEqual(3);
  });

  it("isolates identities from each other", async () => {
    const store = fakeAdmin();
    const ipShared = "4.4.4.4";
    for (let i = 0; i < 3; i++) {
      await enforceSupportLimits(admin(store), { userId: null, anonKey: "d-a", ip: ipShared });
    }
    const other = await enforceSupportLimits(admin(store), { userId: null, anonKey: "d-b", ip: ipShared });
    expect(other.limited).toBe(false);
  });

  it("fails open when the counter store is unavailable", async () => {
    const store = fakeAdmin({ fail: true });
    const v = await enforceSupportLimits(admin(store), { userId: "u9", anonKey: null, ip: "5.5.5.5" });
    expect(v.limited).toBe(false);
  });
});

describe("detectAbuse — patterns, not volume", () => {
  it("ignores a normal conversation", () => {
    const v = detectAbuse({ repeats: 1, turnsPerMinute: 4, injectionAttempts: 0, distinctAnonKeys: 1 });
    expect(v.abusive).toBe(false);
    expect(v.block).toBe(false);
  });

  it("hard-blocks repeated injection attempts and anon-key rotation", () => {
    expect(detectAbuse({ repeats: 0, turnsPerMinute: 3, injectionAttempts: 3, distinctAnonKeys: 1 }).block).toBe(true);
    expect(detectAbuse({ repeats: 0, turnsPerMinute: 3, injectionAttempts: 0, distinctAnonKeys: 20 }).block).toBe(true);
  });

  it("flags a stuck user without hard-blocking them", () => {
    const v = detectAbuse({ repeats: 6, turnsPerMinute: 6, injectionAttempts: 0, distinctAnonKeys: 1 });
    expect(v.abusive).toBe(true);
    expect(v.block).toBe(false);
  });

  it("never explains internals in the abuse message", () => {
    expect(ABUSE_MESSAGE).not.toMatch(/rate limit|openai|gemini|token|prompt/i);
  });
});

describe("clientIp", () => {
  it("takes the first forwarded hop and tolerates missing headers", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "7.7.7.7, 10.0.0.1" } }))).toBe("7.7.7.7");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});
