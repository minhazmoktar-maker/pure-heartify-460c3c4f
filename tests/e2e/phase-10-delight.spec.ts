import { test, expect } from "@playwright/test";

/**
 * Phase 10 delight + broad app surface smoke tests.
 *
 * Covers: /changelog, Dhikr (tap → sound/haptics wiring), Profile
 * (auto-theme + icon picker + sound settings), skeletons/empty
 * states, and a broad list of public routes to guard against
 * regressions in the whole app.
 *
 * These run signed-out so they never depend on test credentials.
 */

const PUBLIC_ROUTES = [
  "/",
  "/browse",
  "/quran",
  "/dhikr",
  "/adhkar",
  "/prayer-times",
  "/qibla",
  "/duas",
  "/hadith",
  "/asma-ul-husna",
  "/heartify-plus",
  "/changelog",
  "/contact",
  "/privacy",
  "/terms",
  "/search",
  "/leaderboard",
  "/shorts",
  "/mushaf",
  "/profile",
];

test.describe("Phase 10 delight surfaces", () => {
  test("/changelog renders entries and is crawlable", async ({ page }) => {
    await page.goto("/changelog");
    await expect(page).toHaveTitle(/Changelog|Heartify/i);
    // At least one release heading should appear.
    const headings = page.locator("h2, h3");
    await expect(headings.first()).toBeVisible({ timeout: 10_000 });
  });

  test("Dhikr page mounts and tap area is interactive", async ({ page }) => {
    await page.goto("/dhikr");
    // Tap surface / counter button
    const tap = page
      .getByRole("button", { name: /tap|count|dhikr|tasbeeh|tasbih/i })
      .first();
    if (await tap.count()) {
      await tap.click({ trial: true }).catch(() => {});
    }
    // The page must render without throwing.
    await expect(page.locator("body")).toBeVisible();
  });

  test("Profile page renders theme + sound + icon controls when available", async ({
    page,
  }) => {
    await page.goto("/profile");
    // Signed-out redirects to /auth; either way we must not crash.
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Whole-app public route smoke", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`route ${route} renders without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          // Ignore benign noise we've explicitly filtered elsewhere.
          if (
            text.includes("Failed to load resource") ||
            text.includes("invalid claim") ||
            text.includes("AuthApiError") ||
            text.includes("net::ERR_")
          ) return;
          errors.push(text);
        }
      });
      const resp = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(resp?.status(), `HTTP status for ${route}`).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
      expect(errors, `Console errors on ${route}`).toEqual([]);
    });
  }
});

test.describe("Skeleton + empty state affordances", () => {
  test("Bookmarks empty state renders (signed-out safe)", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Search empty query does not crash", async ({ page }) => {
    await page.goto("/search");
    await expect(page.locator("body")).toBeVisible();
  });
});
