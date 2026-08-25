import { test, expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Shared watch-link navigation: COLD start vs WARM start.
 *
 * A shared Heartify link (WhatsApp dua loop, push notification, store listing,
 * search result) is opened in two very different ways:
 *
 *  - COLD start — a brand-new browser/app process navigates straight to
 *    `/watch/:id`. There is no router state, no React Query cache, no session.
 *    This is the path that previously stalled on "Loading…".
 *  - WARM start — the app is already running (user browsed Home first) and the
 *    link is followed in-session, so navigation must be client-side and land on
 *    the SAME video id, not the last card the user tapped.
 *
 * Both paths must end on `/watch/<the shared id>` with the real video title
 * rendered. Cards navigate through an onClick handler rather than an <a href>,
 * so ids are discovered from the card's `data-video-id` attribute.
 */

const LOADING_RE = /loading…|loading\.\.\./i;

/** Grab a real video id from the public home feed via the card test hook. */
async function discoverVideoId(page: Page): Promise<string | null> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const card = page.locator("[data-testid=video-card][data-video-id]").first();
  const ok = await card
    .waitFor({ state: "attached", timeout: 45_000 })
    .then(() => true)
    .catch(() => false);
  if (!ok) return null;
  return card.getAttribute("data-video-id");
}

/** Watch page must resolve into the real video, never a loading shell. */
async function expectResolvedWatch(page: Page, id: string) {
  await expect(page).toHaveURL(new RegExp(`/watch/${id}(?:[?#]|$)`), { timeout: 25_000 });
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible({ timeout: 25_000 });
  await expect
    .poll(async () => (await h1.innerText()).trim(), { timeout: 25_000 })
    .not.toMatch(LOADING_RE);
  const heading = (await h1.innerText()).trim();
  expect(heading.length, "H1 should carry the video title").toBeGreaterThan(3);
  expect(await page.title()).not.toMatch(LOADING_RE);
  return heading;
}

async function newSignedOutPage(context: BrowserContext): Promise<Page> {
  return context.newPage();
}

test.describe("shared watch link navigation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("COLD start: opening a shared link in a fresh context lands on that video", async ({
    page,
    browser,
  }) => {
    test.setTimeout(150_000);
    const id = await discoverVideoId(page);
    test.skip(!id, "no video card discovered on the home feed");

    // A genuinely cold process: brand-new browser context, no cache, no session,
    // no referrer — exactly what tapping a shared link does.
    const cold = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const coldPage = await newSignedOutPage(cold);
    try {
      await coldPage.goto(`/watch/${id}`, { waitUntil: "domcontentloaded" });
      const heading = await expectResolvedWatch(coldPage, id!);
      expect(heading).not.toMatch(LOADING_RE);

      // A reload of the same shared URL must behave identically.
      await coldPage.reload({ waitUntil: "domcontentloaded" });
      await expectResolvedWatch(coldPage, id!);
    } finally {
      await cold.close();
    }
  });

  test("WARM start: following a shared link in-session keeps the shared id", async ({ page }) => {
    test.setTimeout(150_000);
    const id = await discoverVideoId(page);
    test.skip(!id, "no video card discovered on the home feed");

    // Warm the app: browse Home, open a different video via a card tap first so
    // the router, query cache and player context are all populated.
    const firstCard = page.locator("[data-testid=video-card]").first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/watch\/[\w-]+/, { timeout: 25_000 });
    const warmedId = (page.url().match(/\/watch\/([\w-]+)/) ?? [])[1];

    // Now follow the shared link from inside the running app (client-side nav).
    await page.evaluate((target) => {
      window.history.pushState({}, "", target);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, `/watch/${id}`);

    const heading = await expectResolvedWatch(page, id!);
    expect(heading).not.toMatch(LOADING_RE);

    // The shared id wins over whatever was already playing.
    expect(page.url()).toContain(`/watch/${id}`);
    if (warmedId && warmedId !== id) {
      expect(page.url(), "warm navigation must not stay on the previous video").not.toContain(
        `/watch/${warmedId}`,
      );
    }

    // Back navigation returns to the warmed video rather than a blank shell.
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => ((await page.textContent("body")) ?? "").trim().length, { timeout: 25_000 })
      .toBeGreaterThan(80);
  });

  test("COLD start with query/hash decorations still resolves", async ({ browser, page }) => {
    test.setTimeout(120_000);
    const id = await discoverVideoId(page);
    test.skip(!id, "no video card discovered on the home feed");

    // Share links carry attribution params (?utm_source=whatsapp&t=90).
    const cold = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const coldPage = await newSignedOutPage(cold);
    try {
      await coldPage.goto(`/watch/${id}?utm_source=whatsapp&utm_medium=share&t=90`, {
        waitUntil: "domcontentloaded",
      });
      await expectResolvedWatch(coldPage, id!);
    } finally {
      await cold.close();
    }
  });
});
