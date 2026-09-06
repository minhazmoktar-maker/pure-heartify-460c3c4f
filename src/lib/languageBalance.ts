/**
 * Client-side mirror of the server's local-first language balancing
 * (`supabase/functions/_shared/localFirst.ts`).
 *
 * Surfaces that call a database RPC directly — Shorts is the main one — never
 * pass through the feed/recommendations edge functions, so without this the
 * reel would inherit the raw corpus mix (English-dominant) even for a Bengali
 * or Indonesian user. Keeping the tuning table identical on both sides means
 * Shorts, the feed and recommendations all feel local in the same way.
 *
 * Two forces are balanced:
 *  - local relevance: the user's own language leads the page;
 *  - no crowding out: no single other language may take more than half of the
 *    remaining slots, and thin corpora ask only for what they can fill.
 */

/** Default majority share for the user's primary (local) language. */
export const PRIMARY_LANGUAGE_SHARE = 0.8;

/** Per-language tuned share; unlisted languages use the default. */
export const LANGUAGE_SHARE: Readonly<Record<string, number>> = {
  bn: 0.8,
  ur: 0.8,
  id: 0.8,
  tr: 0.8,
  ar: 0.7,
  hi: 0.7,
  fa: 0.7,
  ms: 0.7,
  ps: 0.6,
  ha: 0.55,
  sw: 0.55,
  fr: 0.6,
  de: 0.55,
  es: 0.6,
  pt: 0.6,
  ru: 0.55,
  zh: 0.5,
  ja: 0.5,
  ko: 0.5,
};

export const MIN_PRIMARY_LANGUAGE_SHARE = 0.35;
export const MAX_SINGLE_OTHER_SHARE = 0.5;

/** 2–3 letter lowercase language code, or null. */
export function sanitizeLang(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const l = x.toLowerCase().replace(/[^a-z]/g, "").slice(0, 3);
  return l.length >= 2 ? l : null;
}

/**
 * The language whose share is guaranteed: the first of the user's ordered
 * content languages that is neither English nor Arabic (both abundant and
 * universal, so neither needs a floor).
 */
export function derivePrimaryLanguage(
  contentLanguages: readonly unknown[] | null | undefined,
): string | null {
  const list = (contentLanguages ?? []).map(sanitizeLang).filter(Boolean) as string[];
  if (list.length === 0) return null;
  // English-led lists get no reserved share — see localFirst.ts.
  if (list[0] === "en") return null;
  return list[0];
}

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

/** Round-robin across languages, capping any single language's lead share. */
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

/**
 * Reorder `items` so ~`shareForLanguage(primary)` of the first `limit`
 * positions carry the primary language, with the remaining slots spread
 * across the other languages. Order inside each language is preserved and a
 * missing local supply returns the input untouched.
 */
export function balanceByLanguage<T>(
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

  const spread = diversifyByLanguage(other, getLang);
  const window = Math.max(1, Math.min(limit, items.length));
  const effectiveShare =
    share ?? shareForLanguage(primary, { localSupply: local.length, window });
  const quota = Math.min(local.length, Math.max(1, Math.round(window * effectiveShare)));
  if (quota === 0) return items;

  const step = window / quota;
  const slots = new Set<number>();
  for (let i = 0; i < quota; i++) slots.add(Math.min(window - 1, Math.floor(i * step)));

  const out: T[] = [];
  let li = 0;
  let oi = 0;
  for (let pos = 0; pos < items.length; pos++) {
    if (pos < window && slots.has(pos) && li < local.length) out.push(local[li++]);
    else if (oi < spread.length) out.push(spread[oi++]);
    else if (li < local.length) out.push(local[li++]);
  }
  return out;
}
