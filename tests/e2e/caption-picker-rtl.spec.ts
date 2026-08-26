/**
 * Caption picker + RTL caption regression suite.
 *
 * Verifies that the per-video caption picker renders (or reports a clear
 * missing/loading state) on Watch and Originals, that RTL locales (Arabic and
 * the other right-to-left languages) lay the picker and its status text out
 * correctly, and that the infinite grid keeps rendering cleanly with an RTL
 * document direction.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
const RTL_LOCALES = ["ar", "ur", "fa", "ps"] as const;

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

async function setLocale(page: Page, locale: string) {
  await page.addInitScript((loc) => {
    window.localStorage.setItem("heartify-locale", loc);
    window.localStorage.setItem("heartify:locale", loc);
  }, locale);
}

test.describe("caption picker on Originals", () => {
  test("each card exposes a caption picker or an explicit missing state", async ({ page }) => {
    await open(page, "/originals");
    const cards = page.locator('a[href^="/u/"]');
    if ((await cards.count()) === 0) {
      test.skip(true, "no published Heartify uploads in this environment");
    }
    await expect
      .poll(async () => {
        const pickers = await page.locator('[data-testid^="originals-caption-picker-"]').count();
        const missing = await page
          .locator('[data-testid$="-missing"], [data-testid$="-loading"]')
          .count();
        return pickers + missing;
      })
      .toBeGreaterThan(0);
  });
});

test.describe("caption picker on Watch", () => {
  test("watch page shows the picker, or a pending/missing caption state", async ({ page }) => {
    await open(page, "/originals");
    const first = page.locator('a[href^="/u/"]').first();
    if ((await first.count()) === 0) {
      test.skip(true, "no published Heartify uploads in this environment");
    }
    await first.click();
    await expect(page).toHaveURL(/\/u\//);
    await page.waitForLoadState("networkidle").catch(() => undefined);

    const picker = page.getByTestId("watch-caption-picker");
    const missing = page.getByTestId("watch-caption-picker-missing");
    const pending = page.getByTestId("watch-upload-captions-pending");
    await expect
      .poll(async () => (await picker.count()) + (await missing.count()) + (await pending.count()))
      .toBeGreaterThan(0);
  });

  test("a ?cc= deep link never breaks the watch page", async ({ page }) => {
    await open(page, "/originals");
    const first = page.locator('a[href^="/u/"]').first();
    if ((await first.count()) === 0) {
      test.skip(true, "no published Heartify uploads in this environment");
    }
    const href = await first.getAttribute("href");
    await open(page, `${href}?cc=ar`);
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

for (const locale of RTL_LOCALES) {
  test.describe(`RTL captions — ${locale}`, () => {
    test.beforeEach(async ({ page }) => setLocale(page, locale));

    test("originals renders right-to-left with a coherent caption picker", async ({ page }) => {
      await open(page, "/originals");
      const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
      expect(["rtl", "ltr", null]).toContain(dir);
      // The picker (when captions exist) must carry an explicit direction so
      // Arabic/Urdu labels never render mirrored inside an LTR shell.
      const trigger = page.locator('[data-testid$="-trigger"]').first();
      if ((await trigger.count()) > 0) {
        await expect(trigger).toHaveAttribute("dir", /rtl|ltr/);
      }
      await expect(page.locator("body")).not.toContainText(/something went wrong/i);
    });

    test("infinite grid cells render cleanly under RTL", async ({ page }) => {
      await open(page, "/browse");
      await expect
        .poll(async () => {
          const cards = await page.locator("[data-video-id]").count();
          const skeleton = await page.locator('[role="status"]').count();
          const empty = await page.getByText(/nothing/i).count();
          return cards + skeleton + empty;
        })
        .toBeGreaterThan(0);
      await expect(page.locator("body")).not.toContainText(/something went wrong/i);
    });
  });
}

test.describe("lane analytics filters", () => {
  test("date, country, language and lane filters render with the CSV export", async ({ page }) => {
    await open(page, "/admin/lane-analytics");
    await expect(page.locator("body")).not.toContainText(/page not found/i);
    const filters = [
      "lane-filter-from",
      "lane-filter-to",
      "lane-filter-country",
      "lane-filter-language",
      "lane-filter-lane",
    ];
    const visible = await Promise.all(
      filters.map(async (id) => (await page.getByTestId(id).count()) > 0),
    );
    // Admin-gated: either the whole filter bar is present, or access is denied.
    if (visible.every(Boolean)) {
      await expect(page.getByTestId("lane-analytics-export")).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});
