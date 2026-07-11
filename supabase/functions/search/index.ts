/**
 * Unified search endpoint.
 * POST /search { q, category?, channel?, limit?, offset?, useAi? }
 *   → { hits, intent, trending, related, provider }
 * GET  /search?prefix=... → { autocomplete }
 *
 * The endpoint routes through a SearchProvider abstraction (Postgres today,
 * Meilisearch/Typesense/OpenSearch tomorrow) and logs every search into
 * search_queries so trending + related feeds stay warm.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getSearchProvider } from "../_shared/search/providers.ts";
import { detectIntent } from "../_shared/search/intent.ts";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";
import { hasActivePremium } from "../_shared/entitlements.ts";
import { embedOne, toPgVector } from "../_shared/embed.ts";

const NORMALIZE = (s: string) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const provider = getSearchProvider();

  // Resolve caller (optional).
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (jwt) {
    const { data } = await admin.auth.getUser(jwt);
    userId = data?.user?.id ?? null;
  }

  // H2 mitigation: throttle abusive callers. Search is cheap but hits the
  // DB with a full-text ranker so we cap both anonymous IPs and users.
  const identity = getClientIdentity(req, userId);
  const limited = await enforceRateLimit(admin, {
    identity,
    action: req.method === "GET" ? "search_autocomplete" : "search_query",
    limit: req.method === "GET" ? 240 : 120,
    windowSeconds: 60,
  });
  if (limited) {
    return json({ error: "Rate limit exceeded" }, 429);
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const prefix = url.searchParams.get("prefix") ?? "";
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 8), 1), 20);
      if (!prefix) return json({ autocomplete: [] });
      const autocomplete = await provider.autocomplete(prefix, limit);
      return json({ autocomplete });
    }

    const body = await req.json().catch(() => ({}));
    const q = String(body.q ?? "").slice(0, 500);
    const category = body.category ? String(body.category) : null;
    const channel = body.channel ? String(body.channel) : null;
    const limit = Math.min(Math.max(Number(body.limit ?? 40), 1), 100);
    const offset = Math.max(Number(body.offset ?? 0), 0);
    const useAi = body.useAi !== false && q.length >= 3;

    let intent = useAi ? await detectIntent(q) : null;

    // H2: validate AI-suggested channel/entities against real channels.
    // Hallucinated names would otherwise silently narrow results to zero.
    if (intent?.channel) {
      const { data: found } = await admin
        .from("approved_channels")
        .select("channel_id, channel_title")
        .ilike("channel_title", intent.channel)
        .limit(1)
        .maybeSingle();
      if (!found) intent = { ...intent, channel: undefined };
    }
    if (intent?.entities?.length) {
      const { data: knownChannels } = await admin
        .from("approved_channels")
        .select("channel_title")
        .in("channel_title", intent.entities);
      const known = new Set((knownChannels ?? []).map((c) => (c.channel_title as string).toLowerCase()));
      intent = {
        ...intent,
        entities: intent.entities.filter((e) => known.has(e.toLowerCase()) || /[\p{L}]{3,}/u.test(e)),
      };
    }

    const hits = await provider.search({
      q,
      category,
      channel,
      limit,
      offset,
      userId,
      intent,
    });

    // Server-side premium gate for search results.
    const viewerIsPremium = await hasActivePremium(userId);
    let filteredHits = hits;
    if (!viewerIsPremium && hits.length > 0) {
      const ids = hits.map((h: Record<string, unknown>) => h.video_id ?? h.id).filter(Boolean);
      if (ids.length > 0) {
        const { data: premiumRows } = await admin
          .from("curated_videos")
          .select("video_id")
          .in("video_id", ids as string[])
          .eq("is_premium_only", true);
        const premiumSet = new Set((premiumRows ?? []).map((r) => r.video_id));
        filteredHits = hits.filter((h: Record<string, unknown>) =>
          !premiumSet.has((h.video_id ?? h.id) as string),
        );
      }
    }
    const [{ data: trending }, { data: related }] = await Promise.all([
      admin.rpc("get_trending_searches", { _limit: 10, _window_hours: 168 }),
      q ? admin.rpc("get_related_searches", { _query: q, _limit: 6 }) : Promise.resolve({ data: [] }),
    ]);

    // Log the search (fire-and-forget).
    if (q) {
      admin
        .from("search_queries")
        .insert({
          user_id: userId,
          query: q,
          normalized_query: NORMALIZE(q),
          result_count: filteredHits.length,
          intent: intent ?? null,
        })
        .then(() => {})
        .catch(() => {});
    }

    return json({
      hits: filteredHits,
      intent,
      trending: trending ?? [],
      related: related ?? [],
      provider: provider.name,
      viewer: { isPremium: viewerIsPremium },
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
