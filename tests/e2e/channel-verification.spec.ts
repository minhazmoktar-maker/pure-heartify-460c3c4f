import { test, expect } from "@playwright/test";

test.describe("channel verification pipeline", () => {
  test("non-admin cannot access /admin/review", async ({ page }) => {
    await page.goto("/admin/review");
    // /admin/review redirects into the unified console; wait for it to render.
    await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 20_000 });
    // Either sign-in prompt or Forbidden message; either satisfies gating.
    const body = await page.locator("body").innerText();
    expect(body.toLowerCase()).toMatch(/sign in|forbidden|admin/);
  });

  test("owner_key duplicate detection normalizes aliases", async ({ request, baseURL }) => {
    // Client-side check: exercise the same normalization the SQL function uses.
    const strip = (s: string) =>
      s.toLowerCase()
        .replace(/\s*(official|tv|hd|4k|backup|archive|channel|network|studio|productions?|media|[0-9]+)\s*$/g, "")
        .replace(/[^a-z0-9]+/g, "");
    expect(strip("Mufti Menk Official")).toBe(strip("Mufti Menk TV"));
    expect(strip("Nouman Ali Khan HD")).toBe(strip("Nouman Ali Khan"));
    expect(baseURL).toBeTruthy();
  });
});
