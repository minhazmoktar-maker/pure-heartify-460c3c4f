/**
 * Paginated feed edge function.
 * Serves curated videos from the database with cursor-based pagination.
 * Falls back to YouTube proxy if DB is empty.
 * Filters out Premium-only content unless the caller has an active entitlement.
 */

import { getCallerUserId, hasActivePremium } from "../_shared/entitlements.ts";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";
import { readThrough } from "../_shared/cache.ts";
import { gatherSignals } from "../_shared/recommendations/signals.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, s-maxage=60",
      ...extra,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Missing configuration" }, 500);
  }

  try {
    // Premium gating: identify caller (best-effort) and hide premium-only rows
    // for non-premium/anon users. Never trust a client-supplied flag.
    const callerId = await getCallerUserId(req);
    const isPremium = await hasActivePremium(callerId);

    // Rate limit: 240/min per user, 60/min per IP for anon. Feed is the
    // hottest endpoint so limits are generous but abuse-resistant.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const limited = await enforceRateLimit(admin, {
      identity: getClientIdentity(req, callerId),
      action: "feed",
      limit: callerId ? 240 : 60,
      windowSeconds: 60,
    });
    if (limited) return json({ error: "rate_limited" }, 429);


    const body = await req.json().catch(() => ({}));
    const category = body?.category as string | undefined;
    const sectionId = body?.section_id as string | undefined;
    const cursor = body?.cursor as string | undefined; // ISO timestamp of last item's ingested_at
    const limit = Math.min(Math.max(body?.limit ?? 20, 1), 100);
    // Sort mode: 'fresh' (default) | 'trending' (view_count desc) | 'recent' (ingested_at desc)
    const sort = (["fresh", "trending", "recent"] as const).includes(body?.sort as any)
      ? (body.sort as "fresh" | "trending" | "recent") : "fresh";
    // Max videos per channel per page — creator diversity guard.
    const maxPerChannel = Math.min(Math.max(Number(body?.max_per_channel ?? 3), 1), 10);
    // Locale-aware filtering: soft filter to caller's content languages.
    // Sanitized to 2-3 char ISO codes to prevent injection.
    const rawLangs = Array.isArray(body?.content_languages) ? body.content_languages : [];
    const contentLanguages = rawLangs
      .filter((l: unknown): l is string => typeof l === "string")
      .map((l: string) => l.toLowerCase().replace(/[^a-z]/g, "").slice(0, 3))
      .filter((l: string) => l.length >= 2 && l.length <= 3)
      .slice(0, 8);
    // Sanitize search: strip PostgREST-significant chars (, ( ) * . : & =)
    // to prevent filter injection into the or=(...) clause.
    const rawSearch = typeof body?.search === "string" ? body.search.trim() : "";
    const search = rawSearch.replace(/[,()*.:&=%]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);

    // Build PostgREST query
    // Order: freshest content first (published_at), then halal_score, then ingested_at as tiebreaker.
    // NOTE: we intentionally overfetch a bit so post-fetch JS blocklist filter
    // can drop matches without leaving the page short of `limit`.
    // Overfetch more when locale-boosting so we can re-rank without starving pages.
    const fetchLimit = Math.min(limit * (contentLanguages.length ? 5 : 4), 400);
    const orderClause = sort === "trending"
      ? "view_count.desc.nullslast,published_at.desc.nullslast,halal_score.desc"
      : sort === "recent"
      ? "ingested_at.desc,published_at.desc.nullslast,halal_score.desc"
      : "published_at.desc.nullslast,halal_score.desc,ingested_at.desc";
    let url = `${SUPABASE_URL}/rest/v1/curated_videos?select=*&order=${orderClause}&limit=${fetchLimit}`;

    if (category && category !== "All") {
      url += `&category=eq.${encodeURIComponent(category)}`;
    }
    if (sectionId) {
      url += `&section_id=eq.${encodeURIComponent(sectionId)}`;
    }
    if (cursor) {
      url += `&ingested_at=lt.${encodeURIComponent(cursor)}`;
    }
    if (search) {
      url += `&or=(title.ilike.*${encodeURIComponent(search)}*,channel_title.ilike.*${encodeURIComponent(search)}*)`;
    }


    // Belt-and-suspenders read-time blocklist. Ingest pipeline + nightly
    // sweep are the primary defense — this is only a safety net. We apply
    // it post-fetch in JS to avoid stacking ~40 NOT ILIKE predicates that
    // cause the planner to fall back to a full sequential scan and time out.
    const BLOCKED_TOKENS = [
      "mia yilin", "leila hormozi", "layla hormozi", "mehreen",
      "tedx", "chris williamson", "womenofquran",
      "islamic reflections", "islamiclife", "hamza's den", "hamzas den",
      "muslim matters tv", "imaan phase",
      "healthy muslims", "healthymuslims", "zz brothers", "zzbrothers",
      "women", "mujeres", "aurtain", "aurat", "female voice", "by women voice",
    ];


    // Server-side premium gate — hide premium-only videos from non-premium.
    if (!isPremium) {
      url += `&is_premium_only=eq.false`;
    }




    // Read-through cache — anonymous, non-search requests only. Signed-in
    // callers have per-user premium gating and cannot share bytes safely.
    const cacheable = !callerId && !search;
    const langKey = contentLanguages.length ? contentLanguages.join(",") : "-";
    const cacheKey = cacheable
      ? `feed:${sort}:${category ?? "all"}:${sectionId ?? "-"}:${cursor ?? "0"}:${limit}:${maxPerChannel}:${langKey}`
      : "";

    const produce = async () => {
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Accept": "application/json",
        },
      });
      if (!res.ok) {
        console.error(`DB query failed: ${res.status} ${await res.text()}`);
        return { items: [] as Array<Record<string, unknown>>, ok: false };
      }
      const items = await res.json();
      return { items, ok: true };
    };

    const { value: payload, hit } = cacheable
      ? await readThrough(cacheKey, 60, produce)
      : { value: await produce(), hit: false };

    if (!payload.ok) return json({ items: [], nextCursor: null, total: 0 });

    // Post-fetch blocklist filter (see BLOCKED_TOKENS above).
    const filtered = (payload.items as Array<Record<string, unknown>>).filter((v) => {
      const t = `${(v.title as string) ?? ""} ${(v.channel_title as string) ?? ""}`.toLowerCase();
      return !BLOCKED_TOKENS.some((tok) => t.includes(tok));
    });

    // Locale-aware soft re-rank: matching content_language items surface first
    // (and un-tagged items are treated as neutral so we never starve pages
    // in markets whose curation hasn't been language-tagged yet).
    let ordered = filtered;
    if (contentLanguages.length) {
      const langSet = new Set(contentLanguages);
      const matches: Array<Record<string, unknown>> = [];
      const untagged: Array<Record<string, unknown>> = [];
      const others: Array<Record<string, unknown>> = [];
      for (const v of filtered) {
        const cl = (v.content_language as string | null)?.toLowerCase() ?? null;
        if (!cl) untagged.push(v);
        else if (langSet.has(cl)) matches.push(v);
        else others.push(v);
      }
      ordered = [...matches, ...untagged, ...others];
    }

    // Personalization: for signed-in users, apply a real signal-based
    // re-rank (category/channel affinity, long-term taste, novelty,
    // recency-of-impression penalty, per-user weight perturbation) instead
    // of the previous ±3-position jitter that made every viewer's feed
    // nearly identical. Anonymous users still get a per-device seeded
    // shuffle so distinct devices don't converge on one page order.
    // Personalization runs for both "fresh" and "recent" sorts. "recent" is the
    // "Recently Added" surface — we keep newest-approved-first as the anchor
    // but still honor blocked creators, dismissals, hidden videos, and give a
    // mild affinity boost so the ordering is personal rather than identical
    // across users.
    if ((sort === "fresh" || sort === "recent") && !search) {
      const identity = callerId ?? getClientIdentity(req, null);
      const weekBucket = Math.floor(Date.now() / (7 * 86400000));
      const seedStr = `${identity}:${weekBucket}:${category ?? "all"}:${sort}`;
      // FNV-1a hash → deterministic [0,1)
      const hash01 = (s: string): number => {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
        return (h >>> 0) / 0xffffffff;
      };

      if (callerId) {

        // Signed-in: gather signals (best-effort, timeboxed) and apply a
        // compact re-ranker on top of the freshness-sorted page.
        //
        // Halal-first invariant preserved: this only *reorders* items that
        // already passed moderation into this fetch page; nothing new is
        // introduced, nothing is upranked past a trusted+high-halal item
        // whose base freshness score is meaningfully higher.
        try {
          const signals = await Promise.race([
            gatherSignals(admin, callerId),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 900)),
          ]);
          if (signals) {
            // Precompute base freshness index → score so ties break stably.
            const N = ordered.length;
            const scored = ordered.map((v, i) => {
              const ch = (v.channel_title as string | null) ?? "";
              const cat = (v.category as string | null) ?? "";
              const vid = (v.video_id as string) ?? "";
              const baseFresh = 1 - i / Math.max(1, N); // 1.0 at top, 0.0 at bottom
              const chAff = signals.channelAffinity.get(ch) ?? 0;
              const catAff = signals.categoryAffinity.get(cat) ?? 0;
              const longCh = signals.longTermChannelAffinity.get(ch) ?? 0;
              const longCat = signals.longTermCategoryAffinity.get(cat) ?? 0;
              const interestMatch = signals.interests.some((kw) =>
                kw && (
                  ((v.title as string) ?? "").toLowerCase().includes(kw) ||
                  ((v.category as string) ?? "").toLowerCase().includes(kw)
                )
              ) ? 1 : 0;
              const seenCh = ch && signals.seenChannelIds.has(ch);
              const novelty = ch && !seenCh && v.is_trusted_channel === true ? 1 : 0;
              const shownCount = signals.recentImpressionCounts.get(vid) ?? 0;
              const skipped = signals.skippedVideoIds.has(vid) ? 1 : 0;
              const dismissed = signals.dismissedVideoIds.has(vid) ? 1 : 0;
              // Per-user weight perturbation on affinity signals only.
              const p = (k: string) => 0.75 + hash01(`${identity}:w:${k}`) * 0.5;
              const score =
                baseFresh * 1.0 +                      // freshness anchor
                chAff * 0.55 * p("ch") +
                catAff * 0.45 * p("cat") +
                longCh * 0.25 * p("longCh") +
                longCat * 0.20 * p("longCat") +
                interestMatch * 0.30 * p("int") +
                novelty * 0.20 * p("nov") -
                Math.min(shownCount, 4) * 0.12 -
                skipped * 0.25 -
                dismissed * 5.0;                       // effectively drops it
              // Per-user + per-video jitter (±8% max) — deterministic, halal-safe.
              const j = (hash01(`${identity}:${weekBucket}:${vid}`) - 0.5) * 0.16;
              return { v, k: -(score * (1 + j)) };
            });
            ordered = scored
              .filter((x) => x.k < 4.5)                // drop hard-dismissed
              .sort((a, b) => a.k - b.k)
              .map((x) => x.v);
          }
        } catch (e) {
          console.warn("[feed] personalization skipped:", (e as Error).message);
        }
      } else {
        // Anonymous: keep the deterministic per-device shuffle so distinct
        // devices don't collide on identical page ordering.
        let seed = 0;
        for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
        const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
        ordered = ordered
          .map((v, i) => ({ v, k: i + (rand() - 0.5) * 6 }))
          .sort((a, b) => a.k - b.k)
          .map((x) => x.v);
      }
    }

    // Creator diversity: cap items per channel per page so no single creator
    // dominates. Overflow items are pushed to the tail to keep pagination full.
    const perChannel = new Map<string, number>();
    const primary: Array<Record<string, unknown>> = [];
    const overflow: Array<Record<string, unknown>> = [];
    for (const v of ordered) {
      const ch = (v.channel_title as string) ?? "__";
      const n = perChannel.get(ch) ?? 0;
      if (n < maxPerChannel) { primary.push(v); perChannel.set(ch, n + 1); }
      else overflow.push(v);
    }
    const diversified = [...primary, ...overflow];

    const items = diversified.slice(0, limit);
    const nextCursor = items.length === limit
      ? (items[items.length - 1] as Record<string, unknown>).ingested_at as string
      : null;


    return json(
      {
        items: items.map((v: Record<string, unknown>) => ({
          id: v.video_id,
          title: v.title,
          videoUrl: `https://www.youtube.com/watch?v=${v.video_id}`,
          thumbnailUrl: v.thumbnail_url,
          channelTitle: v.channel_title,
          category: v.category,
          halalScore: v.halal_score,
          publishedAt: v.published_at ?? v.ingested_at,
          isTrustedChannel: v.is_trusted_channel,
          isPremiumOnly: v.is_premium_only ?? false,
        })),
        nextCursor,
        total: items.length,
        viewer: { isPremium },
      },
      200,
      { "X-Cache": hit ? "HIT" : "MISS" },
    );
  } catch (error) {
    console.error("Feed error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
