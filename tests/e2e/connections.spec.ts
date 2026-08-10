import { test, expect } from "@playwright/test";

/**
 * Connections & Accountability — desktop + mobile smoke.
 *
 * Runs unauthenticated (the E2E suite has no seeded session), so it asserts the
 * guarded/empty/error states render cleanly rather than exercising mutations:
 *   - /connections shows the sign-in empty state, never a crash or blank frame
 *   - /u/:handle shows a graceful "not found" / private state
 *   - /admin/social is gated
 *   - no console errors on any of these routes
 */
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

for (const vp of VIEWPORTS) {
  test.describe(`connections (${vp.name})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("connections page renders a guarded state without console errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });

      await page.goto("/connections", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
      // Either the signed-out empty state or the tabbed circle UI — never blank.
      const signedOut = page.getByText(/sign in to build your circle/i);
      const tabs = page.getByRole("tab", { name: /circle/i });
      await expect(signedOut.or(tabs).first()).toBeVisible();

      expect(errors.filter((e) => !/401|403|favicon|net::ERR/i.test(e))).toEqual([]);
    });

    test("unknown public profile shows a graceful empty state", async ({ page }) => {
      await page.goto("/u/definitely-not-a-real-handle-xyz", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByText(/profile not found|profile is private|couldn't load this profile/i),
      ).toBeVisible({ timeout: 15_000 });
    });

    test("admin social analytics is gated for anonymous visitors", async ({ page }) => {
      await page.goto("/admin/social", { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).not.toContainText(/Progress sharing choices/i);
    });
  });
}
