/**
 * Automated verification that every For You section renders exactly 100
 * unique halal videos:
 *   - after initial load
 *   - after a hard refresh
 *   - after horizontal scroll/pagination inside a section's rail
 *
 * Skipped automatically when the sandbox has no injected Supabase session
 * (LOVABLE_BROWSER_AUTH_STATUS !== "injected") so CI without auth soft-passes.
 *
 * Run: bunx vitest run src/test/for-you-sections.e2e.test.ts
 */
import { describe, it, expect } from "vitest";
import { chromium, type Page } from "playwright";

const AUTH_READY = process.env.LOVABLE_BROWSER_AUTH_STATUS === "injected";
const BASE_URL = process.env.LOVABLE_PREVIEW_URL ?? "http://localhost:8080";
const TARGET = 100;

const describeIf = AUTH_READY ? describe : describe.skip;

type SectionSnapshot = { id: string; count: number; ids: string[] };

async function restoreAuth(page: Page) {
  const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;

  const ctx = page.context();
  if (cookiesJson) {
    const cookies = JSON.parse(cookiesJson) as Array<Record<string, unknown>>;
    for (const c of cookies) c.url = BASE_URL;
    // Playwright's typing is picky about our loose JSON shape; the cast is safe.
    await ctx.addCookies(cookies as never);
  }

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  if (storageKey && sessionJson) {
    await page.evaluate(
      ([k, v]) => window.localStorage.setItem(k as string, v as string),
      [storageKey, sessionJson],
    );
  }
}

async function loadAllSections(page: Page): Promise<SectionSnapshot[]> {
  await page.goto(BASE_URL + "/", { waitUntil: "networkidle" });
  await page.waitForSelector("section[data-section-id]", { timeout: 15_000 });

  // Trigger the IntersectionObserver in every row + let backfill settle.
  for (let i = 0; i < 40; i++) {
    await page.evaluate(() => window.scrollBy(0, 2000));
    await page.waitForTimeout(400);
  }

  // Wait for all sections to finish backfilling (data-loading="false")
  // or hit an overall timeout budget.
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const stillLoading = await page.$$eval(
      'section[data-section-id][data-loading="true"]',
      (els) => els.length,
    );
    if (stillLoading === 0) break;
    await page.waitForTimeout(750);
  }

  return page.$$eval("section[data-section-id]", (els) =>
    els.map((el) => {
      const ids = Array.from(el.querySelectorAll("[data-video-id]")).map(
        (n) => (n as HTMLElement).dataset.videoId ?? "",
      );
      return {
        id: (el as HTMLElement).dataset.sectionId ?? "",
        count: Number((el as HTMLElement).dataset.videoCount ?? "0"),
        ids,
      };
    }),
  );
}

function assertAllHitTarget(sections: SectionSnapshot[], label: string) {
  const shortfall = sections.filter((s) => s.count !== TARGET);
  const dupes = sections.filter((s) => new Set(s.ids).size !== s.ids.length);

  if (shortfall.length || dupes.length) {
    // Print a diagnostic table so failures are debuggable at a glance.
    // eslint-disable-next-line no-console
    console.error(`\n[${label}] Section counts:`);
    for (const s of sections) {
      // eslint-disable-next-line no-console
      console.error(
        `  ${s.id.padEnd(40)} count=${s.count.toString().padStart(3)} uniq=${new Set(
          s.ids,
        ).size}`,
      );
    }
  }

  expect(
    shortfall,
    `${label}: sections below ${TARGET} videos`,
  ).toEqual([]);
  expect(dupes, `${label}: sections with duplicate video ids`).toEqual([]);
}

describeIf("For You sections — 100 unique halal videos", () => {
  it(
    "renders exactly 100 unique videos per section on load, refresh, and scroll",
    async () => {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 1800 },
      });
      const page = await context.newPage();

      try {
        await restoreAuth(page);

        // 1) Initial load
        const first = await loadAllSections(page);
        expect(first.length).toBeGreaterThan(0);
        assertAllHitTarget(first, "initial load");

        // 2) Hard refresh
        await page.reload({ waitUntil: "networkidle" });
        const refreshed = await loadAllSections(page);
        assertAllHitTarget(refreshed, "after refresh");

        // 3) Horizontal pagination inside the first non-empty rail
        const firstId = refreshed[0]?.id;
        expect(firstId, "expected at least one section").toBeTruthy();
        await page.evaluate((sid) => {
          const sec = document.querySelector(
            `section[data-section-id="${sid}"]`,
          );
          const rail = sec?.querySelector<HTMLElement>("div.overflow-x-auto");
          if (rail) rail.scrollLeft = rail.scrollWidth;
        }, firstId);
        await page.waitForTimeout(1500);

        const afterScroll = await loadAllSections(page);
        assertAllHitTarget(afterScroll, "after horizontal scroll");
      } finally {
        await browser.close();
      }
    },
    180_000,
  );
});
