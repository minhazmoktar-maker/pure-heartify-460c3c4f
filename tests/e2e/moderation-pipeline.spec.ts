import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Moderation pipeline E2E — uses an authenticated admin test user
 * (TEST_ADMIN_EMAIL / TEST_ADMIN_PASS) instead of SUPABASE_SERVICE_ROLE_KEY.
 * The admin's RLS policies allow inserting/deleting from video_candidates,
 * approved_channels, and curated_videos.
 *
 * Skips gracefully when the admin credentials are unavailable.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASS = process.env.TEST_ADMIN_PASS;

test.describe("video moderation pipeline", () => {
  test.skip(
    !SUPABASE_URL || !ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASS,
    "TEST_ADMIN_EMAIL / TEST_ADMIN_PASS / Supabase URL missing",
  );

  const testVideoId = `TEST_${Date.now()}`;
  const testChannelId = `UC_TEST_${Date.now()}`;

  const adminClient = () =>
    createClient(SUPABASE_URL!, ANON_KEY!, { auth: { persistSession: false } });

  async function signedInAdmin() {
    const c = adminClient();
    const { error } = await c.auth.signInWithPassword({ email: ADMIN_EMAIL!, password: ADMIN_PASS! });
    if (error) throw error;
    return c;
  }

  test.afterAll(async () => {
    try {
      const c = await signedInAdmin();
      await c.from("curated_videos").delete().eq("video_id", testVideoId);
      await c.from("video_candidates").delete().eq("video_id", testVideoId);
      await c.from("approved_channels").delete().eq("youtube_channel_id", testChannelId);
    } catch {
      /* cleanup best-effort */
    }
  });

  test("candidate not visible until curated_videos row exists", async ({ page }) => {
    const c = await signedInAdmin();

    // 1. Insert candidate
    const { error: insErr } = await c.from("video_candidates").insert({
      video_id: testVideoId,
      channel_id: testChannelId,
      title: "E2E test video",
      status: "pending",
    });
    expect(insErr?.message ?? null, "insert candidate").toBeNull();

    // 2. Anon client cannot see it in curated_videos
    const anon = createClient(SUPABASE_URL!, ANON_KEY!, { auth: { persistSession: false } });
    const { data: preData } = await anon
      .from("curated_videos").select("video_id").eq("video_id", testVideoId);
    expect(preData?.length ?? 0).toBe(0);

    // 3. Home feed should not contain the ID
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect((await page.textContent("body")) ?? "").not.toContain(testVideoId);

    // 4. Admin approves via curated_videos + approved_channels insert
    await c.from("approved_channels").insert({
      youtube_channel_id: testChannelId,
      title: "E2E Test Channel",
      status: "active",
    });
    const { error: curErr } = await c.from("curated_videos").insert({
      video_id: testVideoId,
      title: "E2E test video",
      channel_title: "E2E Test Channel",
      moderation_state: "approved",
      is_trusted_channel: true,
    });
    expect(curErr?.message ?? null, "insert curated").toBeNull();

    // 5. Anon can now see it
    const { data: postData } = await anon
      .from("curated_videos").select("video_id,title").eq("video_id", testVideoId);
    expect(postData?.length ?? 0).toBeGreaterThan(0);
  });
});
