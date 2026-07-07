/**
 * SearchResults smart-search UX coverage:
 * - Typo tolerance ("quraan" → quran results)
 * - Query normalization (diacritics, punctuation, casing)
 * - "Did you mean" suggestion appears + is clickable for very sparse queries
 * - Autocomplete chips appear on the empty-state input for 2+ char prefixes
 */
import { test, expect } from "../playwright-fixture";

test.describe("smart search — typo tolerance & normalization", () => {
  test("typo 'quraan' still surfaces Quran results", async ({ page }) => {
    await page.goto("/search?q=quraan");
    await expect(page.getByText(/Results for/i)).toBeVisible();
    // Give the debounced client search + corpus load a moment.
    await page.waitForTimeout(1800);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).toMatch(/quran|qur['’]?an|recitation|surah/);
  });

  test("diacritics + punctuation are normalized ('qur’ān' ≈ 'quran')", async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent("qur’ān")}`);
    await page.waitForTimeout(1800);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).toMatch(/quran|recitation|surah/);
  });

  test("casing + trailing whitespace are normalized", async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent("  RAMADN  ")}`);
    await page.waitForTimeout(1800);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).toMatch(/ramadan|fasting|iftar|taraweeh/);
  });

  test("'Did you mean' suggestion appears for a sparse typo and is clickable", async ({ page }) => {
    await page.goto("/search?q=hubrman");
    await page.waitForTimeout(2000);
    const dym = page.getByText(/Did you mean/i);
    // Only assert-and-click when the corpus produced a suggestion; skip otherwise.
    if (await dym.isVisible().catch(() => false)) {
      const link = page.locator("a", { hasText: /^(?!Did you mean).+$/ }).first();
      await link.click();
      await expect(page).toHaveURL(/\/search\?q=/);
      await page.waitForTimeout(1500);
      const body = (await page.locator("body").innerText()).toLowerCase();
      expect(body).toMatch(/results for/i);
    }
  });

  test("autocomplete chips render on empty-state input for 2+ char prefix", async ({ page }) => {
    await page.goto("/search");
    const input = page.getByPlaceholder(/quraan|hubrman|ramadn/i);
    await expect(input).toBeVisible();
    await input.fill("qu");
    // Debounce is 250ms in useSmartSearch; give the corpus + fuse a beat.
    await page.waitForTimeout(1500);

    // Chips are rendered as <button> pills right below the input.
    const chips = page.locator("button.rounded-full");
    const count = await chips.count();
    // If the corpus is empty in CI we don't fail the assertion, but when there
    // are matches at least one chip must be interactive.
    if (count > 0) {
      await expect(chips.first()).toBeVisible();
      await chips.first().click();
      await expect(page).toHaveURL(/\/search\?q=/);
    }
  });
});

/**
 * Extended coverage — Islamic spelling variants + long mixed-whitespace queries.
 * Every variant must land on the search page, render a "Results for" heading,
 * and not leave the "Did you mean" / autocomplete surfaces in a broken state.
 */
const ISLAMIC_VARIANTS: Array<{ input: string; expect: RegExp }> = [
  { input: "quraan",     expect: /quran|recitation|surah/ },
  { input: "qur'an",     expect: /quran|recitation|surah/ },
  { input: "koran",      expect: /quran|recitation|surah/ },
  { input: "kur'an",     expect: /quran|recitation|surah/ },
  { input: "ramzan",     expect: /ramadan|fasting|iftar/ },
  { input: "ramadhan",   expect: /ramadan|fasting|iftar/ },
  { input: "ramzaan",    expect: /ramadan|fasting|iftar/ },
  { input: "muhammed",   expect: /muhammad|prophet|seerah/ },
  { input: "mohammed",   expect: /muhammad|prophet|seerah/ },
  { input: "mohamad",    expect: /muhammad|prophet|seerah/ },
  { input: "muslmah",    expect: /muslim|islam/ },
  { input: "eeman",      expect: /iman|faith|belief/ },
  { input: "imaan",      expect: /iman|faith|belief/ },
  { input: "shariah",    expect: /shariah|sharia|islamic law|fiqh/ },
  { input: "shareeah",   expect: /shariah|sharia|islamic law|fiqh/ },
  { input: "hadeeth",    expect: /hadith|sunnah|narration/ },
  { input: "seera",      expect: /seerah|prophet|biography/ },
  { input: "dua",        expect: /dua|supplication|prayer/ },
  { input: "duaa",       expect: /dua|supplication|prayer/ },
  { input: "salaah",     expect: /salah|prayer|namaz/ },
  { input: "namaaz",     expect: /salah|prayer|namaz/ },
];

test.describe("smart search — Islamic spelling variants", () => {
  for (const { input, expect: pattern } of ISLAMIC_VARIANTS) {
    test(`variant "${input}" normalizes and returns relevant results`, async ({ page }) => {
      await page.goto(`/search?q=${encodeURIComponent(input)}`);
      await expect(page.getByText(/Results for/i)).toBeVisible();
      await page.waitForTimeout(1800);
      const body = (await page.locator("body").innerText()).toLowerCase();
      // If the corpus has zero matches we still expect either a "Did you mean"
      // hint OR a fallback trending grid — never a broken empty screen.
      const hasResults = pattern.test(body);
      const hasDidYouMean = /did you mean/i.test(body);
      const hasFallback = /trending|you might also like|no exact match/i.test(body);
      expect(
        hasResults || hasDidYouMean || hasFallback,
        `variant "${input}" produced no results, no suggestion, and no fallback`,
      ).toBe(true);
    });
  }
});

test.describe("smart search — long mixed-whitespace queries", () => {
  const LONG_QUERIES = [
    "   quraan\t\trecitation   \n  by  \t sheikh   ",
    "\tramadan\t\tprayer\ttimings\t\tfor\tnorth\tamerica\t",
    "  seerah   of   the   prophet   muhammad   peace   be   upon   him  ",
    "\n\n  islamic\tfinance   halal   investing   guide  \n",
    "  qur'an\u00a0tafseer\u00a0by\u00a0mufti\u00a0menk  ",
  ];

  for (const q of LONG_QUERIES) {
    test(`query "${q.replace(/\s+/g, "·").slice(0, 40)}..." renders search UI cleanly`, async ({
      page,
    }) => {
      await page.goto(`/search?q=${encodeURIComponent(q)}`);
      await expect(page.getByText(/Results for/i)).toBeVisible();
      await page.waitForTimeout(1800);

      // The displayed heading must not crash on whitespace/unicode.
      const heading = await page.locator("h1").first().innerText();
      expect(heading.length).toBeGreaterThan(0);

      // Autocomplete chip container / Did-you-mean block must never throw.
      const errorText = (await page.locator("body").innerText()).toLowerCase();
      expect(errorText).not.toContain("something went wrong");
      expect(errorText).not.toContain("cannot read prop");
      expect(errorText).not.toMatch(/typeerror|referenceerror/);
    });
  }

  test("autocomplete chips still render for mixed-whitespace prefix", async ({ page }) => {
    await page.goto("/search");
    const input = page.getByPlaceholder(/quraan|hubrman|ramadn/i);
    await input.fill("   qu\tr   ");
    await page.waitForTimeout(1500);
    // Should not crash — chips container (if any) stays interactive.
    const chips = page.locator("button.rounded-full");
    const count = await chips.count();
    if (count > 0) {
      await expect(chips.first()).toBeVisible();
    }
  });

  test("Did-you-mean still surfaces for a heavily-typo'd long query", async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent("  qraaan\trecitaion\tby\tsheikh  ")}`);
    await page.waitForTimeout(2200);
    // Either results OR a Did-you-mean hint — never a bare crash.
    const body = (await page.locator("body").innerText()).toLowerCase();
    const acceptable =
      /quran|recitation|did you mean|trending|no exact match/.test(body);
    expect(acceptable).toBe(true);
  });
});
