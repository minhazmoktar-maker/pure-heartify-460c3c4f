import { test, expect } from "@playwright/test";

/**
 * Role-based access tests.
 * These tests verify that admin routes correctly gate non-admin traffic.
 * Optional signed-in tests run only when TEST_ADMIN_EMAIL/PASS or TEST_USER_EMAIL/PASS are provided.
 */

const ADMIN_ROUTES = [
  "/admin/console",
  "/admin/moderation",
  "/admin/audit",
  "/admin/reports",
  "/admin/roles",
  "/admin/analytics",
  "/admin/gsc",
  "/admin/permissions",
  "/admin/channel-trust",
  "/admin/audio-integrity",
  "/owner",
];

test.describe("RLS + has_role gating (anonymous)", () => {
  for (const route of ADMIN_ROUTES) {
    test(`anon on ${route} is redirected or blocked`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      // Should NOT render admin content; must land at login or show gate.
      const url = page.url();
      const body = (await page.textContent("body"))?.toLowerCase() ?? "";
      const gated =
        url.includes("/login") ||
        body.includes("sign in") ||
        body.includes("access denied") ||
        body.includes("not authorized") ||
        body.includes("permission");
      expect(gated, `admin route ${route} leaked to anon (url=${url})`).toBeTruthy();
    });
  }
});

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
}

test.describe("regular user flow", () => {
  test.skip(!process.env.TEST_USER_EMAIL, "TEST_USER_EMAIL not set");

  test("regular user cannot reach admin console", async ({ page }) => {
    await login(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASS!);
    await page.goto("/admin/console");
    await page.waitForLoadState("networkidle");
    const body = (await page.textContent("body"))?.toLowerCase() ?? "";
    expect(
      body.includes("not authorized") ||
        body.includes("access denied") ||
        page.url().includes("/login") ||
        page.url() === new URL("/", page.url()).toString(),
    ).toBeTruthy();
  });

  test("regular user can view profile", async ({ page }) => {
    await login(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASS!);
    await page.goto("/profile");
    await expect(page.locator("body")).toContainText(/profile/i);
  });
});

test.describe("admin flow", () => {
  test.skip(!process.env.TEST_ADMIN_EMAIL, "TEST_ADMIN_EMAIL not set");

  test("admin can access admin console + moderation", async ({ page }) => {
    await login(page, process.env.TEST_ADMIN_EMAIL!, process.env.TEST_ADMIN_PASS!);
    for (const route of ["/admin/console", "/admin/moderation", "/admin/roles"]) {
      const res = await page.goto(route);
      expect(res?.status(), route).toBeLessThan(400);
      await page.waitForLoadState("networkidle");
      const body = (await page.textContent("body"))?.toLowerCase() ?? "";
      expect(body, route).not.toContain("permission denied");
      expect(body, route).not.toContain("not authorized");
    }
  });
});

test.describe("moderator flow", () => {
  test.skip(!process.env.TEST_MOD_EMAIL, "TEST_MOD_EMAIL not set");

  test("moderator can access moderation, cannot access owner", async ({ page }) => {
    await login(page, process.env.TEST_MOD_EMAIL!, process.env.TEST_MOD_PASS!);
    const modRes = await page.goto("/admin/moderation");
    expect(modRes?.status()).toBeLessThan(400);

    await page.goto("/owner");
    await page.waitForLoadState("networkidle");
    const body = (await page.textContent("body"))?.toLowerCase() ?? "";
    expect(
      body.includes("not authorized") ||
        body.includes("access denied") ||
        page.url().includes("/login"),
    ).toBeTruthy();
  });
});
