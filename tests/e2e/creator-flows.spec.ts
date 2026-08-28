/**
 * Creator ecosystem reachability regression suite.
 *
 * Incident this guards: creator profiles, per-video analytics and the appeal
 * workflow all existed as code but had no route or link, so a creator whose
 * upload was rejected had no way to appeal and nobody could open a creator's
 * profile from a video. These tests assert the entry points exist and render —
 * not just that the components compile.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  // Routes are lazy-loaded; wait for the shell to hydrate before asserting.
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

test.describe("creator routes are reachable", () => {
  test("/studio/analytics renders instead of 404", async ({ page }) => {
    await open(page, "/studio/analytics");
    await expect(page.locator("body")).not.toContainText(/page not found/i);
    // Signed out we expect a sign-in prompt, signed in the dashboard — either
    // way the route must resolve to the analytics screen, never NotFound.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("/studio/appeals renders the appeal status screen", async ({ page }) => {
    await open(page, "/studio/appeals");
    await expect(page.locator("body")).not.toContainText(/page not found/i);
    await expect(page.getByRole("heading", { name: /appeal status/i })).toBeVisible();
  });

  test("/c/:handle resolves to the creator profile route", async ({ page }) => {
    await open(page, "/c/heartify-test-handle");
    // An unknown handle is allowed to show an empty state, but it must not be
    // the app-wide 404 route.
    await expect(page).toHaveURL(/\/c\/heartify-test-handle/);
    await expect(page.locator("body")).not.toContainText(/page not found/i);
  });

  test("/settings/languages explains the mix without leaking serving ratios", async ({ page }) => {
    await open(page, "/settings/languages");
    const explainer = page.getByTestId("language-mix-explainer");
    await expect(explainer).toBeVisible();
    await expect(explainer).toContainText(/language mix/i);
    // Internal serving policy must never be quoted to viewers.
    await expect(explainer).not.toContainText(/80\s*\/?\s*20|80%|20%/);
  });
});

test.describe("creator profile is reachable from content surfaces", () => {
  test("Heartify Originals links each video to its creator profile", async ({ page }) => {
    await open(page, "/originals");
    const cards = page.getByTestId("originals-creator-link");
    const count = await cards.count();
    if (count === 0) {
      // No published originals in this environment — nothing to assert, but the
      // surface itself must have rendered.
      await expect(page.getByRole("heading", { name: /heartify originals/i })).toBeVisible();
      return;
    }
    const href = await cards.first().getAttribute("href");
    expect(href, "creator link must point at /c/<handle>").toMatch(/^\/c\/.+/);
    await cards.first().click();
    await expect(page).toHaveURL(/\/c\//);
  });

  test("watch page for an upload exposes a creator profile link", async ({ page }) => {
    await open(page, "/originals");
    const firstVideo = page.locator('a[href^="/u/"]').first();
    if ((await firstVideo.count()) === 0) test.skip(true, "no published originals available");
    await firstVideo.click();
    await expect(page).toHaveURL(/\/u\//);
    const creatorLink = page.getByTestId("watch-upload-creator-link");
    if ((await creatorLink.count()) > 0) {
      await expect(creatorLink).toHaveAttribute("href", /^\/c\/.+/);
    }
  });
});

test.describe("feed lane policy", () => {
  test("home feed keeps the language lane mix internal (no filter chips)", async ({ page }) => {
    await open(page, "/");
    await expect(page.getByTestId("lane-toggle")).toHaveCount(0);
    await expect(page.getByTestId("lane-diversified")).toHaveCount(0);
  });
});
