/**
 * Paginated feed edge function.
 * Serves curated videos from the database with cursor-based pagination.
 * Falls back to YouTube proxy if DB is empty.
 * Filters out Premium-only content unless the caller has an active entitlement.
 */

import { getCallerUserId, hasActivePremium } from "../_shared/entitlements.ts";
import { assessStrict } from "../_shared/halalGuard.ts";

import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";
import { readThrough } from "../_shared/cache.ts";
import { gatherSignals } from "../_shared/recommendations/signals.ts";
import {
  loadImpressions,
  impressionPenalty,
  freshnessScore,
  loadPoolMix,
  alternateByCreatorAndCategory,
} from "../_shared/recommendations/rerankV3.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { observed } from "../_shared/observe.ts";

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
      // T4 — Feed is always personalized (impressions, blocklists, kids
      // mode, premium gating, session shuffle). Never publicly cache.
      // `private` scopes the entry to the browser; `stale-while-revalidate`
      // lets the browser paint the last response instantly on repeat visits
      // while it refreshes in the background. `Vary: Authorization` keeps
      // any accidental intermediary from mixing user entries.
      "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
      "Vary": "Authorization",
      ...extra,
    },
  });
}

Deno.serve(observed("feed", async (req) => {
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
    // Per-tab session id — used as the *primary* rotation seed so every new
    // tab / cold open / refresh in a new session produces a substantively
    // different order, not merely re-jittered positions. Sanitized to
    // alphanumerics to keep it opaque and short.
    const rawSession = typeof body?.session_id === "string" ? body.session_id : "";
    const sessionId = rawSession.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "anon";
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
    // Server-side cross-rail dedup: client sends the set of video ids
    // already claimed by other rails / earlier pages so we can guarantee
    // no duplicate ever leaves the wire. Capped for memory + URL sanity.
    const rawExclude = Array.isArray(body?.exclude_ids) ? body.exclude_ids : [];
    const excludeIds: Set<string> = new Set(
      rawExclude
        .filter((s: unknown): s is string => typeof s === "string")
        .map((s: string) => s.slice(0, 24))
        .slice(0, 1500),
    );

    // Build PostgREST query
    // Order: freshest content first (published_at), then halal_score, then ingested_at as tiebreaker.
    // NOTE: we intentionally overfetch a bit so post-fetch JS blocklist filter
    // can drop matches without leaving the page short of `limit`.
    // Overfetch more when locale-boosting so we can re-rank without starving pages.
    // Wider candidate pool → more channels compete per response, which is
    // what allows the session-seeded rotation below to feel genuinely
    // different across sessions instead of re-sorting the same 400 rows.
    const fetchLimit = Math.min(limit * (contentLanguages.length ? 12 : 10), 800);
    // Keyset pagination is done on `ingested_at` (see the cursor clause
    // below), so any path that must paginate has to be *ordered* by
    // ingested_at too. Search ("More related" on the results page) previously
    // ordered by published_at while cursoring on ingested_at, which made the
    // second page collapse and infinite scroll stop after one page.
    const orderClause = search
      ? "ingested_at.desc,halal_score.desc,published_at.desc.nullslast"
      : sort === "trending"
      ? "view_count.desc.nullslast,published_at.desc.nullslast,halal_score.desc"
      : sort === "recent"
      ? "ingested_at.desc,published_at.desc.nullslast,halal_score.desc"
      : "published_at.desc.nullslast,halal_score.desc,ingested_at.desc";

    // Slim column projection — avoids pulling the 1536-dim `embedding`
    // vector, `search_tsv`, and moderation blobs (`moderation_reasoning`,
    // `moderation_signals`) that inflate the row payload 50-200x and are
    // never read by feed rendering. Cuts internal PostgREST payload from
    // ~5-15 MB per request to ~50-150 KB.
    const FEED_COLS = "video_id,title,channel_id,channel_title,thumbnail_url,category,section_id,published_at,ingested_at,halal_score,view_count,is_trusted_channel,is_premium_only,content_language,visual_state";
    // Hard language gate. The catalog is 100% language-tagged, so a user who
    // picked English must never be served Urdu/Indonesian/Arabic rows — the
    // previous soft re-rank left them in the tail and they surfaced on deeper
    // pages. Applied at the DB level so the whole candidate pool is on-language.
    const langClause = contentLanguages.length
      ? `&content_language=in.(${contentLanguages.map((l) => encodeURIComponent(l)).join(",")})`
      : "";
    let url = `${SUPABASE_URL}/rest/v1/curated_videos?select=${FEED_COLS}&moderation_state=in.(approved,auto_approved)&is_hidden=eq.false&is_archived=eq.false${langClause}&order=${orderClause}&limit=${fetchLimit}`;

    if (category && category !== "All") {
      url += `&category=eq.${encodeURIComponent(category)}`;
    }
    if (sectionId) {
      // Many curated sections are underpopulated in section_id (which is a
      // single-value column). To keep every For You row full without
      // reassigning existing rows, we broaden the query to include
      // category aliases per section. Falls back to the plain section_id
      // filter when no aliases are defined.
      const SECTION_CATEGORY_ALIASES: Record<string, string[]> = {
        "quran-recitations": ["Quran", "Adhan"],
        "elite-recitation": ["Quran", "Adhan"],
        "recitation-tranquility": ["Quran", "Adhan", "Nasheeds"],
        "nasheeds": ["Nasheeds"],
        "business-money": ["Business"],
        "halal-finance": ["Business"],
        "study-focus": ["Self-Improvement", "Education", "Lectures"],
        "advanced-learning": ["Education", "Lectures", "Fiqh"],
        "academic-fiqh": ["Fiqh", "Lectures"],
        "lectures-scholars": ["Lectures", "Dawah"],
        "dawah": ["Dawah", "Islamic"],
        "family-kids": ["Kids & Family", "Lifestyle"],
        "health-fitness": ["Health & Fitness", "Lifestyle", "Self-Improvement"],
        "halal-lifestyle": ["Lifestyle", "Self-Improvement"],
        "podcasts": ["Podcasts", "Lectures"],
        "community-podcasts": ["Podcasts", "Dawah"],
        "intellectual-podcasts": ["Podcasts", "Education"],
        "intellectual": ["Education", "Lectures"],
        "science-documentaries": ["Education", "Lectures"],
        "technology-ai": ["Education", "Business"],
        "islamic-history": ["Islamic", "Education", "Lectures"],
        "islamic-knowledge": ["Islamic", "Lectures"],
        "daily-picks": ["Spirituality", "Islamic", "Quran"],
        "live-streams": ["Quran", "Adhan", "Lectures"],
        "revert-stories": ["Dawah", "Islamic", "Spirituality"],
        "news-current-affairs": ["Islamic", "Podcasts", "Education"],
        "listen": ["Quran", "Adhan", "Nasheeds", "Lectures", "Duas"],
      };
      const aliases = SECTION_CATEGORY_ALIASES[sectionId] ?? [];
      if (aliases.length) {
        const catList = aliases.map((c) => `"${c.replace(/"/g, "")}"`).join(",");
        url += `&or=(section_id.eq.${encodeURIComponent(sectionId)},category.in.(${encodeURIComponent(catList)}))`;
      } else {
        url += `&section_id=eq.${encodeURIComponent(sectionId)}`;
      }
    }
    if (cursor) {
      url += `&ingested_at=lt.${encodeURIComponent(cursor)}`;
    }
    if (search) {
      // Substring match alone is far too narrow ("podcasts" matched 1 row while
      // full-text matched 479), which made "More related" return a single page
      // and infinite scroll appear broken. Combine ILIKE with the indexed
      // `search_tsv` full-text column so deep pagination has real depth.
      const enc = encodeURIComponent(search);
      // Multi-word queries are OR-joined: websearch_to_tsquery ANDs terms by
      // default, so "seerah tafsir" returned nothing. OR keeps recall high,
      // and the smart-ranked block above still supplies precision.
      const tokens = search
        .replace(/[()"]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 1)
        .slice(0, 6);
      const ftsTerm = encodeURIComponent(tokens.length ? tokens.join(" OR ") : search);
      url += `&or=(title.ilike.*${enc}*,channel_title.ilike.*${enc}*,search_tsv.wfts(english).${ftsTerm})`;
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
    const cacheable = !callerId && !search && excludeIds.size === 0;
    const langKey = contentLanguages.length ? contentLanguages.join(",") : "-";
    const cacheKey = cacheable
      ? `feed:${sort}:${category ?? "all"}:${sectionId ?? "-"}:${cursor ?? "0"}:${limit}:${maxPerChannel}:${langKey}`
      : "";

    // Decide whether we can use the diversified RPC path. It applies a
    // per-channel window (ROW_NUMBER PARTITION BY channel_id) at the DB
    // layer so the fetched candidate slice draws from >100 channels
    // instead of the 40-50 that dominate a raw `published_at DESC` scan.
    // The RPC covers the two hottest surfaces (fresh, recent). Trending,
    // search, and category-only browsing keep the raw PostgREST path.
    const canUseDiversifiedRpc =
      (sort === "fresh" || sort === "recent") && !search;

    const sectionAliasesForRpc: string[] | null = (() => {
      if (!sectionId) return null;
      const SECTION_CATEGORY_ALIASES: Record<string, string[]> = {
        "quran-recitations": ["Quran", "Adhan"],
        "elite-recitation": ["Quran", "Adhan"],
        "recitation-tranquility": ["Quran", "Adhan", "Nasheeds"],
        "nasheeds": ["Nasheeds"],
        "business-money": ["Business"],
        "halal-finance": ["Business"],
        "study-focus": ["Self-Improvement", "Education", "Lectures"],
        "advanced-learning": ["Education", "Lectures", "Fiqh"],
        "academic-fiqh": ["Fiqh", "Lectures"],
        "lectures-scholars": ["Lectures", "Dawah"],
        "dawah": ["Dawah", "Islamic"],
        "family-kids": ["Kids & Family", "Lifestyle"],
        "health-fitness": ["Health & Fitness", "Lifestyle", "Self-Improvement"],
        "halal-lifestyle": ["Lifestyle", "Self-Improvement"],
        "podcasts": ["Podcasts", "Lectures"],
        "community-podcasts": ["Podcasts", "Dawah"],
        "intellectual-podcasts": ["Podcasts", "Education"],
        "intellectual": ["Education", "Lectures"],
        "science-documentaries": ["Education", "Lectures"],
        "technology-ai": ["Education", "Business"],
        "islamic-history": ["Islamic", "Education", "Lectures"],
        "islamic-knowledge": ["Islamic", "Lectures"],
        "daily-picks": ["Spirituality", "Islamic", "Quran"],
        "live-streams": ["Quran", "Adhan", "Lectures"],
        "revert-stories": ["Dawah", "Islamic", "Spirituality"],
        "news-current-affairs": ["Islamic", "Podcasts", "Education"],
        "listen": ["Quran", "Adhan", "Nasheeds", "Lectures", "Duas"],
      };
      return SECTION_CATEGORY_ALIASES[sectionId] ?? null;
    })();

    const produce = async () => {
      const t0 = Date.now();
      if (canUseDiversifiedRpc) {
        // Tighter per-channel cap at the pool layer so ~250–400 distinct
        // channels compete inside the candidate slice (vs. 40–80 before).
        // For anon we go stricter (2/channel) — no personalization can
        // rescue diversity from a single dominant creator.
        const perChannelCap = callerId
          ? Math.min(Math.max(maxPerChannel + 1, 2), 6)
          : 2;
        const { data, error } = await admin.rpc("get_feed_candidates_diversified", {
          _limit: fetchLimit,
          _per_channel: perChannelCap,
          _category: category && category !== "All" ? category : null,
          _section_id: sectionId ?? null,
          _section_aliases: sectionAliasesForRpc,
          _cursor: cursor ?? null,
          _exclude_premium: !isPremium,
          _order: sort === "recent" ? "recent" : "fresh",
          _languages: contentLanguages.length ? contentLanguages : null,
        });
        const tFetch = Date.now() - t0;
        if (error) {
          console.error(`[feed.rpc] failed: ${error.message} — falling back to HTTP`);
        } else {
          const items = (data ?? []) as Array<Record<string, unknown>>;
          console.log(`[feed.produce.rpc] fetch=${tFetch}ms rows=${items.length}`);
          return { items, ok: true };
        }
      }
      // Fallback / non-diversified paths: raw PostgREST.
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Accept": "application/json",
        },
      });
      const tFetch = Date.now() - t0;
      if (!res.ok) {
        console.error(`DB query failed: ${res.status} ${await res.text()}`);
        return { items: [] as Array<Record<string, unknown>>, ok: false };
      }
      const items = await res.json();
      const tJson = Date.now() - t0 - tFetch;
      console.log(`[feed.produce] fetch=${tFetch}ms json=${tJson}ms rows=${(items as unknown[]).length}`);
      return { items, ok: true };
    };


    const tStage = Date.now();
    const { value: payload, hit } = cacheable
      ? await readThrough(cacheKey, 180, produce)
      : { value: await produce(), hit: false };
    console.log(`[feed] section=${sectionId ?? "-"} cache=${hit ? "HIT" : "MISS"} produce=${Date.now() - tStage}ms`);

    if (!payload.ok) return json({ items: [], nextCursor: null, total: 0 });

    // Post-fetch blocklist filter (see BLOCKED_TOKENS above) + cross-rail
    // exclude filter — guarantees no duplicate video id ever reaches the
    // client across rails, surfaces, and infinite-grid pagination.
    // Strict Halal — stored preference wins for signed-in users; anonymous
    // callers default to ON and may only opt out explicitly.
    let strictHalal = body?.strict_halal !== false;
    if (callerId) {
      const { data: shPref } = await admin
        .from("user_locale_preferences").select("strict_halal")
        .eq("user_id", callerId).maybeSingle();
      strictHalal = (shPref as { strict_halal?: boolean } | null)?.strict_halal !== false;
    }

    let filtered = (payload.items as Array<Record<string, unknown>>).filter((v) => {
      const id = (v.video_id as string) ?? "";
      if (excludeIds.has(id)) return false;
      if (!assessStrict(v as never, strictHalal).allowed) return false;
      const t = `${(v.title as string) ?? ""} ${(v.channel_title as string) ?? ""}`.toLowerCase();
      return !BLOCKED_TOKENS.some((tok) => t.includes(tok));
    });


    // Empty-section fallback cascade: a section should NEVER disappear.
    // If the primary retrieval returns fewer than half of `limit`, broaden
    // in stages — recent approved, then trending by view_count, then any
    // approved — merging by video_id so duplicates from the primary pool
    // are preserved on their higher-ranked positions.
    if (sectionId && filtered.length < Math.ceil(limit / 2)) {
      const seen = new Set(filtered.map((v) => v.video_id as string));
      const cascade = async (extra: string, withLang = true) => {
        const u = `${SUPABASE_URL}/rest/v1/curated_videos?select=${FEED_COLS}` +
          `&moderation_state=in.(approved,auto_approved)` +
          `&is_hidden=eq.false&is_archived=eq.false` +
          (isPremium ? "" : "&is_premium_only=eq.false") +
          (withLang ? langClause : "") +
          `&${extra}&limit=${fetchLimit}`;
        const r = await fetch(u, {
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Accept": "application/json",
          },
        });
        if (!r.ok) return;
        const rows = (await r.json()) as Array<Record<string, unknown>>;
        for (const v of rows) {
          const id = v.video_id as string;
          if (seen.has(id) || excludeIds.has(id)) continue;
          if (!assessStrict(v as never, strictHalal).allowed) continue;
          const t = `${(v.title as string) ?? ""} ${(v.channel_title as string) ?? ""}`.toLowerCase();
          if (BLOCKED_TOKENS.some((tok) => t.includes(tok))) continue;

          seen.add(id);
          filtered.push(v);
          if (filtered.length >= fetchLimit) return;
        }
      };
      // Stage 1: recently-approved (still on-language)
      await cascade("order=ingested_at.desc.nullslast,halal_score.desc");
      // Stage 2: trending fallback if still short
      if (filtered.length < Math.ceil(limit / 2)) {
        await cascade("order=view_count.desc.nullslast,published_at.desc.nullslast");
      }
      // Stage 3: hidden gems (high halal, low exposure) — last-resort filler
      if (filtered.length < Math.ceil(limit / 2)) {
        await cascade("halal_score=gte.85&order=published_at.desc.nullslast,halal_score.desc");
      }
      // Stage 4: ONLY if the requested language genuinely cannot fill the row,
      // drop the language gate so a section never renders empty.
      if (langClause && filtered.length < Math.ceil(limit / 2)) {
        await cascade("order=published_at.desc.nullslast,halal_score.desc", false);
      }
    }

    // Language ordering. The pool is already hard-filtered to the caller's
    // languages; this only keeps on-language rows ahead of any off-language
    // filler pulled in by the last-resort cascade stage.
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
      // Off-language rows are only ever used as starvation filler.
      const needFiller = matches.length + untagged.length < limit;
      ordered = needFiller ? [...matches, ...untagged, ...others] : [...matches, ...untagged];
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
      // Rotation seed prioritizes session id so every new tab / cold open
      // yields a substantively different order. The 4h bucket remains as
      // a *fallback* only (when no session id is provided) so cached anon
      // responses still rotate over time.
      const dayBucket = Math.floor(Date.now() / (4 * 3600_000));
      const rotationKey = sessionId !== "anon" ? sessionId : String(dayBucket);
      const seedStr = `${identity}:${rotationKey}:${category ?? "all"}:${sort}`;
      const hash01 = (s: string): number => {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
        return (h >>> 0) / 0xffffffff;
      };

      if (callerId) {
        try {
          const [signals, impressions, poolMix] = await Promise.all([
            Promise.race([
              gatherSignals(admin, callerId),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 900)),
            ]),
            loadImpressions(admin, callerId).catch(() => new Map()),
            loadPoolMix(admin).catch(() => ({} as Record<string, number>)),
          ]);
          if (signals) {
            const blockedPatterns = signals.blockedChannelPatterns ?? [];
            const preFiltered = blockedPatterns.length
              ? ordered.filter((v) => {
                  const ch = ((v.channel_title as string) ?? "").toLowerCase();
                  return !blockedPatterns.some((p) => ch.includes(p));
                })
              : ordered;

            const aff = sort === "recent" ? 0.7 : 1.0;
            const freshAnchor = sort === "recent" ? 1.15 : 0.35;
            const freshBoost = (poolMix.recently_added ?? 0.2) * 2.5; // 0..~0.6

            const N = preFiltered.length;
            const scored = preFiltered.map((v, i) => {
              const ch = (v.channel_title as string | null) ?? "";
              const cat = (v.category as string | null) ?? "";
              const section = (v.section_id as string | null) ?? "";
              const vid = (v.video_id as string) ?? "";
              const baseFresh = 1 - i / Math.max(1, N);
              const chAff = signals.channelAffinity.get(ch) ?? 0;
              const catAff = Math.max(signals.categoryAffinity.get(cat) ?? 0, signals.categoryAffinity.get(section) ?? 0);
              const longCh = signals.longTermChannelAffinity.get(ch) ?? 0;
              const longCat = signals.longTermCategoryAffinity.get(cat) ?? 0;
              const interestMatch = signals.interests.some((kw) =>
                kw && (
                  ((v.title as string) ?? "").toLowerCase().includes(kw) ||
                  ((v.category as string) ?? "").toLowerCase().includes(kw) ||
                  ((v.section_id as string) ?? "").toLowerCase().includes(kw)
                )
              ) ? 1 : 0;
              const seenCh = ch && signals.seenChannelIds.has(ch);
              const novelty = ch && !seenCh && v.is_trusted_channel === true ? 1 : 0;

              const imp = impressions.get(vid);
              const [impPen, hardHide] = impressionPenalty(imp);

              const fresh = freshnessScore((v.published_at as string) ?? (v.ingested_at as string));

              const skipped = signals.skippedVideoIds.has(vid) ? 1 : 0;
              const dismissed = signals.dismissedVideoIds.has(vid) ? 1 : 0;
              const p = (k: string) => 0.75 + hash01(`${identity}:w:${k}`) * 0.5;
              const score =
                baseFresh * freshAnchor +
                fresh * freshBoost +
                chAff * 0.85 * aff * p("ch") +
                catAff * 0.90 * aff * p("cat") +
                longCh * 0.25 * aff * p("longCh") +
                longCat * 0.55 * aff * p("longCat") +
                interestMatch * 1.10 * aff * p("int") +
                novelty * 0.20 * aff * p("nov") -
                impPen -
                skipped * 0.25 -
                dismissed * 5.0;
              // Per-session jitter (wider amplitude) → same signed-in user
              // sees a genuinely different order across tabs/sessions.
              const j = (hash01(`${identity}:${rotationKey}:${vid}`) - 0.5) * 0.35;
              const finalScore = score * (1 + j);
              const reasons: string[] = [];
              if (fresh > 0.4) reasons.push("fresh");
              if (chAff > 0.3) reasons.push("channel-affinity");
              if (catAff > 0.3) reasons.push("category-affinity");
              if (interestMatch) reasons.push("interest-match");
              if (novelty) reasons.push("new-trusted-creator");
              if (impPen > 0.3) reasons.push("shown-recently");
              return { v, k: -finalScore, hardHide: !!hardHide, reasons };
            });
            ordered = scored
              .filter((x) => !x.hardHide && x.k < 4.5)
              .sort((a, b) => a.k - b.k)
              .map((x) => {
                (x.v as Record<string, unknown>).__reasons = x.reasons;
                return x.v;
              });
          }
        } catch (e) {
          console.warn("[feed] personalization skipped:", (e as Error).message);
        }
      } else {
        // Anon: session-seeded shuffle with wide amplitude so refreshes in
        // different tabs produce fundamentally different orderings.
        let seed = 0;
        for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
        const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
        ordered = ordered
          .map((v, i) => ({ v, k: i * 0.4 + (rand() - 0.5) * 40 }))
          .sort((a, b) => a.k - b.k)
          .map((x) => x.v);
      }

      // --- Long-tail creator injection ------------------------------------
      // Compute per-channel counts within the candidate pool; treat channels
      // with ≤3 items as "long-tail" and guarantee ~3 of them per page. This
      // is what makes small creators & niche topics actually surface without
      // waiting for personalization signals to accumulate.
      const chCount = new Map<string, number>();
      for (const v of ordered) {
        const ch = (v.channel_id as string) || (v.channel_title as string) || "__";
        chCount.set(ch, (chCount.get(ch) ?? 0) + 1);
      }
      const longTailQuota = Math.max(2, Math.floor(limit * 0.2));
      const longTail: Array<Record<string, unknown>> = [];
      const rest: Array<Record<string, unknown>> = [];
      for (const v of ordered) {
        const ch = (v.channel_id as string) || (v.channel_title as string) || "__";
        if ((chCount.get(ch) ?? 0) <= 3 && longTail.length < longTailQuota * 4) longTail.push(v);
        else rest.push(v);
      }
      // Interleave long-tail every ~5 positions; keeps discovery constant
      // without shoving unknown creators to the top.
      const merged: Array<Record<string, unknown>> = [];
      let li = 0, ri = 0, injected = 0;
      while (merged.length < ordered.length) {
        if (li < longTail.length && injected < longTailQuota && merged.length > 0 && merged.length % 5 === 2) {
          merged.push(longTail[li++]);
          injected++;
        } else if (ri < rest.length) {
          merged.push(rest[ri++]);
        } else if (li < longTail.length) {
          merged.push(longTail[li++]);
        } else break;
      }
      ordered = merged;
    }

    // Creator diversity cap (unchanged): no channel exceeds `maxPerChannel`.
    const perChannel = new Map<string, number>();
    const primary: Array<Record<string, unknown>> = [];
    const overflow: Array<Record<string, unknown>> = [];
    for (const v of ordered) {
      const ch = (v.channel_title as string) ?? "__";
      const n = perChannel.get(ch) ?? 0;
      if (n < maxPerChannel) { primary.push(v); perChannel.set(ch, n + 1); }
      else overflow.push(v);
    }
    // v3: MMR alternation on the primary block prevents back-to-back creator/category.
    const diversified = [...alternateByCreatorAndCategory(primary), ...overflow];

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
          reasons: (v.__reasons as string[] | undefined) ?? undefined,
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
}));
