/**
 * Provider abstraction + failover contract.
 *
 * Verifies that production inference is configured purely from env vars, that a
 * failing primary provider transparently falls through to the secondary, and
 * that a total outage surfaces as ProviderFailure (which the agent turns into
 * degraded, FAQ-only mode rather than an error).
 */
import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { chatWithFailover, getProviderChain, isInferenceConfigured, ProviderFailure } from "./providers.ts";

const PRIMARY_KEYS = [
  "SUPPORT_AI_PROVIDER", "SUPPORT_AI_API_KEY", "SUPPORT_AI_MODEL", "SUPPORT_AI_BASE_URL",
  "SUPPORT_AI_MODEL_CHEAP", "SUPPORT_AI_PRICE_IN", "SUPPORT_AI_PRICE_OUT",
];
const FALLBACK_KEYS = [
  "SUPPORT_AI_FALLBACK_PROVIDER", "SUPPORT_AI_FALLBACK_API_KEY",
  "SUPPORT_AI_FALLBACK_MODEL", "SUPPORT_AI_FALLBACK_BASE_URL",
];

function clearEnv() {
  for (const k of [...PRIMARY_KEYS, ...FALLBACK_KEYS]) Deno.env.delete(k);
}

Deno.test("no provider env => not configured (agent runs degraded)", () => {
  clearEnv();
  assertEquals(isInferenceConfigured(), false);
  assertEquals(getProviderChain().length, 0);
});

Deno.test("primary + secondary are read from env, cheap tier falls back to the main model", () => {
  clearEnv();
  Deno.env.set("SUPPORT_AI_PROVIDER", "openai_compatible");
  Deno.env.set("SUPPORT_AI_API_KEY", "test-key");
  Deno.env.set("SUPPORT_AI_MODEL", "primary-standard");
  Deno.env.set("SUPPORT_AI_BASE_URL", "https://primary.test/v1/");
  Deno.env.set("SUPPORT_AI_FALLBACK_PROVIDER", "openai_compatible");
  Deno.env.set("SUPPORT_AI_FALLBACK_API_KEY", "test-key-2");
  Deno.env.set("SUPPORT_AI_FALLBACK_MODEL", "secondary-standard");
  Deno.env.set("SUPPORT_AI_FALLBACK_BASE_URL", "https://secondary.test/v1");

  const chain = getProviderChain();
  assertEquals(chain.length, 2);
  assertEquals(chain[0].name, "primary");
  assertEquals(chain[0].baseUrl, "https://primary.test/v1");
  assertEquals(chain[0].models.cheap, "primary-standard");
  assertEquals(chain[1].models.standard, "secondary-standard");
  clearEnv();
});

Deno.test("failover: primary error is retried on the secondary provider", async () => {
  clearEnv();
  Deno.env.set("SUPPORT_AI_PROVIDER", "openai_compatible");
  Deno.env.set("SUPPORT_AI_API_KEY", "k1");
  Deno.env.set("SUPPORT_AI_MODEL", "m1");
  Deno.env.set("SUPPORT_AI_BASE_URL", "https://primary.test/v1");
  Deno.env.set("SUPPORT_AI_FALLBACK_PROVIDER", "openai_compatible");
  Deno.env.set("SUPPORT_AI_FALLBACK_API_KEY", "k2");
  Deno.env.set("SUPPORT_AI_FALLBACK_MODEL", "m2");
  Deno.env.set("SUPPORT_AI_FALLBACK_BASE_URL", "https://secondary.test/v1");

  const original = globalThis.fetch;
  const seen: string[] = [];
  globalThis.fetch = ((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    seen.push(url);
    if (url.startsWith("https://primary.test")) {
      return Promise.resolve(new Response("rate limited", { status: 429 }));
    }
    return Promise.resolve(new Response(
      JSON.stringify({
        choices: [{ message: { content: "{\"answer\":\"ok\"}" } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
  }) as typeof fetch;

  const health: Array<{ provider: string; ok: boolean }> = [];
  try {
    const res = await chatWithFailover("standard", [{ role: "user", content: "hi" }], {
      recordHealth: (provider, ok) => {
        health.push({ provider, ok });
        return Promise.resolve();
      },
    });
    assertEquals(res.providerLabel, "secondary");
    assertEquals(res.model, "m2");
    assertEquals(res.promptTokens, 100);
    assert(res.costUsd > 0, "cost should be estimated from token usage");
    assertEquals(seen.length, 2);
    assertEquals(health, [{ provider: "openai_compatible", ok: false }, { provider: "openai_compatible", ok: true }]);
  } finally {
    globalThis.fetch = original;
    clearEnv();
  }
});

Deno.test("total outage throws ProviderFailure with per-provider attempts", async () => {
  clearEnv();
  Deno.env.set("SUPPORT_AI_PROVIDER", "openai_compatible");
  Deno.env.set("SUPPORT_AI_API_KEY", "k1");
  Deno.env.set("SUPPORT_AI_MODEL", "m1");
  Deno.env.set("SUPPORT_AI_BASE_URL", "https://primary.test/v1");

  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response("boom", { status: 500 }))) as typeof fetch;
  try {
    const error = await assertRejects(
      () => chatWithFailover("cheap", [{ role: "user", content: "hi" }]),
      ProviderFailure,
    );
    assertEquals(error.attempts.length, 1);
    assert(error.attempts[0].error.includes("500"));
  } finally {
    globalThis.fetch = original;
    clearEnv();
  }
});
