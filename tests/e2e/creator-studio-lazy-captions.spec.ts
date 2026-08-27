/**
 * Regression coverage for two QA findings:
 *
 * 1. "Playback unavailable." must never render while the signed playback URL is
 *    still loading on /u/:id — it is a post-failure fallback, not a loading state.
 * 2. Creator Studio must not call the `creator-media-url` edge function per
 *    upload on page load — the caption panels are only mounted when a review
 *    <details> section is explicitly opened.
 */
import { test, expect } from "../playwright-fixture";

test("watch-upload never shows Playback unavailable alongside the spinner", async ({ page }) => {
  // Hold the signed-URL request open so the loading state is observable.
  await page.route("**/functions/v1/creator-media-url", async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "", thumbnail_url: null, expires_in: 3600 }),
    });
  });

  await page.goto("/u/00000000-0000-0000-0000-000000000000");
  // While loading, the fallback copy must be absent.
  await expect(page.getByText("Playback unavailable.")).toHaveCount(0);
});

test("creator studio fires no per-upload playback requests until a panel opens", async ({ page }) => {
  const mediaUrlCalls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("creator-media-url")) mediaUrlCalls.push(req.url());
  });

  await page.goto("/studio");
  await page.waitForLoadState("networkidle");
  expect(mediaUrlCalls).toHaveLength(0);

  const details = page.locator('[data-testid^="caption-review-details-"]').first();
  if (await details.count()) {
    await details.locator("summary").click();
    // Panel mounts only now; at most one request, for the opened upload.
    await page.waitForTimeout(1500);
    expect(mediaUrlCalls.length).toBeLessThanOrEqual(1);
  }
});
