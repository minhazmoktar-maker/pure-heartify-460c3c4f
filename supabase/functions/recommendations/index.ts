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
import { readThrough, readThroughShared } from "../_shared/cache.ts";
import { observed } from "../_shared/observe.ts";
import {
  derivePrimaryLanguage,
  interleavePrimaryLanguage,
  sanitizeLang,
} from "../_shared/localFirst.ts";

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

Deno.serve(observed("recommendations", async (req) => {
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
      // Use SECURITY DEFINER RPC — guaranteed write path (previous direct
      // insert path silently produced 0 rows across the entire lifetime of
      // the table, starving every trending retriever).
      const { error } = await admin.rpc("log_recommendation_event", {
        _video_id: videoId,
        _event_type: eventType,
        _user_id: userId,
        _score: body.score ?? null,
        _reasons: body.reasons ?? [],
        _signals: body.signals ?? {},
        _surface: body.surface ?? null,
        _session_id: body.sessionId ?? null,
        _provider: body.provider ?? null,
      });
      if (error) return json({ error: error.message }, 500);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const limit = Math.min(Math.max(Number(body.limit ?? 24), 1), 60);
    const surface = body.surface ? String(body.surface) : "home";
    const categoryFilter = body.categoryFilter ? String(body.categoryFilter) : null;
    const excludeWatched = body.excludeWatched !== false;
    const sessionId = body.sessionId ? String(body.sessionId) : null;
    // 80/20 localization standard: the caller's primary (local) language owns
    // 80% of the page, the remaining 20% stays language-diversified.
    const bodyLanguages = (Array.isArray(body.contentLanguages) ? body.contentLanguages : [])
      .map(sanitizeLang)
      .filter((l: string | null): l is string => !!l)
      .slice(0, 8);
    const bodyPrimary =
      derivePrimaryLanguage([body.primaryLanguage]) ?? derivePrimaryLanguage(bodyLanguages);

    // Read-through cache for every anonymous caller (signed-in users keep the
    // fully personalized path). A single warm pool of `limit * 4` candidates is
    // computed per (surface, language, category) and each session gets its own
    // deterministic rotation of that pool, so thousands of simultaneous
    // visitors still see varied feeds while the database does one query per
    // minute instead of one per visitor. 60s TTL.
    if (!userId) {
      const poolSize = Math.min(limit * 4, 60);
      const cacheKey =
        `rec:anon:pool:${surface}:${poolSize}:${excludeWatched ? 1 : 0}:${bodyPrimary ?? "-"}:${categoryFilter ?? "-"}:${(bodyLanguages ?? []).join("|")}`;
      const { value, hit } = await readThrough(cacheKey, 60, async () => {
        return await computeRecommendations({
          userId, limit: poolSize, surface, categoryFilter, excludeWatched,
          sessionId: null, bodyPrimary, bodyLanguages,
        });
      });
      const pool = (value as { recommendations?: unknown[] })?.recommendations ?? [];
      if (!Array.isArray(pool) || pool.length <= limit) {
        return json(value, 200, { "X-Cache": hit ? "HIT" : "MISS" });
      }
      let h = 2166136261;
      for (const ch of sessionId ?? "anon") h = (h ^ ch.charCodeAt(0)) * 16777619 >>> 0;
      const offset = h % pool.length;
      const rotated = Array.from({ length: limit }, (_, i) => pool[(offset + i) % pool.length]);
      return json({ ...(value as Record<string, unknown>), recommendations: rotated }, 200, {
        "X-Cache": hit ? "HIT" : "MISS",
      });
    }

    const value = await computeRecommendations({
      userId, limit, surface, categoryFilter, excludeWatched, sessionId, bodyPrimary, bodyLanguages,
    });
    return json(value);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}));

interface ComputeArgs {
  userId: string | null;
  limit: number;
  surface: string;
  categoryFilter: string | null;
  excludeWatched: boolean;
  sessionId: string | null;
  bodyPrimary?: string | null;
  bodyLanguages?: string[];
}

async function computeRecommendations(args: ComputeArgs) {
  const { userId, limit, surface, categoryFilter, excludeWatched, sessionId, bodyPrimary, bodyLanguages } = args;
    const provider = getRecommendationProvider();
    const signals = await gatherSignals(admin, userId);
    // Anonymous callers have no stored preferences, so without this the
    // language-match scoring rule never fires and the local lane's rows are
    // outranked by the (much larger) English supply before the 80/20
    // interleave ever sees them.
    if (signals.contentLanguages.length === 0 && bodyLanguages?.length) {
      signals.contentLanguages = bodyLanguages;
    }
    const primaryLanguage =
      derivePrimaryLanguage([bodyPrimary]) ?? derivePrimaryLanguage(signals.contentLanguages);
    const candidates = await fetchCandidates(admin, signals, categoryFilter, primaryLanguage);

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
              section_id: (n.section_id as string) ?? null,
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

    // Over-fetch when a local language must own 80% of the page: the
    // interleave can only promote local rows the provider actually returned.
    const scoreLimit = primaryLanguage ? Math.min(limit * 12, 300) : limit;
    const recommendations = await provider.recommend(signals, candidates, {
      limit: scoreLimit,
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

    // 80/20 local-first ordering. Applied after the premium gate so the
    // shipped page — not the raw candidate pool — carries the guaranteed
    // local-language share, with the minority slots language-diversified.
    if (primaryLanguage) {
      filteredRecs = interleavePrimaryLanguage(
        filteredRecs,
        (r) => (r.video as { content_language?: string | null }).content_language ?? null,
        primaryLanguage,
        limit,
      );
    }
    if (filteredRecs.length > limit) filteredRecs = filteredRecs.slice(0, limit);

    // Fire-and-forget impression logging via SECURITY DEFINER RPC.
    // Each row is logged independently — one failure won't sink the batch,
    // and we can't rely on client-role bypass semantics for a bulk insert.
    if (filteredRecs.length) {
      for (const r of filteredRecs) {
        admin
          .rpc("log_recommendation_event", {
            _video_id: r.video.video_id,
            _event_type: "impression",
            _user_id: userId,
            _score: r.score,
            _reasons: r.reasons,
            _signals: r.signals,
            _surface: surface,
            _session_id: sessionId,
            _provider: provider.name,
          })
          .then(() => {})
          .catch(() => {});
      }
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
  const cacheable = status === 200;
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      // Personalized, so browser-only caching. Repeat navigations paint from
      // cache instantly and refresh in the background, which keeps the
      // database out of the loop under heavy concurrent traffic.
      ...(cacheable
        ? {
          "Cache-Control": "private, max-age=90, stale-while-revalidate=300",
          "Vary": "Authorization",
        }
        : { "Cache-Control": "no-store" }),
      ...extra,
    },
  });
}

