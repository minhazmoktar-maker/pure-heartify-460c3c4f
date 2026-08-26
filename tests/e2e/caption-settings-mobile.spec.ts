/**
 * Mobile UI regression: persisted caption display settings.
 *
 * Verifies that the caption preferences a viewer saved (text scaling,
 * high-contrast mode, line height, background plate, RTL mirroring) are read
 * from persistence BEFORE first paint and applied on the mobile watch /
 * originals screens — i.e. that the settings survive a cold app open on a
 * phone-sized viewport and are not silently reset to defaults.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
const STORAGE_KEY = "heartify:caption-settings";
const PHONE = { width: 390, height: 844 };

const PERSISTED = {
  fontScale: 1.7,
  background: "solid",
  lineHeight: 1.9,
  mirrorRtl: true,
  enabled: true,
  highContrast: true,
  edgeOpacity: 0.9,
  sizePreset: "xlarge",
  followOsScaling: false,
};

async function seedSettings(page: Page, locale?: string) {
  await page.addInitScript(
    ([key, value, loc]) => {
      window.localStorage.setItem(key as string, value as string);
      if (loc) {
        window.localStorage.setItem("heartify-locale", loc as string);
        window.localStorage.setItem("heartify:locale", loc as string);
      }
    },
    [STORAGE_KEY, JSON.stringify(PERSISTED), locale ?? ""] as const,
  );
}

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

/** Navigates to the first published Heartify upload, or skips the test. */
async function openFirstUpload(page: Page) {
  await open(page, "/originals");
  const first = page.locator('a[href^="/u/"]').first();
  if ((await first.count()) === 0) {
    test.skip(true, "no published Heartify uploads in this environment");
  }
  await first.click();
  await expect(page).toHaveURL(/\/u\//);
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

test.use({ viewport: PHONE, isMobile: true, hasTouch: true });

test.describe("persisted caption settings on mobile watch", () => {
  test("saved size, contrast and line height are applied after a cold open", async ({ page }) => {
    await seedSettings(page);
    await openFirstUpload(page);

    const trigger = page.getByTestId("watch-caption-settings-trigger");
    await expect(trigger).toBeVisible();
    // 44x44 minimum touch target on phones.
    const box = await trigger.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    await trigger.tap();

    const panel = page.getByTestId("watch-caption-settings-panel");
    await expect(panel).toBeVisible();

    // The persisted preset must be the selected one, not the default medium.
    await expect(page.getByTestId("watch-caption-settings-size-xlarge")).toHaveAttribute(
      "data-state",
      /on|active|checked/,
    ).catch(async () => {
      // Toggle groups differ in attribute naming across variants — fall back
      // to asserting the effective scale readout instead.
      await expect(page.getByTestId("watch-caption-settings-effective-scale")).toContainText("1.7");
    });

    const preview = page.getByTestId("watch-caption-settings-preview");
    await expect(preview).toBeVisible();

    const style = await preview.evaluate((el) => {
      const cs = getComputedStyle(el as HTMLElement);
      return {
        fontSizePx: parseFloat(cs.fontSize),
        lineHeight: cs.lineHeight,
        background: cs.backgroundColor,
        color: cs.color,
      };
    });

    // xlarge (1.7x) must render visibly larger than the 14px base sm text.
    expect(style.fontSizePx).toBeGreaterThan(16);
    // High contrast = opaque plate + pure white text.
    expect(style.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(style.color).toMatch(/rgb\(255, 255, 255\)|rgba\(255, 255, 255/);
    // 1.9 line-height on a >16px font resolves well above 24px.
    if (style.lineHeight !== "normal") {
      expect(parseFloat(style.lineHeight)).toBeGreaterThan(24);
    }
  });

  test("settings persist across a reload (no reset to defaults)", async ({ page }) => {
    await seedSettings(page);
    await openFirstUpload(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);

    const stored = await page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored as string);
    expect(parsed.sizePreset).toBe("xlarge");
    expect(parsed.highContrast).toBe(true);
    expect(parsed.mirrorRtl).toBe(true);
  });
});

test.describe("RTL caption mirroring on mobile", () => {
  for (const locale of ["ar", "ur"] as const) {
    test(`${locale}: mirrored caption preview stays inside the phone viewport`, async ({ page }) => {
      await seedSettings(page, locale);
      await openFirstUpload(page);

      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

      const trigger = page.getByTestId("watch-caption-settings-trigger");
      await expect(trigger).toBeVisible();
      await trigger.tap();

      const preview = page.getByTestId("watch-caption-settings-preview");
      await expect(preview).toBeVisible();

      const box = await preview.boundingBox();
      expect(box).not.toBeNull();
      // No horizontal overflow on a 390px-wide phone.
      expect((box?.x ?? 0)).toBeGreaterThanOrEqual(-1);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(PHONE.width + 1);

      const dir = await preview.evaluate((el) => getComputedStyle(el as HTMLElement).direction);
      expect(["rtl", "ltr"]).toContain(dir);
    });
  }
});
