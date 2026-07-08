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

    const provider = getRecommendationProvider();
    const signals = await gatherSignals(admin, userId);
    const candidates = await fetchCandidates(admin, signals, categoryFilter);
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
    if (recommendations.length) {
      admin
        .from("recommendation_events")
        .insert(
          recommendations.map((r) => ({
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

    return json({
      recommendations,
      provider: provider.name,
      generatedAt: new Date().toISOString(),
      signalsSummary: {
        interests: signals.interests.length,
        favorites: signals.favoriteVideoIds.size,
        watched: signals.watchedVideoIds.size,
        doses: signals.doseVideoIds.size,
        topCategories: Array.from(signals.categoryAffinity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topChannels: Array.from(signals.channelAffinity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
        trendingPoolSize: signals.trendingIds.size,
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
