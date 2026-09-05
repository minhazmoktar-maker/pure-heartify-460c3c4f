/**
 * LOCAL-FIRST language weighting.
 *
 * Heartify launches in South Asia (Bangladesh, Pakistan, India). The clean
 * corpus is English-heavy (~44k en vs ~2.5k bn, ~0.5k ur), so a plain
 * "filter to the user's languages" gate still produces a feed that is 90%+
 * English for a Dhaka user — it feels foreign.
 *
 * The fix is a *guaranteed share*: the caller's primary (local) language is
 * interleaved into fixed slots on every page, so a Bengali user always sees
 * Bengali content near the top even though English out-supplies it 17:1.
 * The share adapts down when the local supply genuinely cannot fill it, so a
 * thin language never blanks a page.
 */

/** ISO code sanitizer — 2-3 lowercase letters or null. */
export function sanitizeLang(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const l = x.toLowerCase().replace(/[^a-z]/g, "").slice(0, 3);
  return l.length >= 2 ? l : null;
}

/**
 * The language whose share of a page is guaranteed. Mirrors
 * `primaryContentLanguage` in src/i18n/region.ts: index 0 of the caller's
 * ordered content languages, unless that is English (abundant — never needs
 * a floor) or Arabic (universal liturgical language, also abundant).
 */
export function derivePrimaryLanguage(
  contentLanguages: readonly unknown[] | null | undefined,
): string | null {
  const list = (contentLanguages ?? []).map(sanitizeLang).filter(Boolean) as string[];
  if (list.length === 0) return null;
  if (list[0] !== "en") return list[0];
  return list.find((l) => l !== "en" && l !== "ar") ?? null;
}

/**
 * Target share of a page reserved for the primary (local) language.
 *
 * Heartify's launch standard is **80/20**: 80% native/local language, 20%
 * universal (English + Arabic). This holds for every market, not just
 * Bangladesh — a Turkish, Indonesian or Hausa user gets the same 80/20 mix
 * with their own language in the majority slot.
 *
 * The share is a *ceiling on intent*, not a hard promise:
 * `interleavePrimaryLanguage` clamps the quota to actual local supply, so a
 * thin language degrades smoothly instead of blanking a page.
 */
export const PRIMARY_LANGUAGE_SHARE = 0.8;

/**
 * Per-language tuning of that share.
 *
 * Two forces are balanced here:
 *  - **Local relevance**: a Dhaka or Jakarta user must see their own language
 *    lead the page, so deep corpora (bn, ur, id, tr, ar…) keep the full 80%.
 *  - **Not crowding out the rest**: languages whose live corpus is thin, or
 *    whose speakers routinely consume across languages (fr, de, es, zh, ja…),
 *    get a lower floor so the page still carries a genuine spread instead of
 *    recycling the same handful of local videos.
 *
 * Unlisted languages fall back to `PRIMARY_LANGUAGE_SHARE`. English never gets
 * a floor (it is abundant and `derivePrimaryLanguage` never returns it).
 */
export const LANGUAGE_SHARE: Readonly<Record<string, number>> = {
  // Deep local corpora — full local-first majority.
  bn: 0.8,
  ur: 0.8,
  id: 0.8,
  tr: 0.8,
  ar: 0.7,
  hi: 0.7,
  fa: 0.7,
  ms: 0.7,
  // Growing corpora — strong but not saturating.
  ps: 0.6,
  ha: 0.55,
  sw: 0.55,
  // Multilingual-by-habit markets — local lead, broad remainder.
  fr: 0.6,
  de: 0.55,
  es: 0.6,
  pt: 0.6,
  ru: 0.55,
  zh: 0.5,
  ja: 0.5,
  ko: 0.5,
};

/** Never let the local share drop so low that the page stops feeling local. */
export const MIN_PRIMARY_LANGUAGE_SHARE = 0.35;

/**
 * No single *non-primary* language may take more than this fraction of the
 * minority slots. Without the cap, English (17:1 supply) refills every
 * remainder slot and the "diversified 20%" is English-only in practice.
 */
export const MAX_SINGLE_OTHER_SHARE = 0.5;

/**
 * The share of a page a given primary language should hold.
 *
 * `localSupply` / `window` (when known) clamp the target down so a thin
 * language asks only for what it can actually fill — the same request never
 * over-promises and never blanks slots.
 */
export function shareForLanguage(
  primary: string | null | undefined,
  opts: { localSupply?: number; window?: number } = {},
): number {
  if (!primary) return PRIMARY_LANGUAGE_SHARE;
  const target = LANGUAGE_SHARE[primary.toLowerCase()] ?? PRIMARY_LANGUAGE_SHARE;
  const { localSupply, window } = opts;
  if (typeof localSupply === "number" && typeof window === "number" && window > 0) {
    const affordable = localSupply / window;
    if (affordable < target) return Math.max(Math.min(target, affordable), 0);
  }
  return Math.max(target, MIN_PRIMARY_LANGUAGE_SHARE);
}

/**
 * Interleave so that ~`share` of the first `limit` positions carry the
 * primary language, preserving the relative order inside each group.
 * Degrades gracefully: with no primary-language supply the input order is
 * returned untouched. When `share` is omitted the per-language tuned share
 * (`shareForLanguage`) is used.
 */
export function interleavePrimaryLanguage<T>(
  items: T[],
  getLang: (v: T) => string | null,
  primary: string | null,
  limit: number,
  share?: number,
): T[] {

  if (!primary || items.length === 0) return items;

  const local: T[] = [];
  const other: T[] = [];
  for (const v of items) {
    if ((getLang(v) ?? "").toLowerCase() === primary) local.push(v);
    else other.push(v);
  }
  if (local.length === 0 || other.length === 0) return items;

  // The remaining ~20% is the *diversified* half of the 80/20 standard: it
  // must not collapse into a single (almost always English) language. Round
  // robin the non-primary pool across its distinct languages so the minority
  // slots show a genuine spread — English, Arabic, and whatever else the
  // corpus supplies — while preserving relative order inside each language.
  const nonPrimary = diversifyByLanguage(other, getLang);
  other.length = 0;
  other.push(...nonPrimary);


  const window = Math.max(1, Math.min(limit, items.length));
  // Per-language tuned target, clamped to the supply we actually hold, so a
  // deep corpus leads the page and a thin one never asks for empty slots.
  const effectiveShare = share ?? shareForLanguage(primary, {
    localSupply: local.length,
    window,
  });
  // Never promise more local slots than we actually have supply for.
  const quota = Math.min(local.length, Math.max(1, Math.round(window * effectiveShare)));
  if (quota === 0) return items;


  // Slot positions spread evenly through the window (e.g. quota 9 / window 20
  // → roughly every other card is local, starting at position 0).
  const step = window / quota;
  const slots = new Set<number>();
  for (let i = 0; i < quota; i++) slots.add(Math.min(window - 1, Math.floor(i * step)));

  const out: T[] = [];
  let li = 0;
  let oi = 0;
  for (let pos = 0; pos < items.length; pos++) {
    if (pos < window && slots.has(pos) && li < local.length) out.push(local[li++]);
    else if (oi < other.length) out.push(other[oi++]);
    else if (li < local.length) out.push(local[li++]);
  }
  return out;
}

/**
 * Round-robin a list across its distinct languages, preserving each
 * language's internal order. Used for the diversified 20% of a page so the
 * minority slots are not all one language.
 *
 * No single language may hold more than `MAX_SINGLE_OTHER_SHARE` of the lead
 * portion; once a lane hits that cap its remaining items are deferred to the
 * tail so English (or any over-supplied language) cannot crowd the others out.
 */
export function diversifyByLanguage<T>(
  items: T[],
  getLang: (v: T) => string | null,
  maxSingleShare = MAX_SINGLE_OTHER_SHARE,
): T[] {
  if (items.length < 3) return items;
  const buckets = new Map<string, T[]>();
  for (const v of items) {
    const key = (getLang(v) ?? "unknown").toLowerCase();
    const b = buckets.get(key);
    if (b) b.push(v);
    else buckets.set(key, [v]);
  }
  if (buckets.size < 2) return items;
  // Larger supplies lead so the head of the page stays dense.
  const lanes = Array.from(buckets.values()).sort((a, b) => b.length - a.length);
  const cap = Math.max(1, Math.ceil(items.length * maxSingleShare));
  const out: T[] = [];
  const deferred: T[] = [];
  const taken = new Array(lanes.length).fill(0);
  for (let i = 0; out.length + deferred.length < items.length; i++) {
    let progressed = false;
    for (let l = 0; l < lanes.length; l++) {
      const lane = lanes[l];
      if (i >= lane.length) continue;
      progressed = true;
      if (taken[l] < cap) {
        out.push(lane[i]);
        taken[l]++;
      } else {
        deferred.push(lane[i]);
      }
    }
    if (!progressed) break;
  }
  return [...out, ...deferred];
}

