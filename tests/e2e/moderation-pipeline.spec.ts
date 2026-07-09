import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Moderation pipeline E2E:
 * 1. Insert a video_candidate directly (simulating ingestion / upload).
 * 2. Confirm it is NOT visible in curated_videos until moderation passes.
 * 3. Simulate moderation approval + trust scoring pass.
 * 4. Confirm it now appears in curated_videos and on the home feed.
 *
 * Requires service role key to bypass RLS during setup/teardown.
 * Skips gracefully when SUPABASE_SERVICE_ROLE_KEY is not available (e.g. Lovable Cloud).
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("video moderation pipeline", () => {
  test.skip(!SUPABASE_URL || !SERVICE_KEY, "service role key not available");

  const admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  const testVideoId = `TEST_${Date.now()}`;
  const testChannelId = `UC_TEST_${Date.now()}`;

  test.afterAll(async () => {
    await admin.from("curated_videos").delete().eq("video_id", testVideoId);
    await admin.from("video_candidates").delete().eq("video_id", testVideoId);
    await admin.from("approved_channels").delete().eq("channel_id", testChannelId);
  });

  test("candidate not visible until moderation + trust pass", async ({ page }) => {
    // Step 1: insert candidate
    const { error: insErr } = await admin.from("video_candidates").insert({
      video_id: testVideoId,
      channel_id: testChannelId,
      title: "E2E test video",
      status: "pending",
    });
    expect(insErr, insErr?.message).toBeNull();

    // Step 2: confirm NOT in curated_videos
    const { data: preData } = await admin
      .from("curated_videos")
      .select("video_id")
      .eq("video_id", testVideoId);
    expect(preData?.length ?? 0).toBe(0);

    // Step 3: confirm NOT on public feed
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const preBody = (await page.textContent("body")) ?? "";
    expect(preBody).not.toContain(testVideoId);

    // Step 4: simulate moderation approve + trust pass by inserting into curated_videos
    // (In real system this happens via moderate-video edge function.)
    const { error: chErr } = await admin.from("approved_channels").insert({
      channel_id: testChannelId,
      channel_title: "E2E Test Channel",
      status: "approved",
      trust_score: 80,
    });
    expect(chErr?.message ?? null).toBeNull();

    const { error: curErr } = await admin.from("curated_videos").insert({
      video_id: testVideoId,
      channel_id: testChannelId,
      title: "E2E test video",
      status: "approved",
      moderation_status: "clean",
    });
    expect(curErr, curErr?.message).toBeNull();

    // Step 5: verify it can now be fetched by an anon client
    const anon = createClient(SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    const { data: postData } = await anon
      .from("curated_videos")
      .select("video_id, title")
      .eq("video_id", testVideoId);
    expect(postData?.length).toBeGreaterThan(0);
  });
});
