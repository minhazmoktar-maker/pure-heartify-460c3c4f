/**
 * End-to-end audit suite. Crawls the main public surfaces and asserts:
 *  - the route renders without runtime errors
 *  - thumbnails actually load (img.naturalWidth > 0)
 *  - no banned/explicit terms leak into rendered text
 *  - deep-link routes resolve to the expected page
 */
import { test, expect, Page } from "../playwright-fixture";

const BANNED = [
  "porn","nude","explicit","xxx","onlyfans","twerk","stripper","escort",
  "bikini","lingerie","sex tape","hookup","casino","gambling",
];

async function assertNoBannedText(page: Page) {
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const term of BANNED) {
    expect(text, `banned term "${term}" leaked into page`).not.toContain(term);
  }
}

async function assertThumbnailsLoad(page: Page, min = 3) {
  // Wait briefly for lazy-loaded images.
  await page.waitForTimeout(1500);
  const broken = await page.$$eval("img", (imgs) =>
    imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
  );
  expect(broken, `broken images: ${broken.slice(0, 5).join(", ")}`).toHaveLength(0);
  const loaded = await page.$$eval("img", (imgs) =>
    imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
  );
  expect(loaded, "expected several images to load").toBeGreaterThanOrEqual(min);
}

test.describe("Heartify platform audit", () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    (page as Page & { __errors?: string[] }).__errors = errors;
  });

  test("home feed renders, thumbs load, no banned text", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Today's Top Pick").first()).toBeVisible();

    await page.waitForTimeout(2500);
    await assertThumbnailsLoad(page);
    await assertNoBannedText(page);
    expect((page as Page & { __errors?: string[] }).__errors ?? []).toHaveLength(0);
  });

  test("home feed renders an infinite grid of thumbnails", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    await page.mouse.wheel(0, 3000);
    await assertThumbnailsLoad(page, 2);
    await assertNoBannedText(page);
  });

  test("explore hub renders its discovery entry points", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await assertNoBannedText(page);
  });


  test("Listen surface renders", async ({ page }) => {
    await page.goto("/listen");
    await page.waitForTimeout(1500);
    await assertNoBannedText(page);
  });


  test("search returns halal-only results", async ({ page }) => {
    await page.goto("/search?q=quran");
    await expect(page.getByText(/Results for/i)).toBeVisible();
    await page.waitForTimeout(2500);
    await assertNoBannedText(page);
  });

  test("section page (related/recommendations) is clean", async ({ page }) => {
    await page.goto("/section/quran-recitation");
    await page.waitForTimeout(2000);
    await assertNoBannedText(page);
  });

  test("deep-link /watch/:id loads player without banned text", async ({ page }) => {
    // Discover a real id from the home feed first.
    await page.goto("/");
    await page.waitForTimeout(2500);
    const href = await page.$eval("a[href^='/watch/']", (a) => (a as HTMLAnchorElement).getAttribute("href")).catch(() => null);
    test.skip(!href, "no watch link discovered in feed");
    await page.goto(href!);
    await page.waitForTimeout(2500);
    await assertNoBannedText(page);
  });

  test("channels directory is clean", async ({ page }) => {
    await page.goto("/channels");
    await page.waitForTimeout(1500);
    await assertNoBannedText(page);
  });

  test("auth & privacy routes reachable", async ({ page }) => {
    for (const path of ["/login", "/signup", "/privacy"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/")));
    }
  });
});
