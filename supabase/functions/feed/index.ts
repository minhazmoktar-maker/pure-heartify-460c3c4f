/**
 * Paginated feed edge function.
 * Serves curated videos from the database with cursor-based pagination.
 * Falls back to YouTube proxy if DB is empty.
 * Filters out Premium-only content unless the caller has an active entitlement.
 */

import { getCallerUserId, hasActivePremium } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, s-maxage=60",
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

    const body = await req.json().catch(() => ({}));
    const category = body?.category as string | undefined;
    const sectionId = body?.section_id as string | undefined;
    const cursor = body?.cursor as string | undefined; // ISO timestamp of last item's ingested_at
    const limit = Math.min(Math.max(body?.limit ?? 20, 1), 50);
    // Sanitize search: strip PostgREST-significant chars (, ( ) * . : & =)
    // to prevent filter injection into the or=(...) clause.
    const rawSearch = typeof body?.search === "string" ? body.search.trim() : "";
    const search = rawSearch.replace(/[,()*.:&=%]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);

    // Build PostgREST query
    // Order: freshest content first (published_at), then halal_score, then ingested_at as tiebreaker.
    let url = `${SUPABASE_URL}/rest/v1/curated_videos?select=*&order=published_at.desc.nullslast,halal_score.desc,ingested_at.desc&limit=${limit}`;

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

    // Belt-and-suspenders moderation guard: even though a DB trigger blocks
    // inserts and a nightly sweep purges rows, we also filter at read time so
    // any race, cache, or manual insert can never surface blocked creators.
    const BLOCKED_PATTERNS = ["mia yilin", "leila hormozi", "layla hormozi", "mehreen"];
    for (const p of BLOCKED_PATTERNS) {
      url += `&channel_title=not.ilike.*${encodeURIComponent(p)}*`;
      url += `&title=not.ilike.*${encodeURIComponent(p)}*`;
    }

    // Server-side premium gate — hide premium-only videos from non-premium.
    if (!isPremium) {
      url += `&is_premium_only=eq.false`;
    }




    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Accept": "application/json",
        "Prefer": "count=exact",
      },
    });

    if (!res.ok) {
      console.error(`DB query failed: ${res.status} ${await res.text()}`);
      return json({ items: [], nextCursor: null, total: 0 });
    }

    const totalCount = parseInt(res.headers.get("content-range")?.split("/")?.[1] ?? "0", 10);
    const items = await res.json();

    const nextCursor = items.length === limit
      ? items[items.length - 1].ingested_at
      : null;

    return json({
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
      })),
      nextCursor,
      total: totalCount || items.length,
    });
  } catch (error) {
    console.error("Feed error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
