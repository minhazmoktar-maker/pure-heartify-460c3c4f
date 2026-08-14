/**
 * Deep-link / share regression suite.
 *
 * Shared watch URLs are opened by signed-out visitors, push notifications and
 * crawlers — with no router state and no session. Regressions here previously
 * left the page stuck on "Loading…" with no title/H1/SEO tags (the public read
 * policy on curated videos was unreachable for anonymous visitors).
 *
 * These tests fail the pipeline on any "Loading…" regression.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const LOADING_RE = /loading…|loading\.\.\./i;

/** Discover a real watch id from the public home feed. */
async function discoverWatchHref(page: Page): Promise<string | null> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const link = page.locator('a[href^="/watch/"]').first();
  await link.waitFor({ state: "attached", timeout: 45_000 }).catch(() => undefined);
  return link.getAttribute("href").catch(() => null);
}

/** Fresh, signed-out context: no localStorage session, no router state. */
async function openSignedOut(context: BrowserContext, href: string) {
  const page = await context.newPage();
  // Cold navigation — exactly what a shared link does.
  await page.goto(href, { waitUntil: "domcontentloaded" });
  return page;
}

async function watchMeta(page: Page) {
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible({ timeout: 20_000 });
  await expect(h1).not.toHaveText(LOADING_RE, { timeout: 20_000 });

  const title = await page.title();
  const heading = (await h1.innerText()).trim();
  const description = await page
    .locator('meta[name="description"]')
    .first()
    .getAttribute("content");
  const canonical = await page
    .locator('link[rel="canonical"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  const ogTitle = await page
    .locator('meta[property="og:title"]')
    .first()
    .getAttribute("content")
    .catch(() => null);
  return { title, heading, description, canonical, ogTitle };
}

test.describe("deep-linked /watch/:id for signed-out visitors", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("renders title, H1 and SEO tags without a session", async ({ page, context }) => {
    const href = await discoverWatchHref(page);
    test.skip(!href, "no watch link discovered on the home feed");

    const deep = await openSignedOut(context, href!);
    try {
      const meta = await watchMeta(deep);

      // H1 is the real video title, not a placeholder.
      expect(meta.heading, "H1 must not be a loading placeholder").not.toMatch(LOADING_RE);
      expect(meta.heading.length, "H1 should carry the video title").toBeGreaterThan(3);

      // Document title reflects the video and is not the generic app title.
      expect(meta.title, "document title must not be a loading placeholder").not.toMatch(
        LOADING_RE,
      );
      expect(meta.title.length).toBeGreaterThan(3);

      // SEO tags are emitted for the route.
      expect(meta.description ?? "", "meta description must be present").not.toMatch(
        LOADING_RE,
      );
      expect((meta.description ?? "").length, "meta description must be present").toBeGreaterThan(
        10,
      );
      expect(meta.ogTitle ?? meta.title, "og:title must be present").toBeTruthy();
      if (meta.canonical) {
        expect(meta.canonical, "canonical should self-reference the watch route").toContain(
          "/watch/",
        );
      }
    } finally {
      await deep.close();
    }
  });

  test("reload of a shared link keeps metadata (no Loading… regression)", async ({
    page,
    context,
  }) => {
    const href = await discoverWatchHref(page);
    test.skip(!href, "no watch link discovered on the home feed");

    const deep = await openSignedOut(context, href!);
    try {
      await watchMeta(deep);
      await deep.reload({ waitUntil: "domcontentloaded" });
      const after = await watchMeta(deep);
      expect(after.heading).not.toMatch(LOADING_RE);

      // Nothing anywhere in the visible page is still a loading placeholder
      // once metadata has resolved.
      const body = (await deep.locator("body").innerText()).toLowerCase();
      expect(body, "page still shows a loading placeholder after resolve").not.toMatch(
        LOADING_RE,
      );
    } finally {
      await deep.close();
    }
  });

  test("unknown video id degrades gracefully instead of hanging on Loading…", async ({
    context,
  }) => {
    const deep = await openSignedOut(context, "/watch/zzzzNotARealId");
    try {
      await deep.waitForTimeout(6000);
      const heading = (await deep.locator("h1").first().innerText().catch(() => "")).trim();
      expect(heading, "unknown ids must not hang on a loading placeholder").not.toMatch(
        LOADING_RE,
      );
    } finally {
      await deep.close();
    }
  });
});
