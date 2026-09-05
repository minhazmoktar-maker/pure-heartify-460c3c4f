/**
 * CENTRAL language-relevance resolution.
 *
 * One place decides "which languages does this person actually understand, and
 * in what order?" — every surface (feed, recommendations, Shorts, search)
 * should resolve through here rather than re-deriving its own rules.
 *
 * Signals, in strict priority order:
 *   1. explicit user preference (chosen in settings/onboarding)
 *   2. demonstrated behaviour (languages they actually watch)
 *   3. app/device language
 *   4. country/region — a *contextual* signal only, never an override
 *
 * Nothing here hard-blocks content. A language the user has no evidence for is
 * downweighted, not removed: subtitles, high relevance, or a strong quality
 * signal can still surface it. That keeps the catalog discoverable while
 * stopping unrelated-language content (e.g. Indonesian for a Dhaka user who
 * never chose it) from dominating the page.
 */

import { REGION_CONTENT_LANGUAGES, type LanguageCode } from "@/i18n/region";
import { sanitizeLang } from "@/lib/languageBalance";

export type LanguageSource = "explicit" | "behavior" | "device" | "region";

export interface LanguageSignals {
  /** Languages the user explicitly selected. Highest priority. */
  explicit?: readonly string[] | null;
  /** UI/device language (e.g. navigator language). */
  deviceLanguage?: string | null;
  /** ISO-3166 country from profile or timezone. Contextual only. */
  country?: string | null;
  /**
   * Watch/behaviour counts per language, e.g. { bn: 40, ar: 6 }.
   * Only languages above `behaviorMinWatches` count as demonstrated.
   */
  behavior?: Readonly<Record<string, number>> | null;
  behaviorMinWatches?: number;
}

export interface ResolvedLanguages {
  /** Ordered, de-duplicated language list — index 0 leads the page. */
  languages: string[];
  /** Where each language came from (strongest source wins). */
  sources: Record<string, LanguageSource>;
  /** Language guaranteed a share of the page (never `en`, never `ar`). */
  primary: string | null;
  /** True when the user made a real choice — region must not reorder it. */
  explicit: boolean;
}

const UNIVERSAL = ["en", "ar"] as const;

/** Ordered languages for a country, or null when unknown. */
function regionLanguages(country: string | null | undefined): string[] | null {
  if (!country) return null;
  const list = REGION_CONTENT_LANGUAGES[country.toUpperCase() as string] as
    | LanguageCode[]
    | undefined;
  return list ? [...list] : null;
}

/**
 * Resolve the ordered content languages for a user from all available signals.
 * Explicit preferences always lead; region only fills gaps.
 */
export function resolveContentLanguages(signals: LanguageSignals): ResolvedLanguages {
  const sources: Record<string, LanguageSource> = {};
  const ordered: string[] = [];

  const add = (raw: unknown, source: LanguageSource) => {
    const lang = sanitizeLang(raw);
    if (!lang) return;
    if (!(lang in sources)) {
      sources[lang] = source;
      ordered.push(lang);
    }
  };

  const explicit = (signals.explicit ?? []).map(sanitizeLang).filter(Boolean) as string[];
  for (const l of explicit) add(l, "explicit");

  const minWatches = signals.behaviorMinWatches ?? 3;
  const demonstrated = Object.entries(signals.behavior ?? {})
    .filter(([, n]) => typeof n === "number" && n >= minWatches)
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l);
  for (const l of demonstrated) add(l, "behavior");

  add(signals.deviceLanguage, "device");

  for (const l of regionLanguages(signals.country) ?? []) add(l, "region");

  // Universal fallbacks so a page can always be filled.
  for (const l of UNIVERSAL) add(l, "region");

  const hasExplicit = explicit.length > 0;
  const primary =
    ordered.find(
      (l) => !UNIVERSAL.includes(l as (typeof UNIVERSAL)[number]) && sources[l] !== "region",
    ) ??
    ordered.find((l) => !UNIVERSAL.includes(l as (typeof UNIVERSAL)[number])) ??
    null;

  return { languages: ordered, sources, primary, explicit: hasExplicit };
}

export interface ContentLanguageInfo {
  /** Detected spoken language of the item. */
  language?: string | null;
  /** 0..1 detection confidence; unknown is treated as 0.5. */
  languageConfidence?: number | null;
  /** Subtitle/caption/transcript languages available. */
  subtitleLanguages?: readonly string[] | null;
}

/** Weight per signal source — explicit choice outranks a geographic guess. */
const SOURCE_WEIGHT: Record<LanguageSource, number> = {
  explicit: 1,
  behavior: 0.95,
  device: 0.85,
  region: 0.7,
};

/** Floor so no legitimate content is ever effectively hard-blocked. */
export const MIN_LANGUAGE_RELEVANCE = 0.2;

/**
 * How relevant an item's language is to a resolved user profile: 1 for a
 * top-preference match, down to `MIN_LANGUAGE_RELEVANCE` for a language with
 * no supporting signal at all. Subtitles in an understood language recover
 * most of the gap; low detection confidence pulls the score toward neutral
 * rather than punishing an item for a bad guess.
 */
export function languageRelevance(
  item: ContentLanguageInfo,
  resolved: ResolvedLanguages,
): number {
  const lang = sanitizeLang(item.language);
  const confidence =
    typeof item.languageConfidence === "number"
      ? Math.min(1, Math.max(0, item.languageConfidence))
      : 0.5;

  const scoreFor = (l: string | null): number | null => {
    if (!l) return null;
    const source = resolved.sources[l];
    if (!source) return null;
    const rank = resolved.languages.indexOf(l);
    const positional = 1 - Math.min(rank, 5) * 0.08;
    return SOURCE_WEIGHT[source] * positional;
  };

  const direct = scoreFor(lang);

  // Best subtitle match: understandable, but slightly less native than audio.
  let subtitle: number | null = null;
  for (const s of item.subtitleLanguages ?? []) {
    const v = scoreFor(sanitizeLang(s));
    if (v !== null) subtitle = Math.max(subtitle ?? 0, v * 0.85);
  }

  const best = Math.max(direct ?? 0, subtitle ?? 0);
  if (best === 0) return MIN_LANGUAGE_RELEVANCE;

  // Low-confidence detection: blend toward neutral so we neither over-reward
  // nor over-punish an uncertain label.
  const neutral = (best + MIN_LANGUAGE_RELEVANCE) / 2;
  const blended = direct !== null && subtitle === null ? confidence * best + (1 - confidence) * neutral : best;
  return Math.min(1, Math.max(MIN_LANGUAGE_RELEVANCE, blended));
}

/**
 * Rank items by combined intrinsic quality/relevance and language relevance.
 * Language is a strong multiplier, not a filter — a far better video in a
 * secondary language still beats a weak one in the primary language.
 */
export function rankByLanguageRelevance<T extends ContentLanguageInfo>(
  items: readonly T[],
  resolved: ResolvedLanguages,
  baseScore: (item: T) => number = () => 1,
): T[] {
  return [...items]
    .map((item, i) => ({
      item,
      i,
      score: baseScore(item) * languageRelevance(item, resolved),
    }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.item);
}
