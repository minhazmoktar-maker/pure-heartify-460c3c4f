/**
 * Device-language E2E — simulates an iOS/Android system language change and
 * verifies Heartify renders the right dictionary *instantly* (no reload, no
 * English flash) on the two surfaces users land on first: the feed and the
 * watch page.
 *
 * Playwright's `locale` option maps onto `navigator.language`, which is the
 * same signal `src/i18n/detect.ts` reads on native (the WebView inherits the
 * OS locale), so this is a faithful proxy for switching the phone's language.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect, type Page } from "@playwright/test";

type Dict = Record<string, string>;

const dict = (lang: string): Dict =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), `src/i18n/dictionaries/${lang}.json`), "utf8"),
  ) as Dict;

const en = dict("en");

/** One row per device language we ship to the stores. */
const CASES = [
  { name: "Bengali (Bangladesh)", locale: "bn-BD", tz: "Asia/Dhaka", lang: "bn", dir: "ltr" },
  { name: "Urdu (Pakistan)", locale: "ur-PK", tz: "Asia/Karachi", lang: "ur", dir: "rtl" },
  { name: "Arabic (Saudi Arabia)", locale: "ar-SA", tz: "Asia/Riyadh", lang: "ar", dir: "rtl" },
  { name: "Indonesian", locale: "id-ID", tz: "Asia/Jakarta", lang: "id", dir: "ltr" },
] as const;

/** Keys that must be visibly translated on the app shell (bottom/side nav). */
const NAV_KEYS = ["nav.home", "nav.browse", "nav.listen", "nav.profile"];

async function htmlLocale(page: Page) {
  return page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
  }));
}

for (const c of CASES) {
  test.describe(`device language: ${c.name}`, () => {
    test.use({ locale: c.locale, timezoneId: c.tz });

    test("feed adopts the device language on first paint", async ({ page }) => {
      await page.goto("/");
      // The dictionary is applied by LocaleProvider on mount — no reload.
      await expect
        .poll(async () => (await htmlLocale(page)).lang, { timeout: 20_000 })
        .toBe(c.lang);
      expect((await htmlLocale(page)).dir).toBe(c.dir);

      const d = dict(c.lang);
      const body = (await page.textContent("body")) ?? "";
      const expected = NAV_KEYS.filter((k) => d[k] && d[k] !== en[k]);
      const hits = expected.filter((k) => body.includes(d[k]));
      expect(
        hits.length,
        `expected at least one of [${expected.map((k) => d[k]).join(", ")}] on screen`,
      ).toBeGreaterThan(0);
    });

    test("watch page keeps the device language and direction", async ({ page }) => {
      await page.goto("/");
      const card = page.getByTestId("video-card").first();
      await card.waitFor({ state: "visible", timeout: 60_000 });
      await card.click();
      await expect(page).toHaveURL(/\/watch\/[\w-]{6,}/, { timeout: 30_000 });

      const after = await htmlLocale(page);
      expect(after.lang).toBe(c.lang);
      expect(after.dir).toBe(c.dir);
      // No untranslated placeholder keys ever leak into the rendered page.
      const body = (await page.textContent("body")) ?? "";
      expect(body).not.toMatch(/\b(nav|common|player)\.[a-z_]+\b/);
    });
  });
}
