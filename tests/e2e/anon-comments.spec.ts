/**
 * Signed-out comment visibility regression suite.
 *
 * Incident: the `video_comments` SELECT policy called `has_role()`, which the
 * `anon` role has no EXECUTE grant for. Every anonymous visitor got a 401 and
 * saw zero comments on every watch page. The fix split the policy per role.
 *
 * These tests assert both layers:
 *   1. API — an anon-key PostgREST read of non-hidden comments returns 200.
 *   2. UI  — a signed-out visitor's watch page renders the comments section
 *            (and any existing visible comment bodies) with no auth error.
 */
import { test, expect, request as pwRequest, type Page } from "@playwright/test";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://tbgxtwgliumqqtuppztu.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE";

const REST = `${SUPABASE_URL}/rest/v1`;
const HEADERS = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

test.describe("signed-out comment reads (API)", () => {
  test("anon can select visible comments without a 401/403", async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get(
      `${REST}/video_comments?select=id,video_id,body,status,created_at&status=eq.visible&limit=5`,
      { headers: HEADERS },
    );
    const body = await res.text();
    await ctx.dispose();

    expect(
      res.status(),
      `anon comment read must not be rejected (got ${res.status()}: ${body.slice(0, 200)})`,
    ).toBe(200);
    const rows = JSON.parse(body);
    expect(Array.isArray(rows)).toBe(true);
    // Hidden / removed comments must never reach an anonymous reader.
    for (const row of rows) expect(row.status).toBe("visible");
  });

  test("anon cannot read hidden or removed comments", async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get(
      `${REST}/video_comments?select=id,status&status=in.(hidden,removed)&limit=5`,
      { headers: HEADERS },
    );
    const text = await res.text();
    await ctx.dispose();
    // Either the policy filters them out (200 + empty) or refuses the read.
    if (res.status() === 200) expect(JSON.parse(text)).toEqual([]);
    else expect([401, 403]).toContain(res.status());
  });

  test("anon cannot insert a comment", async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.post(`${REST}/video_comments`, {
      headers: { ...HEADERS, "Content-Type": "application/json" },
      data: { video_id: "dQw4w9WgXcQ", body: "e2e anon insert attempt" },
    });
    await res.text();
    await ctx.dispose();
    expect([401, 403, 404, 400]).toContain(res.status());
  });
});

async function firstWatchHref(page: Page): Promise<string | null> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const link = page.locator('a[href^="/watch/"]').first();
  await link.waitFor({ state: "attached", timeout: 45_000 }).catch(() => undefined);
  return link.getAttribute("href").catch(() => null);
}

test.describe("signed-out comment visibility (UI)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("watch page renders the comments section for a guest", async ({ page }) => {
    const authFailures: string[] = [];
    page.on("response", (res) => {
      const url = res.url();
      if (url.includes("/rest/v1/video_comments") && [401, 403].includes(res.status())) {
        authFailures.push(`${res.status()} ${url}`);
      }
    });

    const href = await firstWatchHref(page);
    test.skip(!href, "no watch link discovered on the home feed");

    await page.goto(href!, { waitUntil: "domcontentloaded" });

    // The comments surface must exist for guests (either the thread with
    // comments, or its empty/sign-in-to-comment state — never nothing).
    const section = page.getByTestId("comment-thread").or(
      page.getByRole("heading", { name: /comment/i }),
    ).or(page.getByText(/comments?/i).first());
    await expect(section.first()).toBeVisible({ timeout: 30_000 });

    expect(authFailures, `comment reads were rejected: ${authFailures.join(", ")}`).toEqual([]);
  });

  test("visible comment bodies render when the video has comments", async ({ page }) => {
    // Find a video that actually has visible comments so the assertion is real.
    const ctx = await pwRequest.newContext();
    const res = await ctx.get(
      `${REST}/video_comments?select=video_id,body&status=eq.visible&order=created_at.desc&limit=1`,
      { headers: HEADERS },
    );
    const rows = res.ok() ? ((await res.json()) as Array<{ video_id: string; body: string }>) : [];
    await ctx.dispose();
    test.skip(rows.length === 0, "no visible comments in the corpus yet");

    const { video_id, body } = rows[0];
    await page.goto(`/watch/${video_id}`, { waitUntil: "domcontentloaded" });
    const snippet = body.trim().slice(0, 40);
    await expect(page.getByText(snippet, { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
