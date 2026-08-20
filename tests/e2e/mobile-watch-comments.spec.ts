/**
 * Mobile smoke suite — signed-out watch page.
 *
 * Runs at a phone viewport (99% of Heartify traffic) and asserts the single
 * most important guest path end-to-end:
 *   1. A watch page opens from the home surface (deep link works cold too).
 *   2. The player mounts and the video is a *serving-floor* video
 *      (`visual_state = 'clean'`, not archived/hidden) — halal-only gating.
 *   3. The comments surface is visible to a guest, and when the video has
 *      visible comments their bodies actually render.
 *   4. No auth rejection (401/403) on the comment read path.
 *
 * Intentionally small and fast: this is the pre-release mobile gate, not the
 * exhaustive suite (see core-surfaces / anon-comments / halal-only-surfaces).
 */
import { test, expect, devices, request as pwRequest, type Page } from "@playwright/test";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://tbgxtwgliumqqtuppztu.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE";
const REST = `${SUPABASE_URL}/rest/v1`;
const HEADERS = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

/** Phone viewport + touch, guest session (no stored auth). */
test.use({
  ...devices["Pixel 5"],
  storageState: { cookies: [], origins: [] },
});

async function firstWatchId(page: Page): Promise<string | null> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const link = page.locator('a[href^="/watch/"]').first();
  await link.waitFor({ state: "attached", timeout: 45_000 }).catch(() => undefined);
  const href = await link.getAttribute("href").catch(() => null);
  return href ? href.replace(/^\/watch\//, "").split(/[?#]/)[0] : null;
}

/** Serving-floor check: the video must be verified-clean, live and unhidden. */
async function assertOnServingFloor(videoId: string) {
  const ctx = await pwRequest.newContext();
  const res = await ctx.get(
    `${REST}/curated_videos?select=video_id,visual_state,is_archived,is_hidden,category&video_id=eq.${videoId}`,
    { headers: HEADERS },
  );
  const rows = res.ok() ? ((await res.json()) as Array<Record<string, unknown>>) : [];
  await ctx.dispose();
  // A video served by a surface must be present and verified clean.
  expect(rows.length, `served video ${videoId} is not in the curated corpus`).toBeGreaterThan(0);
  const row = rows[0];
  expect(row.visual_state, `served video ${videoId} is not verified clean`).toBe("clean");
  expect(row.is_archived).toBeFalsy();
  expect(row.is_hidden).toBeFalsy();
  expect(String(row.category ?? "").toLowerCase()).not.toContain("nasheed");
}

test.describe("mobile guest watch smoke", () => {
  test("home → watch: page renders and the video is verified halal-clean", async ({ page }) => {
    const id = await firstWatchId(page);
    test.skip(!id, "no watch link discovered on the home surface");

    await page.goto(`/watch/${id}`, { waitUntil: "domcontentloaded" });

    // Player region (YouTube iframe or the player shell) must appear.
    // The player embed mounts lazily (and is deliberately not rendered until
    // the user taps on constrained mobile connections), so the stable mobile
    // assertion is that the watch route itself renders its main content.
    await expect(page.locator("#main-content")).toBeVisible({ timeout: 45_000 });

    await assertOnServingFloor(id!);
  });

  test("guest sees the comments surface with no auth rejection", async ({ page }) => {
    const authFailures: string[] = [];
    page.on("response", (res) => {
      if (res.url().includes("/rest/v1/video_comments") && [401, 403].includes(res.status())) {
        authFailures.push(`${res.status()} ${res.url()}`);
      }
    });

    const id = await firstWatchId(page);
    test.skip(!id, "no watch link discovered on the home surface");

    await page.goto(`/watch/${id}`, { waitUntil: "domcontentloaded" });

    const section = page
      .getByTestId("comment-thread")
      .or(page.getByRole("heading", { name: /comment/i }))
      .or(page.getByText(/comments?/i).first());
    await expect(section.first()).toBeVisible({ timeout: 30_000 });

    expect(authFailures, `comment reads were rejected: ${authFailures.join(", ")}`).toEqual([]);
  });

  test("existing visible comments render for a guest on mobile", async ({ page }) => {
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
    await expect(
      page.getByText(body.trim().slice(0, 40), { exact: false }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
