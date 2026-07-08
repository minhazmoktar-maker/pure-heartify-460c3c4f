/**
 * Fetches a moderation-safe candidate pool that all providers score against.
 *
 * Provider-agnostic. Bounded to a manageable slice (fresh + trending +
 * category-aligned) so scoring stays sub-second even on a 100k+ catalog.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { RecommendationCandidate, UserSignals } from "./types.ts";

const BASE_LIMIT = 300;

export async function fetchCandidates(
  admin: SupabaseClient,
  signals: UserSignals,
  categoryFilter?: string | null,
): Promise<RecommendationCandidate[]> {
  const pool = new Map<string, RecommendationCandidate>();

  const project = (row: Record<string, unknown>): RecommendationCandidate => ({
    video_id: String(row.video_id),
    title: String(row.title ?? ""),
    channel_title: (row.channel_title as string) ?? null,
    category: (row.category as string) ?? null,
    thumbnail_url: (row.thumbnail_url as string) ?? null,
    halal_score: (row.halal_score as number) ?? null,
    published_at: (row.published_at as string) ?? null,
    is_trusted_channel: (row.is_trusted_channel as boolean) ?? null,
    view_count: (row.view_count as number) ?? null,
    moderation_confidence: (row.moderation_confidence as number) ?? null,
    moderation_state: (row.moderation_state as string) ?? null,
    content_language: (row.content_language as string) ?? null,
  });

  const select =
    "video_id,title,channel_title,category,thumbnail_url,halal_score,published_at,is_trusted_channel,view_count,moderation_confidence,moderation_state,content_language";

  const jobs: Array<Promise<unknown>> = [];

  // 1) Freshness pool.
  jobs.push(
    admin
      .from("curated_videos")
      .select(select)
      .in("moderation_state", ["approved", "auto_approved"])
      .eq(categoryFilter ? "category" : "moderation_state", categoryFilter ?? "approved") // noop guard when no filter
      .order("published_at", { ascending: false })
      .limit(BASE_LIMIT)
      .then(({ data }) => {
        for (const row of (data ?? []) as Array<Record<string, unknown>>) {
          pool.set(String(row.video_id), project(row));
        }
      })
      .catch(() => {}),
  );

  // 2) Trending pool (from recommendation_events aggregate).
  if (signals.trendingIds.size > 0) {
    jobs.push(
      admin
        .from("curated_videos")
        .select(select)
        .in("moderation_state", ["approved", "auto_approved"])
        .in("video_id", Array.from(signals.trendingIds).slice(0, 200))
        .then(({ data }) => {
          for (const row of (data ?? []) as Array<Record<string, unknown>>) {
            pool.set(String(row.video_id), project(row));
          }
        })
        .catch(() => {}),
    );
  }

  // 3) Category-affinity pool (top 3 categories, most-recent first).
  const topCategories = Array.from(signals.categoryAffinity.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);
  for (const cat of topCategories) {
    jobs.push(
      admin
        .from("curated_videos")
        .select(select)
        .in("moderation_state", ["approved", "auto_approved"])
        .eq("category", cat)
        .order("published_at", { ascending: false })
        .limit(80)
        .then(({ data }) => {
          for (const row of (data ?? []) as Array<Record<string, unknown>>) {
            pool.set(String(row.video_id), project(row));
          }
        })
        .catch(() => {}),
    );
  }

  // 4) Channel-affinity pool (top 5 channels).
  const topChannels = Array.from(signals.channelAffinity.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c);
  for (const ch of topChannels) {
    jobs.push(
      admin
        .from("curated_videos")
        .select(select)
        .in("moderation_state", ["approved", "auto_approved"])
        .eq("channel_title", ch)
        .order("published_at", { ascending: false })
        .limit(30)
        .then(({ data }) => {
          for (const row of (data ?? []) as Array<Record<string, unknown>>) {
            pool.set(String(row.video_id), project(row));
          }
        })
        .catch(() => {}),
    );
  }

  await Promise.all(jobs);
  return Array.from(pool.values());
}
