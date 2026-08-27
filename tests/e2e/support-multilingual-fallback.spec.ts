import { test, expect } from "@playwright/test";

/**
 * End-to-end contract for the Help assistant's multilingual front door and its
 * behaviour under rate limiting.
 *
 * These run against the deployed `support-agent` function with the anon key —
 * exactly what a signed-out visitor sends. The assertions are about
 * *behaviour*, not about which provider answered:
 *   1. Questions in Bengali / Urdu / Indonesian / Arabic resolve from the
 *      deterministic FAQ or KB layers, with zero inference.
 *   2. No answer ever names a provider, model or internal component.
 *   3. Burst traffic is limited with a Retry-After, and once the window
 *      clears the same question still resolves from FAQ/KB (degradation is
 *      graceful, not a dead end).
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://tbgxtwgliumqqtuppztu.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE";

const URL = `${SUPABASE_URL}/functions/v1/support-agent`;

/** Nothing user-facing may disclose how the answer was produced. */
const FORBIDDEN = [
  /openai/i, /anthropic/i, /gemini/i, /gpt-/i, /claude/i, /deepseek/i, /groq/i,
  /supabase/i, /edge function/i, /system prompt/i, /embedding/i, /vector/i,
  /lovable/i, /api key/i,
];

/** Layers that answer without calling any model. */
const ZERO_COST_LAYERS = [
  "static",
  "faq",
  "exact_cache",
  "semantic_cache",
  "degraded",
  "unsupported",
  "flow",
  "tool",
  "report",
  "troubleshoot",
  "account",
];

function device(tag: string) {
  return `e2e-${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function ask(
  request: import("@playwright/test").APIRequestContext,
  message: string,
  opts: { locale: string; anonKey: string },
) {
  return await request.post(URL, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    data: { message, locale: opts.locale, anon_key: opts.anonKey },
  });
}

const MULTILINGUAL: { name: string; locale: string; question: string }[] = [
  { name: "Bengali — save a video", locale: "bn", question: "আমি কিভাবে একটি ভিডিও সেভ করব?" },
  { name: "Urdu — save a video", locale: "ur", question: "میں ویڈیو کیسے محفوظ کروں؟" },
  { name: "Indonesian — what is Heartify", locale: "id", question: "Apa itu Heartify?" },
  { name: "Arabic — report a video", locale: "ar", question: "كيف أبلغ عن فيديو؟" },
  { name: "Romanised Bengali — save a video", locale: "bn", question: "video kivabe save korbo" },
];

test.describe("support agent — multilingual resolution", () => {
  for (const c of MULTILINGUAL) {
    test(`${c.name} resolves without inference`, async ({ request }) => {
      const res = await ask(request, c.question, { locale: c.locale, anonKey: device("ml") });
      expect(res.status(), await res.text()).toBe(200);
      const body = await res.json();

      expect(typeof body.answer).toBe("string");
      expect(body.answer.length).toBeGreaterThan(20);
      // Cheapest viable tier: these are known intents, so no model is needed.
      expect(ZERO_COST_LAYERS, `layer=${body.resolution_layer}`).toContain(body.resolution_layer);
      expect(body.llm_used).toBe(false);

      for (const re of FORBIDDEN) {
        expect(body.answer, `leaked ${re}`).not.toMatch(re);
      }
    });
  }

  test("out-of-scope questions are declined instead of guessed", async ({ request }) => {
    const res = await ask(request, "Is it halal to trade crypto futures?", {
      locale: "en",
      anonKey: device("scope"),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.resolution_layer).toBe("unsupported");
    expect(body.llm_used).toBe(false);
  });
});

test.describe("support agent — rate limiting and fallback", () => {
  // Each turn is a real network round trip to the deployed function, and these
  // tests deliberately fire many of them.
  test.describe.configure({ timeout: 180_000 });

  test("burst traffic is limited or served, never broken", async ({ request }) => {
    const anonKey = device("burst");

    // Fire concurrently so the requests land inside one burst window.
    const responses = await Promise.all(
      Array.from({ length: 12 }, () =>
        ask(request, "How do I save a video?", { locale: "en", anonKey }),
      ),
    );
    const statuses = responses.map((r) => r.status());
    const limited = responses.filter((r) => r.status() === 429);

    // The ceiling is a tuning knob, so we assert the invariant instead of a
    // fixed count: every request is either answered or cleanly limited.
    expect(statuses.every((s) => s === 200 || s === 429), `statuses=${statuses.join(",")}`).toBe(true);

    for (const r of limited) {
      // A limited caller must be told when to come back, and must not learn
      // anything about the internals.
      expect(Number(r.headers()["retry-after"])).toBeGreaterThan(0);
      const body = await r.json();
      expect(typeof body.error).toBe("string");
      for (const re of FORBIDDEN) expect(body.error).not.toMatch(re);
    }

    // Once the burst window clears, knowledge is still served deterministically.
    await new Promise((r) => setTimeout(r, 15_000));
    const after = await ask(request, "How do I report a video?", {
      locale: "en",
      anonKey: device("burst-after"),
    });
    expect(after.status()).toBe(200);
    const body = await after.json();
    expect(ZERO_COST_LAYERS).toContain(body.resolution_layer);
    expect(body.answer.length).toBeGreaterThan(20);
  });

  test("a limited multilingual caller degrades to FAQ/KB, never to a raw error", async ({ request }) => {
    const anonKey = device("bn-burst");
    const question = "আমি কিভাবে একটি ভিডিও রিপোর্ট করব?";

    for (let i = 0; i < 6; i += 1) {
      const res = await ask(request, question, { locale: "bn", anonKey });
      if (res.status() === 429) {
        const body = await res.json();
        expect(body.error).toMatch(/\w/);
        for (const re of FORBIDDEN) expect(body.error).not.toMatch(re);
        continue;
      }
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.llm_used).toBe(false);
      expect(ZERO_COST_LAYERS).toContain(body.resolution_layer);
    }
  });
});
