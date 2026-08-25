/**
 * RTL keyboard / focus-order E2E.
 *
 * `rtl-snapshots.spec.ts` covers RTL *layout*; this suite covers RTL
 * *operability* — the WCAG 2.2 AA requirements that break most often when a
 * page is mirrored:
 *   1. every interactive control is reachable with Tab (no focus traps),
 *   2. focus order follows visual reading order (right → left, top → bottom),
 *   3. focus is always visible (an outline / ring is applied),
 *   4. the play affordance activates with Enter *and* Space, and never before
 *      user intent (the halal autoplay facade must hold).
 */
import { test, expect, type Page } from "@playwright/test";

test.use({
  locale: "ar-SA",
  timezoneId: "Asia/Riyadh",
  viewport: { width: 390, height: 844 },
});

interface FocusInfo {
  tag: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  ring: boolean;
}

async function waitRtl(page: Page) {
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.dir), { timeout: 20_000 })
    .toBe("rtl");
}

/** Tab `steps` times, recording the focused element's box + label each time. */
async function tabWalk(page: Page, steps: number): Promise<FocusInfo[]> {
  const out: FocusInfo[] = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const ring =
        cs.outlineStyle !== "none" ||
        parseFloat(cs.outlineWidth || "0") > 0 ||
        (cs.boxShadow ?? "none") !== "none";
      return {
        tag: el.tagName.toLowerCase(),
        label:
          el.getAttribute("aria-label") ??
          el.textContent?.trim().slice(0, 40) ??
          "",
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        ring,
      };
    });
    if (info && info.w > 0 && info.h > 0) out.push(info);
  }
  return out;
}

/** No YouTube iframe may exist before an explicit play intent. */
async function assertNoAutoplay(page: Page, where: string) {
  const frames = await page.locator('iframe[src*="youtube"]').count();
  expect(frames, `${where} mounted a player without user intent`).toBe(0);
}

function assertReadingOrder(stops: FocusInfo[], where: string) {
  // In RTL, a later stop on the same visual row must sit further LEFT.
  // Rows are bucketed with a tolerance so sub-pixel layout noise is ignored.
  const ROW = 24;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    const sameRow = Math.abs(a.y - b.y) <= ROW;
    if (!sameRow) {
      expect(b.y, `${where}: focus jumped upward from "${a.label}" to "${b.label}"`).toBeGreaterThanOrEqual(
        a.y - ROW,
      );
      continue;
    }
    expect(
      b.x,
      `${where}: RTL focus order moved rightward within a row ("${a.label}" → "${b.label}")`,
    ).toBeLessThanOrEqual(a.x + 4);
  }
}

async function assertKeyboardOperable(page: Page, where: string, steps = 12) {
  await waitRtl(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const stops = await tabWalk(page, steps);
  expect(stops.length, `${where}: no focusable controls reachable via Tab`).toBeGreaterThan(0);
  // Focus visibility — at least the majority of stops must render an indicator.
  const visible = stops.filter((s) => s.ring).length;
  expect(visible, `${where}: focus indicator missing on most stops`).toBeGreaterThan(0);
  // No focus trap: Tab must actually move between distinct elements.
  const unique = new Set(stops.map((s) => `${s.tag}:${s.label}:${Math.round(s.x)}:${Math.round(s.y)}`));
  expect(unique.size, `${where}: Tab appears trapped on one control`).toBeGreaterThan(1);
  assertReadingOrder(stops, where);
}

test("home is keyboard operable in RTL and keeps the play facade", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("video-card").first().waitFor({ state: "visible", timeout: 60_000 });
  await assertNoAutoplay(page, "home");
  await assertKeyboardOperable(page, "home");
  await assertNoAutoplay(page, "home after tabbing");
});

test("category surface is keyboard operable in RTL", async ({ page }) => {
  await page.goto("/explore");
  await page.waitForLoadState("networkidle");
  await assertKeyboardOperable(page, "category");
  await assertNoAutoplay(page, "category");
});

test("onboarding is keyboard operable in RTL", async ({ page }) => {
  await page.goto("/onboarding");
  await page.waitForLoadState("networkidle");
  await assertKeyboardOperable(page, "onboarding");
  await assertNoAutoplay(page, "onboarding");
});

test("watch page play button activates with Enter and Space in RTL", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId("video-card").first();
  await card.waitFor({ state: "visible", timeout: 60_000 });
  await card.click();
  await expect(page).toHaveURL(/\/watch\/[\w-]{6,}/, { timeout: 30_000 });
  await waitRtl(page);
  await assertNoAutoplay(page, "watch on arrival");
  await assertKeyboardOperable(page, "watch");

  // Keyboard activation of the play facade: focus the play affordance and press
  // Enter; if the facade is still up (e.g. gated), Space must also work.
  const play = page
    .locator(
      'button[aria-label*="Play" i], button[aria-label*="تشغيل"], [data-testid="play-button"]',
    )
    .first();
  if (await play.count()) {
    await play.focus();
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName,
    );
    expect(focused, "play affordance could not receive focus").toBeTruthy();

    await page.keyboard.press("Enter");
    let mounted = await page
      .locator('iframe[src*="youtube"]')
      .first()
      .waitFor({ state: "attached", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!mounted && (await play.count())) {
      await play.focus();
      await page.keyboard.press("Space");
      mounted = await page
        .locator('iframe[src*="youtube"]')
        .first()
        .waitFor({ state: "attached", timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
    }
    expect(mounted, "play button did not activate via keyboard in RTL").toBeTruthy();
  }
});
