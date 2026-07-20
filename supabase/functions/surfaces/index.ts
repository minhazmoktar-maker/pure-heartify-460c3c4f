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
import type { SurfaceContext, SurfaceResponse, SurfaceVideo } from "../_shared/surfaces/types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200, cachePrivate = true) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": cachePrivate ? "private, max-age=30" : "public, max-age=60",
      "Vary": "Authorization",
    },
  });
}

async function loadBlockedChannels(service: any, userId: string | null): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const { data: bc } = await service.from("blocked_creators").select("channel_id");
    for (const r of bc ?? []) if ((r as any).channel_id) set.add((r as any).channel_id);
    if (userId) {
      const { data: ub } = await service.from("user_blocks").select("channel_id").eq("user_id", userId);
      for (const r of ub ?? []) if ((r as any).channel_id) set.add((r as any).channel_id);
    }
  } catch (e) {
    console.warn("[surfaces] blocklist load failed", (e as Error).message);
  }
  return set;
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

    const isPremium = userId ? await hasActivePremium(service, userId).catch(() => false) : false;
    const sessionId = String(body?.session_id ?? "anon");
    const contentLanguages: string[] = Array.isArray(body?.content_languages)
      ? body.content_languages.filter((s: unknown) => typeof s === "string")
      : [];
    const kidsMode = Boolean(body?.kids_mode);

    // Kick off parallel context loads.
    const [blockedChannels, hiddenVideos, impressions] = await Promise.all([
      loadBlockedChannels(service, userId),
      loadHiddenVideos(service, userId),
      userId
        ? loadImpressions({ userId, service } as SurfaceContext)
        : Promise.resolve(new Map<string, number>()),
    ]);

    const ctx: SurfaceContext = {
      userId, sessionId, isPremium, contentLanguages, kidsMode,
      blockedChannels, hiddenVideos, supabase: service, service,
    };

    const started = Date.now();
    const retriever = RETRIEVERS[surface];
    const raw = await retriever(ctx);
    const poolSize = raw.length;
    const filtered = runUniversalFilters(raw as SurfaceVideo[], ctx, impressions);
    const picked = enforceContract(filtered, contract);
    const stats = computeStats(picked, contract);
    const guarantees = checkGuarantees(picked, contract, stats);

    const resp: SurfaceResponse = {
      surface,
      items: picked,
      meta: {
        took_ms: Date.now() - started,
        pool_size: poolSize,
        guarantees,
        stats,
        source: `surfaces_v2:${surface}`,
      },
    };

    // Log retrieval telemetry (fire-and-forget)
    if (userId) {
      service.from("recommendation_events").insert({
        user_id: userId, video_id: picked[0]?.video_id ?? "-",
        event_type: "retrieval", surface, session_id: sessionId,
        provider: "surfaces_v2", signals: { stats, guarantees, pool_size: poolSize, took_ms: resp.meta.took_ms },
      }).then(() => {}, () => {});
    }

    return json(resp, 200, Boolean(userId));
  } catch (e) {
    console.error("[surfaces] error", e);
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});
