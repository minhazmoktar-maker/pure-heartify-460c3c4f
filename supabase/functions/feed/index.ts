/**
 * Paginated feed edge function.
 * Serves curated videos from the database with cursor-based pagination.
 * Falls back to YouTube proxy if DB is empty.
 * Filters out Premium-only content unless the caller has an active entitlement.
 */

import { getCallerUserId, hasActivePremium } from "../_shared/entitlements.ts";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";
import { readThrough } from "../_shared/cache.ts";
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
    // Sanitize search: strip PostgREST-significant chars (, ( ) * . : & =)
    // to prevent filter injection into the or=(...) clause.
    const rawSearch = typeof body?.search === "string" ? body.search.trim() : "";
    const search = rawSearch.replace(/[,()*.:&=%]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);

    // Build PostgREST query
    // Order: freshest content first (published_at), then halal_score, then ingested_at as tiebreaker.
    // NOTE: we intentionally overfetch a bit so post-fetch JS blocklist filter
    // can drop matches without leaving the page short of `limit`.
    const fetchLimit = Math.min(limit * 2, 200);
    let url = `${SUPABASE_URL}/rest/v1/curated_videos?select=*&order=published_at.desc.nullslast,halal_score.desc,ingested_at.desc&limit=${fetchLimit}`;

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
    const cacheKey = cacheable
      ? `feed:${category ?? "all"}:${sectionId ?? "-"}:${cursor ?? "0"}:${limit}`
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
    const items = filtered.slice(0, limit);
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
