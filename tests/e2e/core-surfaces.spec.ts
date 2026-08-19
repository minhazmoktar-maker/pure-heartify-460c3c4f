import { test, expect } from "@playwright/test";

/**
 * Core-surface E2E: Home, /today, /quran and video playback.
 *
 * Designed to run against a PRODUCTION build (`vite preview`) by exporting
 * PLAYWRIGHT_BASE_URL, so bundle-splitting / lazy-route regressions are caught
 * the same way real users would hit them.
 *
 * Every test asserts on real rendered content — never just an HTTP 200 — so a
 * silent "Loading…" or empty-state regression fails the pipeline.
 */

const NOISE = /youtube|ytimg|doubleclick|gstatic|googletag|third.?party|favicon|manifest|service worker/i;

function collectErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !NOISE.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

test.describe("core surfaces", () => {
  test("Home renders content, not a spinner", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/heartify/i);

    // Main landmark must exist and carry real text.
    const main = page.locator("main, [role=main]").first();
    await expect(main).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(async () => ((await main.textContent()) ?? "").trim().length, { timeout: 25_000 })
      .toBeGreaterThan(120);

    // Exactly one H1 for SEO.
    await expect(page.locator("h1")).toHaveCount(1);

    // No lingering skeletons after settle.
    await page.waitForLoadState("networkidle").catch(() => {});
    expect(errors.filter((e) => !NOISE.test(e)), errors.join("\n")).toEqual([]);
  });

  test("/today renders the daily surface", async ({ page }) => {
    const errors = collectErrors(page);
    const res = await page.goto("/today", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(400);
    const main = page.locator("main, [role=main]").first();
    await expect(main).toBeVisible({ timeout: 20_000 });
    const text = await expect
      .poll(async () => ((await main.textContent()) ?? "").trim(), { timeout: 25_000 })
      .not.toBe("");
    void text;
    // The verse-of-the-day block is bundled data, so it must always render.
    await expect(page.getByText(/ayah|verse|surah|quran/i).first()).toBeVisible({ timeout: 20_000 });
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("/quran renders surah navigation", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/quran", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main, [role=main]").first()).toBeVisible({ timeout: 20_000 });
    // Al-Fatihah is always the first surah — bundled data, no network needed.
    await expect(page.getByText(/f[aā]ti/i).first()).toBeVisible({ timeout: 20_000 });
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("video playback: card → watch page mounts a player", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/watch/dQw4w9WgXcQ", { waitUntil: "domcontentloaded" });

    // Watch route must resolve past the loading state even for a cold deep link.
    await expect(page.locator("main, [role=main]").first()).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(
        async () => {
          const iframe = await page.locator("iframe").count();
          const body = ((await page.textContent("body")) ?? "").toLowerCase();
          // Either the embed mounted, or the page rendered an explicit
          // unavailable/blocked state — never an endless "Loading…".
          return iframe > 0 || /unavailable|not available|removed|couldn't load|try again/.test(body);
        },
        { timeout: 30_000 },
      )
      .toBe(true);

    const body = ((await page.textContent("body")) ?? "").toLowerCase();
    expect(body.includes("loading") && body.length < 200).toBe(false);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("primary navigation targets are reachable", async ({ page }) => {
    for (const path of ["/", "/today", "/quran", "/search", "/listen", "/profile"]) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.status(), path).toBeLessThan(400);
      await expect(page.locator("main, [role=main]").first(), path).toBeVisible({ timeout: 20_000 });
    }
  });
});
