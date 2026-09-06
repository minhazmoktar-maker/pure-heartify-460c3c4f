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
import { assessStrict } from "../_shared/halalGuard.ts";
import { readThroughShared } from "../_shared/cache.ts";


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
      const { value: autocomplete } = await readThroughShared(
        admin,
        `autocomplete:v1:${prefix.toLowerCase()}|${limit}`,
        300,
        () => provider.autocomplete(prefix, limit),
      );
      return json({ autocomplete });
    }

    const body = await req.json().catch(() => ({}));
    const q = String(body.q ?? "").slice(0, 500);
    const category = body.category ? String(body.category) : null;
    const channel = body.channel ? String(body.channel) : null;
    const limit = Math.min(Math.max(Number(body.limit ?? 40), 1), 100);
    const offset = Math.max(Number(body.offset ?? 0), 0);
    const useAi = body.useAi !== false && q.length >= 3;
    // Locale hints — soft signals used to re-rank, never to hard-filter
    // (a Turkish user searching "quran" still gets great English results).
    const contentLanguages: string[] = Array.isArray(body.content_languages)
      ? (body.content_languages as unknown[])
          .filter((l): l is string => typeof l === "string")
          .map((l) => l.toLowerCase().replace(/[^a-z]/g, "").slice(0, 3))
          .filter((l) => l.length >= 2 && l.length <= 3)
          .slice(0, 8)
      : [];


    // Anonymous searches are identical for every caller with the same query,
    // so they read through the shared cache (measured cold: 3.8-6.1s, warm:
    // ~0.3s). Signed-in searches stay uncached: they are personalised and
    // entitlement-gated.
    const cacheKey = `search:v1:${NORMALIZE(q)}|${category ?? ""}|${channel ?? ""}|${limit}|${offset}|${useAi}|${contentLanguages.join(",")}`;

    const compute = async () => {
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

    let hits: Array<Record<string, unknown>> = [];
    let providerDegraded = false;
    try {
      hits = await provider.search({
        q,
        category,
        channel,
        limit,
        offset,
        userId,
        intent,
      });
    } catch (err) {
      console.error("search provider failed:", (err as Error).message);
      providerDegraded = true;
    }

    // Semantic recall: blend in vector matches for the query so we surface
    // conceptually-related videos even when keywords do not overlap. Best-effort
    // and additive — never blocks the lexical result.
    let semanticHits: Array<Record<string, unknown>> = [];
    if (useAi && q.length >= 3) {
      try {
        const vec = await embedOne(q);
        if (vec) {
          const { data: matches } = await admin.rpc("match_curated_videos", {
            query_embedding: toPgVector(vec) as unknown as number[],
            match_count: Math.min(limit, 30),
            category_filter: category,
            exclude_premium: false,
          });
          semanticHits = (matches ?? []) as Array<Record<string, unknown>>;
        }
      } catch (err) {
        console.error("semantic recall failed:", (err as Error).message);
      }
    }
    const seen = new Set(hits.map((h: Record<string, unknown>) => (h.video_id ?? h.id) as string));
    for (const m of semanticHits) {
      const id = (m.video_id ?? m.id) as string;
      if (id && !seen.has(id)) {
        seen.add(id);
        hits.push({ ...m, _source: "semantic" });
      }
    }

    // Server-side premium gate for search results.
    let viewerIsPremium = false;
    try {
      viewerIsPremium = await hasActivePremium(userId);
    } catch (err) {
      console.error("premium check failed:", (err as Error).message);
    }
    let filteredHits = hits;

    // Single metadata hydration for every downstream gate. The premium,
    // locale and strict-halal gates all need columns the search RPC does not
    // return; hydrating them once keeps the page to one extra round trip and
    // guarantees `visual_state` is present (a missing value is treated as
    // `unchecked` by the halal guard, which would drop every result).
    const hitIds = filteredHits
      .map((h: Record<string, unknown>) => (h.video_id ?? h.id) as string)
      .filter(Boolean);
    const metaById = new Map<
      string,
      { is_premium_only: boolean; visual_state: string | null; content_language: string | null }
    >();
    if (hitIds.length > 0) {
      try {
        const { data: metaRows } = await admin
          .from("curated_videos")
          .select("video_id, is_premium_only, visual_state, content_language")
          .in("video_id", hitIds);
        for (const r of metaRows ?? []) {
          metaById.set(r.video_id as string, {
            is_premium_only: (r as { is_premium_only?: boolean }).is_premium_only === true,
            visual_state: ((r as { visual_state?: string | null }).visual_state ?? null),
            content_language:
              ((r as { content_language?: string | null }).content_language ?? null)?.toLowerCase() ?? null,
          });
        }
      } catch (err) {
        console.error("metadata hydration failed:", (err as Error).message);
      }
    }

    if (!viewerIsPremium && metaById.size > 0) {
      filteredHits = filteredHits.filter((h: Record<string, unknown>) =>
        metaById.get((h.video_id ?? h.id) as string)?.is_premium_only !== true,
      );
    }

    // Locale-aware language gate. A user who picked English must never be
    // served Indonesian/Arabic/Malay results. Untagged rows are neutral (kept
    // after on-language matches) and off-language rows are only used when
    // nothing else can fill the page, so results never render empty.
    if (contentLanguages.length && filteredHits.length > 0) {
      const langSet = new Set(contentLanguages);
      const matches: typeof filteredHits = [];
      const untagged: typeof filteredHits = [];
      const others: typeof filteredHits = [];
      for (const h of filteredHits) {
        const cl = metaById.get((h.video_id ?? h.id) as string)?.content_language ?? null;
        if (!cl) untagged.push(h);
        else if (langSet.has(cl)) matches.push(h);
        else others.push(h);
      }
      const onLanguage = [...matches, ...untagged];
      filteredHits = onLanguage.length > 0 ? onLanguage : others;
    }


    // Strict Halal last-mile gate on search results. Stored preference wins
    // for signed-in users; anonymous callers default to ON.
    {
      let strictHalal = true;
      if (userId) {
        const { data: shPref } = await admin
          .from("user_locale_preferences").select("strict_halal")
          .eq("user_id", userId).maybeSingle();
        strictHalal = (shPref as { strict_halal?: boolean } | null)?.strict_halal !== false;
      }
      filteredHits = filteredHits.filter((h: Record<string, unknown>) => {
        const id = (h.video_id ?? h.id) as string;
        const visual = metaById.get(id)?.visual_state
          ?? (h.visual_state as string | null | undefined)
          ?? null;
        return assessStrict(
          {
            title: h.title as string | null,
            channel_title: (h.channel_title ?? h.channelTitle) as string | null,
            visual_state: visual,
          },
          strictHalal,
        ).allowed;
      });

    }


    const [trendingRes, relatedRes] = await Promise.allSettled([
      admin.rpc("get_trending_searches", { _limit: 10, _window_hours: 168 }),
      q ? admin.rpc("get_related_searches", { _query: q, _limit: 6 }) : Promise.resolve({ data: [] }),
    ]);
    const trending = trendingRes.status === "fulfilled" ? trendingRes.value.data : [];
    const related = relatedRes.status === "fulfilled" ? relatedRes.value.data : [];


    return {
      hits: filteredHits,
      intent,
      trending: trending ?? [],
      related: related ?? [],
      provider: provider.name,
      viewer: { isPremium: viewerIsPremium },
      degraded: providerDegraded,
      fallback: providerDegraded && filteredHits.length === 0,
    };
    };

    const payload = userId
      ? await compute()
      : (
          await readThroughShared(
            admin,
            cacheKey,
            120,
            compute,
            // Never persist a degraded (provider-timeout) payload: it would be
            // served stale to every other anonymous searcher for minutes.
            (v) => !v.degraded && Array.isArray(v.hits) && v.hits.length > 0,
          )
        ).value;

    // Log the search (fire-and-forget) — outside the cache so trending keeps
    // reflecting real demand even when the results themselves were cached.
    if (q) {
      admin
        .from("search_queries")
        .insert({
          user_id: userId,
          query: q,
          normalized_query: NORMALIZE(q),
          result_count: Array.isArray(payload.hits) ? payload.hits.length : 0,
          intent: payload.intent ?? null,
        })
        .then(() => {})
        .catch(() => {});
    }

    return json(payload);
  } catch (e) {
    console.error("search handler unrecoverable error:", (e as Error).message);
    // Return 200 with a fallback signal so the client UI never crashes.
    return json({
      hits: [],
      intent: null,
      trending: [],
      related: [],
      provider: "unavailable",
      viewer: { isPremium: false },
      degraded: true,
      fallback: true,
      error: "SEARCH_SERVICE_UNAVAILABLE",
    });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
