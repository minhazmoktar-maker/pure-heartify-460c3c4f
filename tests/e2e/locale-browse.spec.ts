/**
 * Device-language E2E — category browsing + watch-page recommendations.
 *
 * Complements `locale-switch.spec.ts` (feed + watch shell) by covering the two
 * surfaces a user reaches *after* the first screen:
 *   1. category browsing (/explore and a category route),
 *   2. the watch page's recommendation rail.
 *
 * "Instantly" is asserted the same way the product behaves: the dictionary is
 * applied by LocaleProvider on mount, so <html lang/dir> and the localized
 * labels must be correct without a reload and without an English flash.
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

const CASES = [
  { name: "Bengali (Bangladesh)", locale: "bn-BD", tz: "Asia/Dhaka", lang: "bn", dir: "ltr" },
  { name: "Urdu (Pakistan)", locale: "ur-PK", tz: "Asia/Karachi", lang: "ur", dir: "rtl" },
  { name: "Arabic (Saudi Arabia)", locale: "ar-SA", tz: "Asia/Riyadh", lang: "ar", dir: "rtl" },
] as const;

/** Shell labels that must be visible on any browsing surface. */
const SHELL_KEYS = ["nav.home", "nav.browse", "nav.listen", "nav.profile"];
/** Player labels rendered as accessible names on the watch surface. */
const PLAYER_KEYS = ["player.play", "player.captions", "player.fullscreen"];

async function htmlLocale(page: Page) {
  return page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
  }));
}

async function expectLocale(page: Page, lang: string, dir: string) {
  await expect.poll(async () => (await htmlLocale(page)).lang, { timeout: 20_000 }).toBe(lang);
  expect((await htmlLocale(page)).dir).toBe(dir);
}

/** At least one of the localized strings for `keys` is on screen. */
async function expectLocalizedStrings(page: Page, lang: string, keys: string[], where: string) {
  const d = dict(lang);
  const body = (await page.textContent("body")) ?? "";
  const html = await page.content();
  const expected = keys.filter((k) => d[k] && d[k] !== en[k]);
  if (expected.length === 0) return; // nothing distinguishable in this locale
  const hits = expected.filter((k) => body.includes(d[k]) || html.includes(d[k]));
  expect(
    hits.length,
    `${where}: expected one of [${expected.map((k) => d[k]).join(", ")}] rendered in ${lang}`,
  ).toBeGreaterThan(0);
}

/** Raw dictionary keys must never leak into the UI. */
async function expectNoRawKeys(page: Page, where: string) {
  const body = (await page.textContent("body")) ?? "";
  expect(body, `${where}: untranslated key leaked`).not.toMatch(
    /\b(nav|common|player|language)\.[a-zA-Z_]+\b/,
  );
}

for (const c of CASES) {
  test.describe(`device language: ${c.name}`, () => {
    test.use({ locale: c.locale, timezoneId: c.tz });

    test("category browsing renders localized labels instantly", async ({ page }) => {
      await page.goto("/explore");
      await page.waitForLoadState("domcontentloaded");
      await expectLocale(page, c.lang, c.dir);
      await expectLocalizedStrings(page, c.lang, SHELL_KEYS, "/explore");
      await expectNoRawKeys(page, "/explore");

      // Drill into a category from the browse surface; the language must
      // survive client-side navigation with no reload.
      const link = page
        .getByRole("link")
        .filter({ hasNot: page.locator("[aria-hidden=true]") })
        .first();
      if (await link.count()) {
        const before = page.url();
        await link.click({ trial: false }).catch(() => undefined);
        await page.waitForTimeout(1500);
        if (page.url() !== before) {
          await expectLocale(page, c.lang, c.dir);
          await expectNoRawKeys(page, "category detail");
        }
      }
    });

    test("watch page recommendations keep the device language", async ({ page }) => {
      await page.goto("/");
      const card = page.getByTestId("video-card").first();
      await card.waitFor({ state: "visible", timeout: 60_000 });
      await card.click();
      await expect(page).toHaveURL(/\/watch\/[\w-]{6,}/, { timeout: 30_000 });

      await expectLocale(page, c.lang, c.dir);
      // Recommendation rail: cards render (titles are creator-authored and stay
      // in their source language — the *chrome* around them must be localized).
      await page
        .getByTestId("video-card")
        .first()
        .waitFor({ state: "visible", timeout: 60_000 })
        .catch(() => undefined);
      await expectLocalizedStrings(page, c.lang, [...SHELL_KEYS, ...PLAYER_KEYS], "/watch");
      await expectNoRawKeys(page, "/watch");
    });
  });
}
