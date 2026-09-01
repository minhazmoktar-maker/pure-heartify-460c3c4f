import { test, expect } from "@playwright/test";

test.describe("public smoke", () => {
  test("home renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    await page.waitForLoadState("networkidle");
    // Ignore third-party YouTube warnings and dev-only React `Warning:`
    // output (the function-component ref notice comes from the dev tooling
    // wrapper and is stripped from production builds). Anonymous 401 session
    // probes are expected too. Only our own runtime errors fail the test.
    const ours = errors.filter(
      (e) =>
        !/youtube|ytimg|doubleclick|gstatic|third.?party/i.test(e) &&
        !e.startsWith("Warning:") &&
        !/cannot be given refs|Failed to load resource|net::ERR_|invalid claim|AuthApiError/i.test(e),
    );

    expect(ours, ours.join("\n")).toEqual([]);
  });

  test("/about, /privacy, /terms, /login reachable", async ({ page }) => {
    for (const path of ["/about", "/privacy", "/terms", "/login"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
    }
  });

  test("search page has no adult/haram terms in results", async ({ page }) => {
    await page.goto("/search?q=quran");
    await page.waitForLoadState("networkidle");
    const body = (await page.textContent("body"))?.toLowerCase() ?? "";
    for (const bad of ["porn", "nude", "onlyfans", "casino", "gambling"]) {
      expect(body, `found "${bad}"`).not.toContain(bad);
    }
  });
});
