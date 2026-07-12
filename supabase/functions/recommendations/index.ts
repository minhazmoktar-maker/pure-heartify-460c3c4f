/**
 * Recommendation endpoint.
 *
 * POST /recommendations
 *   body: { limit?, surface?, categoryFilter?, sessionId?, excludeWatched? }
 *   → { recommendations: [{ video, score, reasons, signals }], provider, generatedAt }
 *
 * POST /recommendations/event
 *   body: { videoId, eventType: "impression"|"click"|"dismiss"|"convert", surface?, sessionId?, score?, reasons? }
 *   → 204
 *
 * Anonymous users get a cold-start feed (trending + freshness). Signed-in users
 * get the full multi-signal blend. Every response captures per-item reasons so
 * developers can inspect why anything ranked where it did.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getRecommendationProvider } from "../_shared/recommendations/providers.ts";
import { gatherSignals } from "../_shared/recommendations/signals.ts";
import { fetchCandidates } from "../_shared/recommendations/candidates.ts";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";
import { hasActivePremium } from "../_shared/entitlements.ts";
import { toPgVector } from "../_shared/embed.ts";
import { readThrough } from "../_shared/cache.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function resolveUser(req: Request): Promise<string | null> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await admin.auth.getUser(jwt);
  return data?.user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const isEvent = url.pathname.endsWith("/event");

  try {
    const userId = await resolveUser(req);

    // H2 mitigation: throttle abusive callers. Rec queries are expensive
    // (candidate fetch + LLM signals) so we cap even authenticated users.
    // Event ingestion gets a much higher ceiling since impressions batch.
    const identity = getClientIdentity(req, userId);
    const limited = await enforceRateLimit(admin, {
      identity,
      action: isEvent ? "rec_event" : "rec_query",
      limit: isEvent ? 600 : 60,
      windowSeconds: 60,
    });
    if (limited) {
      return json({ error: "Rate limit exceeded" }, 429);
    }

    const body = await req.json().catch(() => ({}));

    if (isEvent) {
      const videoId = String(body.videoId ?? "");
      const eventType = String(body.eventType ?? "impression");
      if (!videoId || !["impression", "click", "dismiss", "convert"].includes(eventType)) {
        return json({ error: "invalid event" }, 400);
      }
      const { error } = await admin.from("recommendation_events").insert({
        user_id: userId,
        video_id: videoId,
        event_type: eventType,
        score: body.score ?? null,
        reasons: body.reasons ?? [],
        signals: body.signals ?? {},
        surface: body.surface ?? null,
        session_id: body.sessionId ?? null,
        provider: body.provider ?? null,
      });
      if (error) return json({ error: error.message }, 500);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const limit = Math.min(Math.max(Number(body.limit ?? 24), 1), 60);
    const surface = body.surface ? String(body.surface) : "home";
    const categoryFilter = body.categoryFilter ? String(body.categoryFilter) : null;
    const excludeWatched = body.excludeWatched !== false;
    const sessionId = body.sessionId ? String(body.sessionId) : null;

    // Read-through cache — anonymous cold-start only (no userId, no session,
    // no category filter). Keeps the hottest global surface warm without
    // leaking per-user signals across callers. 60s TTL.
    const cacheable = !userId && !sessionId && !categoryFilter;
    if (cacheable) {
      const cacheKey = `rec:anon:${surface}:${limit}:${excludeWatched ? 1 : 0}`;
      const { value, hit } = await readThrough(cacheKey, 60, async () => {
        return await computeRecommendations({
          userId, limit, surface, categoryFilter, excludeWatched, sessionId,
        });
      });
      return json(value, 200, { "X-Cache": hit ? "HIT" : "MISS" });
    }

    const value = await computeRecommendations({
      userId, limit, surface, categoryFilter, excludeWatched, sessionId,
    });
    return json(value);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

interface ComputeArgs {
  userId: string | null;
  limit: number;
  surface: string;
  categoryFilter: string | null;
  excludeWatched: boolean;
  sessionId: string | null;
}

async function computeRecommendations(args: ComputeArgs) {
  const { userId, limit, surface, categoryFilter, excludeWatched, sessionId } = args;
    const provider = getRecommendationProvider();
    const signals = await gatherSignals(admin, userId);
    const candidates = await fetchCandidates(admin, signals, categoryFilter);

    // Semantic recall: expand the candidate pool with videos similar to the
    // user's most-signal-heavy anchor (favorite > recently watched > top trend).
    // Additive to the lexical pool, best-effort, ignored on failure.
    try {
      const anchorIds = [
        ...Array.from(signals.favoriteVideoIds).slice(0, 1),
        ...Array.from(signals.watchedVideoIds).slice(0, 1),
        ...Array.from(signals.trendingIds).slice(0, 1),
      ];
      if (anchorIds.length) {
        const { data: anchors } = await admin
          .from("curated_videos")
          .select("embedding")
          .in("video_id", anchorIds)
          .not("embedding", "is", null)
          .limit(3);
        const vecs = ((anchors ?? []) as Array<{ embedding: number[] | string }>)
          .map((r) => (typeof r.embedding === "string" ? JSON.parse(r.embedding) : r.embedding))
          .filter((v): v is number[] => Array.isArray(v) && v.length === 1536);
        if (vecs.length) {
          // Simple centroid.
          const centroid = new Array(1536).fill(0);
          for (const v of vecs) for (let i = 0; i < 1536; i++) centroid[i] += v[i];
          for (let i = 0; i < 1536; i++) centroid[i] /= vecs.length;
          const { data: neighbors } = await admin.rpc("match_curated_videos", {
            query_embedding: toPgVector(centroid) as unknown as number[],
            match_count: 60,
            category_filter: categoryFilter,
            exclude_premium: false,
          });
          const existing = new Set(candidates.map((c) => c.video_id));
          for (const n of (neighbors ?? []) as Array<Record<string, unknown>>) {
            const id = n.video_id as string;
            if (!id || existing.has(id)) continue;
            existing.add(id);
            candidates.push({
              video_id: id,
              title: (n.title as string) ?? "",
              channel_title: (n.channel_title as string) ?? null,
              category: (n.category as string) ?? null,
              thumbnail_url: (n.thumbnail_url as string) ?? null,
              halal_score: (n.halal_score as number) ?? null,
              published_at: (n.published_at as string) ?? null,
              is_trusted_channel: null,
              view_count: null,
              moderation_confidence: null,
              moderation_state: "approved",
              content_language: null,
            });
          }
        }
      }
    } catch (e) {
      console.warn("[rec] semantic recall skipped:", (e as Error).message);
    }

    const recommendations = await provider.recommend(signals, candidates, {
      limit,
      surface,
      categoryFilter,
      excludeWatched,
    });

    // Server-side premium gate for recommendations.
    const viewerIsPremium = await hasActivePremium(userId);
    let filteredRecs = recommendations;
    if (!viewerIsPremium && recommendations.length > 0) {
      const ids = recommendations.map((r) => r.video.video_id).filter(Boolean);
      const { data: premiumRows } = await admin
        .from("curated_videos")
        .select("video_id")
        .in("video_id", ids)
        .eq("is_premium_only", true);
      const premiumSet = new Set((premiumRows ?? []).map((r) => r.video_id));
      filteredRecs = recommendations.filter((r) => !premiumSet.has(r.video.video_id));
    }

    // Fire-and-forget impression logging (batched insert).
    if (filteredRecs.length) {
      admin
        .from("recommendation_events")
        .insert(
          filteredRecs.map((r) => ({
            user_id: userId,
            video_id: r.video.video_id,
            event_type: "impression",
            score: r.score,
            reasons: r.reasons,
            signals: r.signals,
            surface,
            session_id: sessionId,
            provider: provider.name,
          })),
        )
        .then(() => {})
        .catch(() => {});
    }

    return {
      recommendations: filteredRecs,
      provider: provider.name,
      generatedAt: new Date().toISOString(),
      viewer: { isPremium: viewerIsPremium },
      signalsSummary: {
        interests: signals.interests.length,
        favorites: signals.favoriteVideoIds.size,
        watched: signals.watchedVideoIds.size,
        doses: signals.doseVideoIds.size,
        topCategories: Array.from(signals.categoryAffinity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topChannels: Array.from(signals.channelAffinity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
        trendingPoolSize: signals.trendingIds.size,
      },
    };
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}
