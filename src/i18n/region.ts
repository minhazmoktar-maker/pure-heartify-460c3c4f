/**
 * Region → content-language mapping.
 *
 * Heartify launches in South Asia first (Bangladesh, India, Pakistan), so the
 * default content mix must feel *local* on first open rather than English-first.
 * Device language is an unreliable signal in these markets (a Dhaka user very
 * often runs an en-US phone), so country is the stronger prior for *content*
 * language while the device language still drives the UI.
 *
 * Ordering is meaningful: index 0 is the "primary" language and the feed/surface
 * functions reserve a guaranteed share of every page for it.
 */
import type { LanguageCode } from "./index";

/**
 * Countries whose users should see local-language content first.
 *
 * Coverage goal: every country with a meaningful Muslim population or diaspora,
 * mapped onto the languages Heartify actually supports. Arabic is kept in the
 * tail almost everywhere because it is the liturgical language and is broadly
 * intelligible for Qur'an/dhikr content even where it isn't spoken.
 */
export const REGION_CONTENT_LANGUAGES: Record<string, LanguageCode[]> = {
  // ---- South Asia (launch region) ----
  BD: ["bn", "en", "ar"],
  PK: ["ur", "en", "ar"],
  IN: ["ur", "bn", "en", "ar"],
  LK: ["ur", "en", "ar"],
  NP: ["ur", "en", "ar"],
  BT: ["bn", "en", "ar"],
  MV: ["ur", "en", "ar"],
  AF: ["ps", "fa", "en", "ar"],
  // ---- Southeast & East Asia ----
  ID: ["id", "en", "ar"],
  MY: ["ms", "en", "ar"],
  BN: ["ms", "en", "ar"],
  SG: ["ms", "en", "zh", "ar"],
  TH: ["ms", "en", "ar"],
  PH: ["en", "ar"],
  VN: ["en", "ar"],
  KH: ["ms", "en", "ar"],
  CN: ["zh", "en", "ar"],
  HK: ["zh", "en", "ar"],
  TW: ["zh", "en", "ar"],
  JP: ["ja", "en", "ar"],
  KR: ["ko", "en", "ar"],
  // ---- Middle East & Central Asia ----
  SA: ["ar", "en"],
  AE: ["ar", "en", "ur"],
  QA: ["ar", "en", "ur"],
  KW: ["ar", "en", "ur"],
  BH: ["ar", "en", "ur"],
  OM: ["ar", "en", "ur"],
  YE: ["ar", "en"],
  JO: ["ar", "en"],
  LB: ["ar", "fr", "en"],
  SY: ["ar", "tr", "en"],
  IQ: ["ar", "fa", "en"],
  PS: ["ar", "en"],
  IL: ["ar", "en"],
  IR: ["fa", "en", "ar"],
  TR: ["tr", "en", "ar"],
  AZ: ["tr", "fa", "en", "ar"],
  UZ: ["fa", "en", "ar"],
  KZ: ["en", "ar"],
  KG: ["en", "ar"],
  TJ: ["fa", "en", "ar"],
  TM: ["fa", "en", "ar"],
  // ---- North & Sub-Saharan Africa ----
  EG: ["ar", "en"],
  LY: ["ar", "en"],
  SD: ["ar", "en"],
  MA: ["ar", "fr", "en"],
  DZ: ["ar", "fr", "en"],
  TN: ["ar", "fr", "en"],
  MR: ["ar", "fr", "en"],
  SN: ["fr", "ar", "en"],
  ML: ["fr", "ar", "en"],
  NE: ["ha", "fr", "ar", "en"],
  BF: ["fr", "ha", "ar", "en"],
  CI: ["fr", "ar", "en"],
  GN: ["fr", "ar", "en"],
  TD: ["fr", "ar", "en"],
  CM: ["fr", "en", "ar"],
  NG: ["ha", "en", "ar"],
  GH: ["en", "ha", "ar"],
  SL: ["en", "ar"],
  GM: ["en", "ar"],
  SO: ["ar", "sw", "en"],
  DJ: ["ar", "fr", "en"],
  ET: ["ar", "sw", "en"],
  ER: ["ar", "en"],
  KE: ["sw", "en", "ar"],
  TZ: ["sw", "en", "ar"],
  UG: ["sw", "en", "ar"],
  RW: ["sw", "fr", "en"],
  MZ: ["pt", "sw", "en", "ar"],
  ZA: ["en", "ur", "ar"],
  // ---- Europe ----
  // Diaspora markets get a *strong international mix*: the local/interface
  // language first, then the languages the local Muslim community actually
  // speaks, so a viewer in London or Chicago sees a world-wide feed rather
  // than a thin single-language one.
  GB: ["en", "ur", "bn", "ar", "tr"],
  IE: ["en", "ar", "ur", "fr"],
  FR: ["fr", "ar", "en", "tr", "ha"],
  DE: ["de", "tr", "ar", "en", "fa", "bn"],
  AT: ["de", "tr", "ar", "en", "bn"],
  CH: ["de", "fr", "ar", "en", "tr"],
  NL: ["en", "tr", "ar", "ur", "id"],
  BE: ["fr", "ar", "en", "tr"],
  LU: ["fr", "de", "en", "ar"],
  ES: ["es", "ar", "en", "fr"],
  PT: ["pt", "ar", "en", "bn"],
  IT: ["en", "ar", "fr", "bn", "ur"],
  MT: ["en", "ar"],
  SE: ["en", "ar", "fa", "tr"],
  NO: ["en", "ar", "ur", "tr", "fa"],
  DK: ["en", "ar", "tr", "ur", "bn"],
  FI: ["en", "ar", "sw", "fa"],
  IS: ["en", "ar"],
  PL: ["en", "ar", "tr"],
  CZ: ["en", "ar", "tr"],
  SK: ["en", "ar", "tr"],
  HU: ["en", "ar", "tr"],
  SI: ["en", "tr", "ar"],
  HR: ["en", "tr", "ar"],
  RS: ["tr", "en", "ar"],
  ME: ["tr", "en", "ar"],
  RU: ["en", "ar", "tr", "fa"],
  BY: ["en", "ar", "tr"],
  UA: ["en", "ar", "tr"],
  MD: ["en", "ar", "tr"],
  BA: ["tr", "en", "ar"],
  AL: ["tr", "en", "ar"],
  XK: ["tr", "en", "ar"],
  MK: ["tr", "en", "ar"],
  BG: ["tr", "en", "ar"],
  GR: ["en", "ar", "tr"],
  CY: ["tr", "en", "ar"],
  RO: ["en", "ar", "tr"],
  GE: ["en", "tr", "ar", "fa"],
  AM: ["en", "fa", "ar"],
  // ---- Americas & Oceania ----
  // North America is the strongest English-first international market: the
  // community is overwhelmingly multi-origin (South Asian, Arab, African,
  // Turkish, Southeast Asian), so English leads and the tail is deliberately
  // wide instead of a single second language.
  US: ["en", "ar", "ur", "bn", "es", "id", "tr", "fr", "sw"],
  CA: ["en", "ar", "ur", "bn", "fr", "id", "tr", "sw"],
  PR: ["es", "en", "ar"],
  MX: ["es", "en", "ar"],
  GT: ["es", "en", "ar"],
  CR: ["es", "en", "ar"],
  PA: ["es", "en", "ar"],
  DO: ["es", "en", "ar"],
  CU: ["es", "en", "ar"],
  AR: ["es", "en", "ar"],
  CL: ["es", "en", "ar"],
  CO: ["es", "en", "ar"],
  PE: ["es", "en", "ar"],
  EC: ["es", "en", "ar"],
  BO: ["es", "en", "ar"],
  PY: ["es", "en", "ar"],
  UY: ["es", "en", "ar"],
  VE: ["es", "en", "ar"],
  BR: ["pt", "en", "ar"],
  JM: ["en", "ar", "ur"],
  TT: ["en", "ur", "ar", "bn"],
  GY: ["en", "ur", "ar", "bn"],
  SR: ["en", "ur", "ar", "id"],
  BB: ["en", "ar"],
  AU: ["en", "ar", "ur", "bn", "id", "tr"],
  NZ: ["en", "ar", "ur", "id"],
  FJ: ["en", "ur", "ar"],
  PG: ["en", "ar", "ms"],
  NC: ["fr", "en", "ar"],
};


/**
 * Default content languages for a user, ordered primary-first.
 * Country wins over device language in launch markets; device language is
 * folded in right after the local language so bilingual users still see it.
 */
export function defaultContentLanguages(
  detectedLanguage: LanguageCode,
  country: string | null,
): LanguageCode[] {
  const regional = country ? REGION_CONTENT_LANGUAGES[country.toUpperCase()] : undefined;
  const ordered: LanguageCode[] = regional
    ? // Keep the regional primary at index 0, then the device language, then the
      // rest of the regional list.
      [regional[0], detectedLanguage, ...regional.slice(1)]
    : [detectedLanguage, "en", "ar"];
  return Array.from(new Set(ordered)) as LanguageCode[];
}

/**
 * The language whose share of the feed is guaranteed. This is the first entry
 * of `content_languages` unless it is English — English is abundant enough that
 * it never needs a floor, and reserving for it is what made local markets feel
 * foreign in the first place.
 */
export function primaryContentLanguage(
  contentLanguages: readonly string[] | undefined | null,
): string | null {
  const list = (contentLanguages ?? []).filter(Boolean);
  if (list.length === 0) return null;
  const first = list[0].toLowerCase();
  // English-led markets reserve nothing: the tail languages stay eligible but
  // must earn their place by relevance instead of holding a guaranteed share.
  return first === "en" ? null : first;
}

/**
 * Promote the regional language to index 0 for an existing selection.
 *
 * Accounts that were created before region-first defaults stored an
 * English-first list, which in launch markets (BD/PK/IN/ID/...) produced a
 * feed that felt foreign. This keeps every language the user selected and only
 * reorders, so it is safe to apply on every hydrate.
 */
export function regionFirst(
  selected: readonly LanguageCode[] | null | undefined,
  country: string | null | undefined,
  uiLanguage: LanguageCode,
): LanguageCode[] {
  const list = (selected ?? []).filter(Boolean) as LanguageCode[];
  if (list.length === 0) return defaultContentLanguages(uiLanguage, country ?? null);
  const regional = country ? REGION_CONTENT_LANGUAGES[country.toUpperCase()] : undefined;
  const local = regional?.[0];
  if (!local || local === "en" || list[0] === local) return list;
  // Only reorder when the user already has the local language selected —
  // never silently add a language they removed.
  if (!list.includes(local)) return list;
  return [local, ...list.filter((l) => l !== local)];
}
