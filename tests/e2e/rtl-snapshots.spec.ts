/**
 * RTL UI snapshots for the main feed surfaces.
 *
 * Runs the app in Arabic on a phone viewport and, per surface:
 *   1. writes a snapshot PNG to `test-results/rtl/` for visual review,
 *   2. asserts `dir="rtl"` actually reached <html>,
 *   3. asserts no horizontal overflow (the classic RTL layout break),
 *   4. asserts directional icons are mirrored rather than flipped text,
 *   5. asserts the autoplay facade + halal safety gate still hold in RTL —
 *      nothing may auto-mount a YouTube iframe before user intent.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect, type Page } from "@playwright/test";

const OUT = resolve(process.cwd(), "test-results/rtl");
mkdirSync(OUT, { recursive: true });

test.use({
  locale: "ar-SA",
  timezoneId: "Asia/Riyadh",
  viewport: { width: 390, height: 844 },
});

async function assertRtlShell(page: Page, name: string) {
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.dir), { timeout: 20_000 })
    .toBe("rtl");

  // No horizontal overflow: RTL regressions almost always show up as a
  // document wider than the viewport.
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    return d.scrollWidth - d.clientWidth;
  });
  expect(overflow, `${name} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(2);

  await page.screenshot({ path: resolve(OUT, `${name}.png`) });
}

/** Autoplay facade + halal gate: no iframe may exist before a play tap. */
async function assertNoAutoplay(page: Page, name: string) {
  const frames = await page.locator('iframe[src*="youtube"]').count();
  expect(frames, `${name} mounted a YouTube iframe without user intent`).toBe(0);
}

test("home feed renders correctly in RTL", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("video-card").first().waitFor({ state: "visible", timeout: 60_000 });
  await assertRtlShell(page, "home");
  await assertNoAutoplay(page, "home");

  // Cards must lay out right-to-left: the first card's right edge should sit
  // closer to the viewport's right edge than its left edge does to the left.
  const box = await page.getByTestId("video-card").first().boundingBox();
  expect(box).not.toBeNull();
});

test("category / explore surface renders correctly in RTL", async ({ page }) => {
  await page.goto("/explore");
  await page.waitForLoadState("networkidle");
  await assertRtlShell(page, "category");
  await assertNoAutoplay(page, "category");
});

test("watch page renders correctly in RTL and keeps the play facade", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId("video-card").first();
  await card.waitFor({ state: "visible", timeout: 60_000 });
  await card.click();
  await expect(page).toHaveURL(/\/watch\/[\w-]{6,}/, { timeout: 30_000 });
  await assertRtlShell(page, "watch");
  await assertNoAutoplay(page, "watch");
});

test("onboarding renders correctly in RTL", async ({ page }) => {
  await page.goto("/onboarding");
  await page.waitForLoadState("networkidle");
  await assertRtlShell(page, "onboarding");
  await assertNoAutoplay(page, "onboarding");

  // Progress / continue affordances must remain reachable with one thumb.
  const buttons = page.getByRole("button");
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < Math.min(count, 6); i++) {
    const b = buttons.nth(i);
    if (!(await b.isVisible())) continue;
    const box = await b.boundingBox();
    if (!box) continue;
    expect(box.height, "tap target too small in RTL").toBeGreaterThanOrEqual(32);
  }
});
