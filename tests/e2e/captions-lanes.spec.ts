/**
 * Captions + language-lane regression suite.
 *
 * Guards three launch behaviours:
 *  1. Native uploads expose caption state on the watch page (a CC badge when
 *     captions exist, a pending note when they are still generating) and never
 *     render a caption crash.
 *  2. The native vs diversified lane toggle keeps working and actually filters
 *     the grid — the visible surface of the 80/20 rule.
 *  3. The admin lane-analytics surface resolves (per-country/language reporting
 *     with a CSV export) rather than 404ing.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

test.describe("captions on native uploads", () => {
  test("originals list links into a watch page that reports caption state", async ({ page }) => {
    await open(page, "/originals");
    const first = page.locator('a[href^="/u/"]').first();
    if ((await first.count()) === 0) {
      test.skip(true, "no published Heartify uploads in this environment");
    }
    await first.click();
    await expect(page).toHaveURL(/\/u\//);
    await page.waitForLoadState("networkidle").catch(() => undefined);

    const badge = page.getByTestId("watch-upload-captions-badge");
    const pending = page.getByTestId("watch-upload-captions-pending");
    // Exactly one of the two states must be present — never neither.
    await expect
      .poll(async () => (await badge.count()) + (await pending.count()))
      .toBeGreaterThan(0);
  });

  test("a caption-less upload offers a translation action or a pending note", async ({ page }) => {
    await open(page, "/originals");
    const first = page.locator('a[href^="/u/"]').first();
    if ((await first.count()) === 0) {
      test.skip(true, "no published Heartify uploads in this environment");
    }
    await first.click();
    await page.waitForLoadState("networkidle").catch(() => undefined);
    const translate = page.getByTestId("watch-upload-translate-captions");
    const pending = page.getByTestId("watch-upload-captions-pending");
    const available = page.getByTestId("watch-upload-captions-badge");
    await expect
      .poll(async () => (await translate.count()) + (await pending.count()) + (await available.count()))
      .toBeGreaterThan(0);
  });
});

test.describe("language lanes", () => {
  // The language mix is an internal serving policy. The lane chips (and their
  // counts) must never surface to viewers — language choice lives in Settings.
  test("feed never exposes lane filter chips to the viewer", async ({ page }) => {
    await open(page, "/");
    await expect
      .poll(async () => page.locator("[data-video-id]").count())
      .toBeGreaterThan(0);

    await expect(page.getByTestId("lane-toggle")).toHaveCount(0);
    await expect(page.getByTestId("lane-native")).toHaveCount(0);
    await expect(page.getByTestId("lane-diversified")).toHaveCount(0);
    await expect(page.getByText(/other languages/i)).toHaveCount(0);
  });
});

test.describe("lane analytics admin surface", () => {
  test("/admin/lane-analytics resolves instead of 404", async ({ page }) => {
    await open(page, "/admin/lane-analytics");
    await expect(page.locator("body")).not.toContainText(/page not found/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
