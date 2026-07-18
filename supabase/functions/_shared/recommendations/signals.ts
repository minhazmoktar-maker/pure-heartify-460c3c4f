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
const LONG_TERM_HALF_LIFE_DAYS = 180;

function decayWeight(daysAgo: number, halfLife = AFFINITY_HALF_LIFE_DAYS): number {
  return Math.pow(0.5, daysAgo / halfLife);
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
    longTermCategoryAffinity: new Map(),
    longTermChannelAffinity: new Map(),
    sessionChannelIds: new Set(),
    sessionCategoryIds: new Set(),
    seenChannelIds: new Set(),
    trendingIds: new Set(),
    heartifyTrendingIds: new Set(),
    hiddenGemIds: new Set(),
    dismissedVideoIds: new Set(),
    skippedVideoIds: new Set(),
    blockedChannelPatterns: [],
    recentImpressionCounts: new Map(),
    recentChannelImpressionCounts: new Map(),
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

  // Heartify-native trending (72h, weighted by clicks+converts).
  jobs.push(
    admin
      .rpc("get_heartify_trending_ids", { _limit: 200, _window_hours: 72 })
      .then(({ data }) => {
        for (const row of (data ?? []) as Array<{ video_id: string }>) {
          signals.heartifyTrendingIds.add(row.video_id);
        }
      })
      .catch(() => {}),
  );

  // Hidden gems — high-halal, low-exposure promotion pool.
  jobs.push(
    admin
      .rpc("get_hidden_gem_ids", { _limit: 120, _max_impressions: 300 })
      .then(({ data }) => {
        for (const row of (data ?? []) as Array<{ video_id: string }>) {
          signals.hiddenGemIds.add(row.video_id);
        }
      })
      .catch(() => {}),
  );

  // Globally blocked creators — hard filter, all users.
  jobs.push(
    admin
      .from("blocked_creators")
      .select("pattern")
      .then(({ data }) => {
        signals.blockedChannelPatterns = ((data ?? []) as Array<{ pattern: string }>)
          .map((r) => (r.pattern ?? "").toLowerCase().trim())
          .filter(Boolean);
      })
      .catch(() => {}),
  );

  if (userId) {
    // Interests + favorite categories.
    jobs.push(
      admin
        .from("user_interests")
        .select("primary_interest, secondary_interest, exploration_interest")
        .eq("user_id", userId)
        .then(({ data }) => {
          const row = ((data ?? []) as Array<{
            primary_interest: string | null;
            secondary_interest: string | null;
            exploration_interest: string | null;
          }>)[0];
          const weighted = [
            [row?.primary_interest, 3],
            [row?.secondary_interest, 2],
            [row?.exploration_interest, 1],
          ] as const;
          const interests: string[] = [];
          for (const [raw, weight] of weighted) {
            const key = raw?.toLowerCase().trim();
            if (!key) continue;
            interests.push(key);
            signals.categoryAffinity.set(key, (signals.categoryAffinity.get(key) ?? 0) + weight);
            signals.longTermCategoryAffinity.set(key, (signals.longTermCategoryAffinity.get(key) ?? 0) + weight);
          }
          signals.interests = interests;
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
            const wLong = decayWeight(days, LONG_TERM_HALF_LIFE_DAYS) * 2;
            if (row.category) {
              signals.categoryAffinity.set(row.category, (signals.categoryAffinity.get(row.category) ?? 0) + w);
              signals.longTermCategoryAffinity.set(row.category, (signals.longTermCategoryAffinity.get(row.category) ?? 0) + wLong);
            }
            if (row.channel_title) {
              signals.channelAffinity.set(row.channel_title, (signals.channelAffinity.get(row.channel_title) ?? 0) + w);
              signals.longTermChannelAffinity.set(row.channel_title, (signals.longTermChannelAffinity.get(row.channel_title) ?? 0) + wLong);
              signals.seenChannelIds.add(row.channel_title);
            }
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
            const wLong = decayWeight(days, LONG_TERM_HALF_LIFE_DAYS);
            if (row.category) {
              signals.categoryAffinity.set(row.category, (signals.categoryAffinity.get(row.category) ?? 0) + w);
              signals.longTermCategoryAffinity.set(row.category, (signals.longTermCategoryAffinity.get(row.category) ?? 0) + wLong);
            }
            if (row.channel_title) {
              signals.channelAffinity.set(row.channel_title, (signals.channelAffinity.get(row.channel_title) ?? 0) + w);
              signals.longTermChannelAffinity.set(row.channel_title, (signals.longTermChannelAffinity.get(row.channel_title) ?? 0) + wLong);
              signals.seenChannelIds.add(row.channel_title);
            }
            if (ts >= sessionCutoffMs) {
              if (row.channel_title) signals.sessionChannelIds.add(row.channel_title);
              if (row.category) signals.sessionCategoryIds.add(row.category);
            }
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

    // "Not Interested" / hidden — hard-filter memory (persistent).
    jobs.push(
      admin
        .from("user_hidden_videos")
        .select("video_id")
        .eq("user_id", userId)
        .limit(1000)
        .then(({ data }) => {
          for (const row of (data ?? []) as Array<{ video_id: string }>) {
            signals.dismissedVideoIds.add(row.video_id);
          }
        })
        .catch(() => {}),
    );

    // Dismissed via recommendation surface (also hard filter).
    jobs.push(
      admin
        .rpc("get_user_dismissed_video_ids", { _user_id: userId, _limit: 500 })
        .then(({ data }) => {
          for (const row of (data ?? []) as Array<{ video_id: string }>) {
            signals.dismissedVideoIds.add(row.video_id);
          }
        })
        .catch(() => {}),
    );

    // Anti-repeat memory — how many times each video was shown in last 24h.
    jobs.push(
      admin
        .rpc("get_recent_impression_ids", { _user_id: userId, _hours: 24, _limit: 400 })
        .then(({ data }) => {
          for (const row of (data ?? []) as Array<{ video_id: string; shown_count: number }>) {
            signals.recentImpressionCounts.set(row.video_id, Number(row.shown_count) || 1);
          }
        })
        .catch(() => {}),
    );

    // Skipped-video signal: recent impressions with no click/convert are a
    // negative preference. Best-effort: uses recommendation_events directly.
    jobs.push(
      admin
        .from("recommendation_events")
        .select("video_id, event_type, created_at")
        .eq("user_id", userId)
        .gte("created_at", new Date(nowMs - 14 * 86400000).toISOString())
        .order("created_at", { ascending: false })
        .limit(2000)
        .then(({ data }) => {
          const rows = (data ?? []) as Array<{ video_id: string; event_type: string }>;
          const impressed = new Map<string, boolean>();
          const engaged = new Set<string>();
          for (const r of rows) {
            if (r.event_type === "click" || r.event_type === "convert") engaged.add(r.video_id);
            else if (r.event_type === "impression") impressed.set(r.video_id, true);
            else if (r.event_type === "dismiss") signals.dismissedVideoIds.add(r.video_id);
          }
          for (const [vid] of impressed) if (!engaged.has(vid)) signals.skippedVideoIds.add(vid);
        })
        .catch(() => {}),
    );
  }

  await Promise.all(jobs);

  // Per-channel impression pressure derived from per-video impressions and
  // any candidate channel_title we can infer. We approximate here by counting
  // impressions across recent videos grouped by channel — cheap and effective
  // for creator overexposure damping in the ranker.
  // (Populated in the ranker from candidate joins if channel is available.)

  signals.categoryAffinity = normalize(signals.categoryAffinity);
  signals.channelAffinity = normalize(signals.channelAffinity);
  signals.longTermCategoryAffinity = normalize(signals.longTermCategoryAffinity);
  signals.longTermChannelAffinity = normalize(signals.longTermChannelAffinity);
  return signals;
}
