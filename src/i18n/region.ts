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

/** Countries whose users should see local-language content first. */
export const REGION_CONTENT_LANGUAGES: Record<string, LanguageCode[]> = {
  BD: ["bn", "en", "ar"],
  PK: ["ur", "en", "ar"],
  IN: ["ur", "bn", "en", "ar"],
  LK: ["ur", "en", "ar"],
  NP: ["ur", "en", "ar"],
  ID: ["id", "en", "ar"],
  MY: ["ms", "en", "ar"],
  BN: ["ms", "en", "ar"],
  TR: ["tr", "en", "ar"],
  AF: ["ps", "fa", "en", "ar"],
  IR: ["fa", "en", "ar"],
  SA: ["ar", "en"],
  AE: ["ar", "en"],
  QA: ["ar", "en"],
  KW: ["ar", "en"],
  BH: ["ar", "en"],
  OM: ["ar", "en"],
  EG: ["ar", "en"],
  MA: ["ar", "fr", "en"],
  DZ: ["ar", "fr", "en"],
  TN: ["ar", "fr", "en"],
  NG: ["ha", "en", "ar"],
  KE: ["sw", "en", "ar"],
  TZ: ["sw", "en", "ar"],
  FR: ["fr", "en", "ar"],
  DE: ["de", "tr", "en", "ar"],
  ES: ["es", "en", "ar"],
  PT: ["pt", "en", "ar"],
  BR: ["pt", "en", "ar"],
  CN: ["zh", "en", "ar"],
  JP: ["ja", "en", "ar"],
  KR: ["ko", "en", "ar"],
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
  if (first !== "en") return first;
  const nonEnglish = list.map((l) => l.toLowerCase()).find((l) => l !== "en" && l !== "ar");
  return nonEnglish ?? null;
}
