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

/** Target share of a page reserved for the primary language. */
export const PRIMARY_LANGUAGE_SHARE = 0.45;

/**
 * Interleave so that ~`share` of the first `limit` positions carry the
 * primary language, preserving the relative order inside each group.
 * Degrades gracefully: with no primary-language supply the input order is
 * returned untouched.
 */
export function interleavePrimaryLanguage<T>(
  items: T[],
  getLang: (v: T) => string | null,
  primary: string | null,
  limit: number,
  share = PRIMARY_LANGUAGE_SHARE,
): T[] {
  if (!primary || items.length === 0) return items;

  const local: T[] = [];
  const other: T[] = [];
  for (const v of items) {
    if ((getLang(v) ?? "").toLowerCase() === primary) local.push(v);
    else other.push(v);
  }
  if (local.length === 0 || other.length === 0) return items;

  const window = Math.max(1, Math.min(limit, items.length));
  // Never promise more local slots than we actually have supply for.
  const quota = Math.min(local.length, Math.max(1, Math.round(window * share)));
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
