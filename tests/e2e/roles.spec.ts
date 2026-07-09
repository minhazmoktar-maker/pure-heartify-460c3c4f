import { test, expect, type Page } from "@playwright/test";

/**
 * Watches the browser + network for two classes of failure that must never
 * happen in a healthy session:
 *   1. Any `permission denied for function has_role` error from Postgres.
 *   2. Any watch-route playback error (iframe load failure / YouTube error).
 *
 * Returns a getter — call `.assertClean()` at the end of each test.
 */
function installErrorSentinels(page: Page) {
  const failures: string[] = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (/permission denied for function has_role/i.test(text)) {
      failures.push(`console: ${text}`);
    }
    if (/watch.*playback.*(failed|error)|iframe.*error/i.test(text) && msg.type() === "error") {
      failures.push(`console: ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    if (/has_role|watch.*playback/i.test(err.message)) failures.push(`pageerror: ${err.message}`);
  });

  page.on("response", async (res) => {
    // Supabase PostgREST surfaces has_role permission errors in the JSON body.
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("application/json")) return;
    if (res.status() < 400) return;
    try {
      const body = await res.text();
      if (/permission denied for function has_role/i.test(body)) {
        failures.push(`network ${res.status()} ${res.url()}: ${body.slice(0, 200)}`);
      }
    } catch {
      /* ignore */
    }
  });

  return {
    assertClean() {
      expect(failures, `Runtime errors detected:\n${failures.join("\n")}`).toEqual([]);
    },
  };
}

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
    test(`anon on ${route} is redirected or blocked without has_role errors`, async ({ page }) => {
      const sentinel = installErrorSentinels(page);
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const url = page.url();
      const body = (await page.textContent("body"))?.toLowerCase() ?? "";
      const gated =
        url.includes("/login") ||
        body.includes("sign in") ||
        body.includes("access denied") ||
        body.includes("not authorized") ||
        body.includes("permission");
      expect(gated, `admin route ${route} leaked to anon (url=${url})`).toBeTruthy();
      sentinel.assertClean();
    });
  }
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
}

test.describe("regular user flow", () => {
  test.skip(!process.env.TEST_USER_EMAIL, "TEST_USER_EMAIL not set");

  test("regular user navigates without has_role or playback errors", async ({ page }) => {
    const sentinel = installErrorSentinels(page);
    await login(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASS!);

    await page.goto("/admin/console");
    await page.waitForLoadState("networkidle");
    const body = (await page.textContent("body"))?.toLowerCase() ?? "";
    expect(
      body.includes("not authorized") ||
        body.includes("access denied") ||
        page.url().includes("/login") ||
        page.url().endsWith("/"),
    ).toBeTruthy();

    await page.goto("/profile");
    await expect(page.locator("body")).toContainText(/profile/i);

    // Visit home + click a video to exercise the watch route
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const thumb = page.locator('[data-testid="video-card"], a[href*="/watch/"]').first();
    if (await thumb.count()) {
      await thumb.click({ force: true }).catch(() => {});
      await page.waitForURL(/\/watch\//, { timeout: 10_000 }).catch(() => {});
      await page.waitForLoadState("networkidle");
    }

    sentinel.assertClean();
  });
});

test.describe("admin flow", () => {
  test.skip(!process.env.TEST_ADMIN_EMAIL, "TEST_ADMIN_EMAIL not set");

  test("admin can access admin console without has_role errors", async ({ page }) => {
    const sentinel = installErrorSentinels(page);
    await login(page, process.env.TEST_ADMIN_EMAIL!, process.env.TEST_ADMIN_PASS!);
    for (const route of ["/admin/console", "/admin/moderation", "/admin/roles"]) {
      const res = await page.goto(route);
      expect(res?.status(), route).toBeLessThan(400);
      await page.waitForLoadState("networkidle");
      const body = (await page.textContent("body"))?.toLowerCase() ?? "";
      expect(body, route).not.toContain("permission denied");
      expect(body, route).not.toContain("not authorized");
    }
    sentinel.assertClean();
  });
});

test.describe("moderator flow", () => {
  test.skip(!process.env.TEST_MOD_EMAIL, "TEST_MOD_EMAIL not set");

  test("moderator can access moderation, cannot access owner", async ({ page }) => {
    const sentinel = installErrorSentinels(page);
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
    sentinel.assertClean();
  });
});
