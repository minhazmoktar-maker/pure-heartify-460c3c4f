/**
 * Gathers all per-user signals used by any recommendation provider.
 *
 * This is deliberately provider-agnostic — the returned UserSignals object
 * is the contract every provider consumes. Swap or extend the provider,
 * this stays stable.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { RecommendationContext, UserSignals } from "./types.ts";

const AFFINITY_HALF_LIFE_DAYS = 14;

function decayWeight(daysAgo: number): number {
  return Math.pow(0.5, daysAgo / AFFINITY_HALF_LIFE_DAYS);
}

function buildContext(now: Date = new Date()): RecommendationContext {
  const hour = now.getUTCHours();
  const dow = now.getUTCDay();
  const bucket: RecommendationContext["timeBucket"] =
    hour < 6 ? "fajr" :
    hour < 11 ? "morning" :
    hour < 14 ? "midday" :
    hour < 17 ? "afternoon" :
    hour < 20 ? "maghrib" : "night";
  let isRamadan = false;
  let isLastTen = false;
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric", month: "numeric",
    }).formatToParts(now);
    const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const m = g("month"); const d = g("day");
    isRamadan = m === 9;
    isLastTen = isRamadan && d >= 21;
  } catch { /* ignore */ }
  return { hour, dayOfWeek: dow, isRamadan, isLastTen, isJummuah: dow === 5, timeBucket: bucket };
}

function normalize(map: Map<string, number>): Map<string, number> {
  const max = Math.max(1, ...map.values());
  const out = new Map<string, number>();
  for (const [k, v] of map) out.set(k, v / max);
  return out;
}

export async function gatherSignals(
  admin: SupabaseClient,
  userId: string | null,
): Promise<UserSignals> {
  // Empty scaffold — filled in parallel below.
  const signals: UserSignals = {
    userId,
    interests: [],
    favoriteCategories: [],
    watchedVideoIds: new Set(),
    recentVideoIds: [],
    favoriteVideoIds: new Set(),
    doseVideoIds: new Set(),
    categoryAffinity: new Map(),
    channelAffinity: new Map(),
    sessionChannelIds: new Set(),
    trendingIds: new Set(),
    heartifyTrendingIds: new Set(),
    hiddenGemIds: new Set(),
    dismissedVideoIds: new Set(),
    blockedChannelPatterns: [],
    recentImpressionCounts: new Map(),
    contentLanguages: [],
    diversityLevel: 50,
    context: buildContext(),
  };

  const nowMs = Date.now();
  const sessionCutoffMs = nowMs - 60 * 60 * 1000; // 1h

  // All independent — run in parallel, tolerate failures per query.
  const jobs: Array<Promise<unknown>> = [];

  // Trending — global signal, always fetched.
  jobs.push(
    admin
      .rpc("get_trending_video_ids", { _limit: 200, _window_hours: 336 })
      .then(({ data }) => {
        for (const row of (data ?? []) as Array<{ video_id: string }>) {
          signals.trendingIds.add(row.video_id);
        }
      })
      .catch(() => {}),
  );

  if (userId) {
    // Interests + favorite categories.
    jobs.push(
      admin
        .from("user_interests")
        .select("interest")
        .eq("user_id", userId)
        .then(({ data }) => {
          signals.interests = ((data ?? []) as Array<{ interest: string }>)
            .map((r) => r.interest?.toLowerCase().trim())
            .filter(Boolean);
        })
        .catch(() => {}),
    );
    jobs.push(
      admin
        .from("favorite_categories")
        .select("category")
        .eq("user_id", userId)
        .then(({ data }) => {
          signals.favoriteCategories = ((data ?? []) as Array<{ category: string }>)
            .map((r) => r.category)
            .filter(Boolean);
          for (const c of signals.favoriteCategories) {
            signals.categoryAffinity.set(c, (signals.categoryAffinity.get(c) ?? 0) + 3);
          }
        })
        .catch(() => {}),
    );

    // Favorites — strong positive signal.
    jobs.push(
      admin
        .from("favorites")
        .select("video_id, channel_title, category, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200)
        .then(({ data }) => {
          for (const row of (data ?? []) as Array<{
            video_id: string;
            channel_title: string | null;
            category: string | null;
            created_at: string;
          }>) {
            signals.favoriteVideoIds.add(row.video_id);
            const days = Math.max(0, (nowMs - new Date(row.created_at).getTime()) / 86400000);
            const w = decayWeight(days) * 2;
            if (row.category) signals.categoryAffinity.set(row.category, (signals.categoryAffinity.get(row.category) ?? 0) + w);
            if (row.channel_title) signals.channelAffinity.set(row.channel_title, (signals.channelAffinity.get(row.channel_title) ?? 0) + w);
          }
        })
        .catch(() => {}),
    );

    // Watch history — recency-weighted category/channel affinity.
    jobs.push(
      admin
        .from("watch_history")
        .select("video_id, channel_title, category, watched_at")
        .eq("user_id", userId)
        .order("watched_at", { ascending: false })
        .limit(200)
        .then(({ data }) => {
          const rows = ((data ?? []) as Array<{
            video_id: string;
            channel_title: string | null;
            category: string | null;
            watched_at: string;
          }>);
          signals.recentVideoIds = rows.slice(0, 20).map((r) => r.video_id);
          for (const row of rows) {
            signals.watchedVideoIds.add(row.video_id);
            const ts = new Date(row.watched_at).getTime();
            const days = Math.max(0, (nowMs - ts) / 86400000);
            const w = decayWeight(days);
            if (row.category) signals.categoryAffinity.set(row.category, (signals.categoryAffinity.get(row.category) ?? 0) + w);
            if (row.channel_title) signals.channelAffinity.set(row.channel_title, (signals.channelAffinity.get(row.channel_title) ?? 0) + w);
            if (ts >= sessionCutoffMs && row.channel_title) signals.sessionChannelIds.add(row.channel_title);
          }
        })
        .catch(() => {}),
    );

    // Daily Dose completions.
    jobs.push(
      admin
        .from("dose_completions")
        .select("video_id, completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(100)
        .then(({ data }) => {
          for (const row of (data ?? []) as Array<{ video_id: string; completed_at: string }>) {
            signals.doseVideoIds.add(row.video_id);
            signals.watchedVideoIds.add(row.video_id);
          }
        })
        .catch(() => {}),
    );

    // Locale preferences — language-aware ranking + diversity control.
    jobs.push(
      admin
        .from("user_locale_preferences")
        .select("content_languages, diversity_level, auto_personalize")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          if (data.auto_personalize !== false && Array.isArray(data.content_languages)) {
            signals.contentLanguages = data.content_languages as string[];
          }
          if (typeof data.diversity_level === "number") {
            signals.diversityLevel = data.diversity_level;
          }
        })
        .catch(() => {}),
    );
  }

  await Promise.all(jobs);

  signals.categoryAffinity = normalize(signals.categoryAffinity);
  signals.channelAffinity = normalize(signals.channelAffinity);
  return signals;
}
