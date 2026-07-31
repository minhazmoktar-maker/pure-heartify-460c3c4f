/**
 * SURFACES v2 — independent per-surface assembly dispatcher.
 *
 * One HTTP endpoint, but each surface is retrieved by its own SQL and its
 * own scoring — no shared candidate pool. Universal filters (blocklist,
 * kids-mode, premium gate, impression penalty, blocked creators) are
 * applied uniformly after retrieval and before contract enforcement.
 *
 * Request:  POST { surface: <name>, session_id, content_languages? }
 * Response: { surface, items, meta: { took_ms, guarantees, stats, ... } }
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getCallerUserId, hasActivePremium } from "../_shared/entitlements.ts";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";
import { CONTRACTS, type SurfaceName } from "../_shared/surfaces/contracts.ts";
import { RETRIEVERS } from "../_shared/surfaces/retrievers.ts";
import { runUniversalFilters, loadImpressions } from "../_shared/surfaces/filters.ts";
import { enforceContract, computeStats, checkGuarantees } from "../_shared/surfaces/diversity.ts";
import { loadFeedConfig } from "../_shared/surfaces/config.ts";
import type { SurfaceContext, SurfaceResponse, SurfaceVideo } from "../_shared/surfaces/types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Coarse device/browser classification from the UA — used as a cold-start signal. */
function classifyClient(ua: string): { deviceClass: string; browser: string } {
  const u = (ua ?? "").toLowerCase();
  const deviceClass = /ipad|tablet/.test(u)
    ? "tablet"
    : /mobi|android|iphone/.test(u)
    ? "phone"
    : "desktop";
  const browser = /edg\//.test(u)
    ? "edge"
    : /chrome|crios/.test(u)
    ? "chrome"
    : /firefox|fxios/.test(u)
    ? "firefox"
    : /safari/.test(u)
    ? "safari"
    : "other";
  return { deviceClass, browser };
}


function json(body: unknown, status = 200, cachePrivate = true) {
  // T4 — Anon-only edge cache + SWR hydration.
  //   Signed-in (cachePrivate=true): `private` so no shared cache can ever
  //     serve one user's personalized surface to another. SWR lets the
  //     browser paint instantly on repeat visits while it refreshes in the
  //     background.
  //   Anonymous (cachePrivate=false): `public` with `s-maxage` allows any
  //     intermediate CDN to serve identical anon responses. Surfaces marked
  //     `requiresAuth` never take this branch, so personalized data is never
  //     cached publicly. `Vary: Authorization` guarantees signed-in requests
  //     are never answered from the anon cache entry.
  const cacheControl = cachePrivate
    ? "private, max-age=30, stale-while-revalidate=120"
    : "public, max-age=60, s-maxage=120, stale-while-revalidate=300";
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": cacheControl,
      "Vary": "Authorization",
    },
  });
}

async function loadBlockedChannels(_service: any, _userId: string | null): Promise<Set<string>> {
  // Admin-level creator blocks are enforced at ingest time by a DB trigger
  // against `blocked_creators.pattern`, so the candidate pool is already
  // scrubbed. `user_blocks` is user↔user (blocker_id / blocked_user_id),
  // not a channel blocklist, so it does not belong here. Return empty to
  // avoid firing SQL against columns that don't exist.
  return new Set();
}

async function loadHiddenVideos(service: any, userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  try {
    const { data } = await service.from("user_hidden_videos").select("video_id").eq("user_id", userId).limit(500);
    return new Set((data ?? []).map((r: any) => r.video_id));
  } catch {
    return new Set();
  }
}

/**
 * Writes one row per assembled surface into `feed_diversity_metrics`,
 * including the full retrieval trace the admin per-user trace view reads.
 * Fire-and-forget: never blocks or fails the response.
 */
function logMetrics(service: any, m: {
  userId: string | null; sessionId: string; surface: string; variant: string;
  picked: SurfaceVideo[]; stats: any; guarantees: any; poolSize: number; tookMs: number;
  diversityLevel: number; uiLanguage: string | null; deviceClass: string; browser: string;
  coldStartStrategy: string | null; configVersion: string; trace: Record<string, unknown>;
}) {
  (async () => {
    try {
      const ids = m.picked.map((v) => v.video_id);
      const perChannel = new Map<string, number>();
      for (const v of m.picked) {
        const c = v.channel_id ?? `_${v.channel_title ?? "u"}`;
        perChannel.set(c, (perChannel.get(c) ?? 0) + 1);
      }
      const duplicates = ids.length - new Set(ids).size;

      // Self-overlap vs this user's previous assembly of the same surface.
      let selfOverlap: number | null = null;
      if (m.userId && ids.length) {
        const { data: prev } = await service
          .from("feed_diversity_metrics")
          .select("item_ids")
          .eq("user_id", m.userId).eq("surface", m.surface)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const prevIds: string[] = (prev as { item_ids?: string[] } | null)?.item_ids ?? [];
        if (prevIds.length) {
          const prevSet = new Set(prevIds);
          const shared = ids.filter((id) => prevSet.has(id)).length;
          selfOverlap = Number((shared / ids.length).toFixed(4));
        }
      }

      await service.from("feed_diversity_metrics").insert({
        user_id: m.userId,
        session_id: m.sessionId,
        surface: m.surface,
        variant: m.variant,
        cold_start: Boolean(m.coldStartStrategy),
        cold_start_strategy: m.coldStartStrategy,
        diversity_level: m.diversityLevel,
        ui_language: m.uiLanguage,
        device_class: m.deviceClass,
        browser: m.browser,
        config_version: m.configVersion,
        item_count: ids.length,
        item_ids: ids,
        pool_size: m.poolSize,
        distinct_channels: m.stats.distinctChannels,
        distinct_categories: m.stats.distinctCategories,
        distinct_languages: m.stats.distinctLanguages,
        top_language_share: m.stats.topLanguageShare,
        fresh_share: m.stats.freshShare,
        max_per_channel: Math.max(0, ...Array.from(perChannel.values())),
        duplicate_count: duplicates,
        self_overlap: selfOverlap,
        took_ms: m.tookMs,
        guarantees: m.guarantees,
        trace: m.trace,
      });
    } catch (e) {
      console.warn("[surfaces] metrics log failed", (e as Error).message);
    }
  })();
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const surface = String(body?.surface ?? "") as SurfaceName;
    const contract = CONTRACTS[surface];
    if (!contract) return json({ error: "unknown_surface", surface }, 400);

    const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Auth + rate-limit
    const userId = await getCallerUserId(req).catch(() => null);
    if (contract.requiresAuth && !userId) return json({ error: "auth_required" }, 401);

    const identity = getClientIdentity(req, userId);
    const limited = await enforceRateLimit(service, {
      identity, action: `surface:${surface}`, limit: 120, windowSeconds: 60,
    });
    if (limited) return json({ error: "rate_limited" }, 429);

    const isPremium = userId ? await hasActivePremium(userId).catch(() => false) : false;
    const sessionId = String(body?.session_id ?? "anon");
    const contentLanguages: string[] = Array.isArray(body?.content_languages)
      ? body.content_languages.filter((s: unknown) => typeof s === "string")
      : [];
    const kidsMode = Boolean(body?.kids_mode);
    const uiLanguage = typeof body?.ui_language === "string" ? body.ui_language.slice(0, 8) : null;
    const recentTopics: string[] = Array.isArray(body?.recent_topics)
      ? body.recent_topics.filter((s: unknown) => typeof s === "string").slice(0, 8)
      : [];
    const { deviceClass: uaDevice, browser: uaBrowser } = classifyClient(req.headers.get("user-agent") ?? "");
    const deviceClass = typeof body?.device_class === "string" ? body.device_class.slice(0, 16) : uaDevice;
    const browser = uaBrowser;

    // Cross-rail dedup: ids already claimed by other rails / pages.
    const rawExclude = Array.isArray(body?.exclude_ids) ? body.exclude_ids : [];
    const excludeIds = new Set<string>(
      rawExclude
        .filter((s: unknown): s is string => typeof s === "string")
        .map((s: string) => s.slice(0, 24))
        .slice(0, 1500),
    );

    // Runtime config — kill-switch / weights are read per request so ops can
    // roll the slider-personalized feed back without a redeploy.
    const config = await loadFeedConfig(service);

    // Kick off parallel context loads.
    const [blockedChannels, hiddenVideos, impressions, prefsRes] = await Promise.all([
      loadBlockedChannels(service, userId),
      loadHiddenVideos(service, userId),
      userId
        ? loadImpressions({ userId, service } as SurfaceContext)
        : Promise.resolve(new Map<string, number>()),
      userId
        ? service.from("user_locale_preferences")
            .select("diversity_level, ui_language, strict_halal, content_languages").eq("user_id", userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const prefs = (prefsRes as {
      data: {
        diversity_level?: number; ui_language?: string;
        strict_halal?: boolean; content_languages?: string[];
      } | null;
    }).data;
    const bodyLevel = Number(body?.diversity_level);
    const diversityLevel = config.sliderEnabled
      ? Math.max(0, Math.min(100, Number.isFinite(bodyLevel) ? bodyLevel : (prefs?.diversity_level ?? 50)))
      : 50;

    // Strict Halal defaults to ON. The stored preference is authoritative for
    // signed-in users; the body flag only applies to anonymous callers so a
    // tampered client can never weaken another account's safety setting.
    const strictHalal = userId
      ? prefs?.strict_halal !== false
      : body?.strict_halal !== false;

    // Language: prefer explicit body list, else the stored preference.
    const effectiveLanguages = contentLanguages.length
      ? contentLanguages
      : (Array.isArray(prefs?.content_languages) ? prefs!.content_languages! : []);

    const trace: { step: string; detail?: Record<string, unknown> }[] = [];
    const ctx: SurfaceContext = {
      userId, sessionId, isPremium, contentLanguages: effectiveLanguages, strictHalal, kidsMode,
      blockedChannels, hiddenVideos, supabase: service, service,
      diversityLevel, deviceClass, browser, recentTopics, config, trace,
    };


    // Experiment bucketing (falls back to a config-derived variant).
    let variant = config.sliderEnabled ? `slider_${config.version}` : "legacy_killswitch";
    if (userId) {
      try {
        // Service-role calls have no auth.uid(), so the user id is passed as
        // the sticky bucketing key.
        const { data: v } = await service.rpc("assign_experiment_variant", {
          _experiment_key: "feed_slider_v3", _anon_key: userId,
        });
        if (typeof v === "string" && v) variant = v;
      } catch { /* experiment not running — keep config variant */ }
    }

    // Slider raises/lowers the per-channel cap within the contract.
    const cap = diversityLevel >= 70
      ? config.perChannelCap.high
      : diversityLevel >= 35
      ? config.perChannelCap.mid
      : config.perChannelCap.low;
    const effectiveContract = { ...contract, maxPerChannel: Math.min(contract.maxPerChannel + 1, cap) };

    const started = Date.now();
    const retriever = RETRIEVERS[surface];
    const raw = await retriever(ctx);
    const poolSize = raw.length;
    const universal = runUniversalFilters(raw as SurfaceVideo[], ctx, impressions);
    // Server-side cross-rail exclude — nothing already shown elsewhere
    // reaches the wire from this surface.
    const filtered = excludeIds.size
      ? universal.filter((v) => !excludeIds.has(v.video_id))
      : universal;
    const picked = enforceContract(filtered, effectiveContract);
    const stats = computeStats(picked, effectiveContract);
    const guarantees = checkGuarantees(picked, effectiveContract, stats);

    trace.push({
      step: "filters",
      detail: {
        pool: poolSize, after_universal: universal.length,
        excluded_by_client: universal.length - filtered.length,
        picked: picked.length, max_per_channel: effectiveContract.maxPerChannel,
        strict_halal: strictHalal, content_languages: effectiveLanguages,
      },
    });

    const traceMeta = {
      config_version: config.version,
      slider_enabled: config.sliderEnabled,
      slider_disabled_reason: config.disabledReason,
      diversity_level: diversityLevel,
      variant,
      device_class: deviceClass,
      browser,
      ui_language: uiLanguage ?? prefs?.ui_language ?? null,
      strict_halal: strictHalal,
      content_languages: effectiveLanguages,
      recent_topics: recentTopics,
      weights: config.weights,
      cold_start_strategy: (ctx as any).coldStartStrategy ?? null,
      benefit_arm: (ctx as any).benefitArm ?? null,
      steps: trace,
    };


    const resp: SurfaceResponse = {
      surface,
      items: picked,
      meta: {
        took_ms: Date.now() - started,
        pool_size: poolSize,
        guarantees,
        stats,
        source: `surfaces_v2:${surface}`,
        trace: traceMeta,
      },
    };

    // Per-request diversity + trace telemetry (fire-and-forget).
    logMetrics(service, {
      userId, sessionId, surface, variant, picked, stats, guarantees,
      poolSize, tookMs: resp.meta.took_ms, diversityLevel,
      uiLanguage: traceMeta.ui_language, deviceClass, browser,
      coldStartStrategy: traceMeta.cold_start_strategy, configVersion: config.version,
      trace: traceMeta,
    });

    // Log retrieval telemetry (fire-and-forget)
    if (userId) {
      service.from("recommendation_events").insert({
        user_id: userId, video_id: picked[0]?.video_id ?? "-",
        event_type: "retrieval", surface, session_id: sessionId,
        provider: "surfaces_v2", signals: { stats, guarantees, pool_size: poolSize, took_ms: resp.meta.took_ms },
      }).then(() => {}, () => {});
    }

    // Force private cache when the caller sent an exclude list — that
    // response is session-specific and must never be shared.
    return json(resp, 200, Boolean(userId) || excludeIds.size > 0);
  } catch (e) {
    console.error("[surfaces] error", e);
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});
