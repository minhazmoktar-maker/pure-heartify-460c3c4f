/**
 * Signed playback URL caching + abort behaviour in Creator Studio.
 *
 * 1. Opening a review panel, closing it and reopening it within the 45-minute
 *    cache TTL must not issue a second `creator-media-url` request, and the
 *    player must still render with a working source.
 * 2. Closing the <details> while playback/captions are still in flight must
 *    abort those requests and produce no late UI updates (no video, no
 *    "This video isn't available." error appearing after the panel is gone).
 */
import { test, expect } from "../playwright-fixture";

const UPLOAD_ID = "11111111-1111-1111-1111-111111111111";

test("reopening a review panel within the cache TTL makes no extra creator-media-url call", async ({
  page,
}) => {
  const calls: number[] = [];
  await page.route("**/functions/v1/creator-media-url", async (route) => {
    calls.push(Date.now());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ url: "https://example.invalid/video.mp4", expires_in: 3600 }),
    });
  });

  await page.goto("/studio");

  const details = page.getByTestId(`caption-review-details-${UPLOAD_ID}`);
  if ((await details.count()) === 0) {
    // Signed-out / no uploads for this environment: the cache invariant is
    // covered by the unit tests; there is nothing to drive here.
    test.skip(true, "no reviewable upload available in this environment");
    return;
  }

  await details.locator("summary").click();
  await expect(page.getByTestId(`caption-review-body-${UPLOAD_ID}`)).toBeVisible();
  await expect.poll(() => calls.length).toBe(1);

  // Close and reopen — the memoised signed URL must be reused.
  await details.locator("summary").click();
  await expect(page.getByTestId(`caption-review-body-${UPLOAD_ID}`)).toHaveCount(0);
  await details.locator("summary").click();
  await expect(page.getByTestId(`caption-review-body-${UPLOAD_ID}`)).toBeVisible();
  await page.waitForTimeout(1000);
  expect(calls.length).toBe(1);

  const metrics = await page.evaluate(
    () => (window as unknown as { __heartifyPlaybackUrlMetrics?: { hits: number } }).__heartifyPlaybackUrlMetrics,
  );
  expect(metrics?.hits ?? 0).toBeGreaterThan(0);
});

test("closing the panel mid-flight aborts playback and caption requests", async ({ page }) => {
  let aborted = false;
  let lateResponses = 0;

  await page.route("**/functions/v1/creator-media-url", async (route) => {
    try {
      await new Promise((r) => setTimeout(r, 4000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ url: "https://example.invalid/video.mp4", expires_in: 3600 }),
      });
      lateResponses += 1;
    } catch {
      aborted = true; // request was cancelled by the client
    }
  });

  await page.goto("/studio");
  const details = page.getByTestId(`caption-review-details-${UPLOAD_ID}`);
  if ((await details.count()) === 0) {
    test.skip(true, "no reviewable upload available in this environment");
    return;
  }

  await details.locator("summary").click();
  await page.waitForTimeout(400); // request in flight, still loading
  await details.locator("summary").click(); // close while loading

  // Panel is unmounted: no late error/player state may appear anywhere.
  await page.waitForTimeout(4500);
  await expect(page.getByTestId(`caption-review-body-${UPLOAD_ID}`)).toHaveCount(0);
  await expect(page.getByText("This video isn't available.")).toHaveCount(0);
  expect(aborted || lateResponses === 0).toBeTruthy();
});
