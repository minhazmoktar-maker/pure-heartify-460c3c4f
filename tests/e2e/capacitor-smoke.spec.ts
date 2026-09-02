/**
 * Capacitor pre-build smoke test.
 *
 * Verifies the three flows we cannot afford to ship broken to a native shell:
 *   1. Login page renders and the auth form is interactive
 *   2. Home feed loads curated video content
 *   3. A video route mounts the embedded player (no external YouTube redirect)
 *
 * Run automatically via `npm run cap:smoke` before `npx cap sync`.
 */
import { test, expect, Page } from "../../playwright-fixture";

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:8080";

/**
 * Hard guard: fail the test if the top-level page ever navigates away from
 * the embedded in-app player. Any redirect to youtube.com/watch, m.youtube.com,
 * or youtu.be is a policy violation, even under retries or slow loads.
 */
function installPlaybackOriginGuard(page: Page) {
  const violations: string[] = [];
  const forbidden = [
    /https?:\/\/(www\.|m\.)?youtube\.com\/watch/i,
    /https?:\/\/youtu\.be\//i,
  ];
  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    const url = frame.url();
    if (forbidden.some((re) => re.test(url))) violations.push(url);
  });
  page.on("popup", (popup) => {
    const url = popup.url();
    if (forbidden.some((re) => re.test(url))) violations.push(`popup:${url}`);
  });
  return {
    assertClean: () =>
      expect(
        violations,
        `top-level navigation left the embedded player: ${violations.join(", ")}`,
      ).toHaveLength(0),
  };
}

test.describe("Capacitor smoke", () => {
  test("login page is interactive", async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await expect(page.getByPlaceholder("Email address")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });

  test("home feed loads curated videos", async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    // Wait for at least one video thumbnail (curated sections or infinite grid)
    const thumb = page.locator('img[src*="ytimg.com"], img[src*="youtube.com"]').first();
    await expect(thumb).toBeVisible({ timeout: 30_000 });
    // Confirm at least a few video cards rendered
    const count = await page.locator('img[src*="ytimg.com"], img[src*="youtube.com"]').count();
    expect(count).toBeGreaterThan(3);
  });

  test("blocked creators never appear on any surface", async ({ page }) => {
    const BLOCKED = ["mia yilin", "leila hormozi", "layla hormozi", "mehreen"];
    const routes = ["/", "/search?q=discipline", "/search?q=motivation", "/channels"];
    for (const route of routes) {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      const text = (await page.locator("body").innerText()).toLowerCase();
      for (const term of BLOCKED) {
        expect(text, `blocked creator "${term}" leaked into ${route}`).not.toContain(term);
      }
    }
  });


  test("home feed loads more videos on scroll without leaving the app", async ({ page }) => {
    const guard = installPlaybackOriginGuard(page);
    // The home route *is* the browsable feed; there is no separate Browse tab.
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const thumbSel = 'img[src*="ytimg.com"], img[src*="youtube.com"]';
    await page.locator(thumbSel).first().waitFor({ state: "visible", timeout: 30_000 });
    const initial = await page.locator(thumbSel).count();

    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 4000);
      await page.waitForTimeout(600);
    }

    await page.waitForFunction(
      ({ sel, initial }) => document.querySelectorAll(sel).length > initial,
      { sel: thumbSel, initial },
      { timeout: 20_000 },
    );
    const after = await page.locator(thumbSel).count();
    expect(after).toBeGreaterThan(initial);
    guard.assertClean();
  });

  test("video playback uses embedded in-app player and never navigates away", async ({ page }) => {
    const guard = installPlaybackOriginGuard(page);
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const firstCard = page.locator('a[href^="/watch/"]').first();
    await firstCard.waitFor({ state: "visible", timeout: 30_000 });
    await firstCard.click();
    await page.waitForURL(/\/watch\/.+/, { timeout: 15_000 });

    const iframe = page.locator('iframe[src*="youtube-nocookie.com/embed/"]');
    await expect(iframe).toBeVisible({ timeout: 15_000 });
    const src = await iframe.getAttribute("src");
    expect(src).toContain("rel=0");
    expect(src).toContain("modestbranding=1");

    // Simulate a slow load / retry: wait, then re-verify the embed is still the source of truth.
    await page.waitForTimeout(4000);
    await expect(iframe).toBeVisible();
    const srcAfter = await iframe.getAttribute("src");
    expect(srcAfter).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\//);

    // Attempt to interact with the player area; must not navigate off the embed.
    await iframe.click({ trial: true }).catch(() => undefined);
    await page.waitForTimeout(1500);

    expect(page.url()).not.toContain("youtube.com/watch");
    expect(page.url()).not.toContain("youtu.be/");
    guard.assertClean();
  });
});
