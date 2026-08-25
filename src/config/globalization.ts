/**
 * Heartify globalization manifest — the single source of truth for locales the
 * app ships to iOS, Android and the web.
 *
 * Modeled on how leading global platforms (YouTube, Spotify, Netflix) declare
 * internationalization:
 *  - Locales are **BCP-47 tags**, not bare ISO-639 codes, so region variants
 *    (en-GB, bn-IN, pt-BR, zh-Hant) resolve correctly on device.
 *  - Every tag maps back to one of Heartify's translated dictionaries
 *    (`LanguageCode`), so a region variant never produces missing strings —
 *    it falls back to its base language.
 *  - Text direction, native endonym and a default calendar/numbering hint
 *    travel with the locale, because RTL and Hijri-first surfaces are core to
 *    the product rather than an afterthought.
 *
 * The native platform files are generated from this table:
 *  - Android  → `android/app/src/main/res/xml/locales_config.xml`
 *               (per-app language picker, Android 13+ / API 33)
 *  - iOS      → `CFBundleLocalizations` in `ios/App/App/Info.plist`
 *               (see docs/ios-info-plist-additions.xml)
 * Keep all three in sync: adding a dictionary means adding a row here and
 * re-declaring it on both platforms, otherwise the OS language picker will
 * not offer it.
 */
import { RTL_LANGUAGES, SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n";

export type TextDirection = "ltr" | "rtl";

export interface AppLocale {
  /** BCP-47 tag exposed to the OS (Android locale config, iOS CFBundleLocalizations). */
  tag: string;
  /** Dictionary this tag resolves to. Region variants share their base dictionary. */
  language: LanguageCode;
  /** Endonym shown in Heartify's own language picker. */
  native: string;
  /** English label for admin/debug surfaces. */
  label: string;
  dir: TextDirection;
  /** Primary markets — drives store listing locales and content defaults. */
  regions: string[];
}

const dir = (l: LanguageCode): TextDirection => (RTL_LANGUAGES.has(l) ? "rtl" : "ltr");
const meta = (l: LanguageCode) => SUPPORTED_LANGUAGES.find((x) => x.code === l)!;

function locale(
  tag: string,
  language: LanguageCode,
  regions: string[],
  overrides: Partial<Pick<AppLocale, "native" | "label">> = {},
): AppLocale {
  const base = meta(language);
  return {
    tag,
    language,
    native: overrides.native ?? base.native,
    label: overrides.label ?? base.label,
    dir: dir(language),
    regions,
  };
}

/**
 * Every locale the native apps declare, ordered by expected launch volume
 * (South Asia first, then the wider Muslim world, then diaspora markets).
 */
export const APP_LOCALES: readonly AppLocale[] = [
  // ---- Launch region: South Asia ----
  locale("bn", "bn", ["BD"]),
  locale("bn-IN", "bn", ["IN"], { label: "Bengali (India)", native: "বাংলা (ভারত)" }),
  locale("ur", "ur", ["PK"]),
  locale("ur-IN", "ur", ["IN"], { label: "Urdu (India)", native: "اردو (بھارت)" }),
  locale("ps", "ps", ["AF", "PK"]),
  // ---- English variants (default + diaspora) ----
  locale("en", "en", ["US", "CA", "AU", "NZ", "ZA", "NG", "KE", "IN", "PK", "BD"]),
  locale("en-GB", "en", ["GB", "IE"], { label: "English (UK)", native: "English (UK)" }),
  // ---- Arabic & Persianate ----
  locale("ar", "ar", ["SA", "AE", "EG", "QA", "KW", "BH", "OM", "JO", "MA", "DZ", "TN", "IQ", "LY", "SD", "YE"]),
  locale("fa", "fa", ["IR", "AF", "TJ"]),
  locale("tr", "tr", ["TR", "DE", "AZ", "BA", "MK", "BG"]),
  // ---- Southeast Asia ----
  locale("id", "id", ["ID"]),
  locale("ms", "ms", ["MY", "BN", "SG"]),
  // ---- Africa ----
  locale("ha", "ha", ["NG", "NE", "GH", "BF"]),
  locale("sw", "sw", ["KE", "TZ", "UG", "RW"]),
  // ---- Europe & Americas ----
  locale("fr", "fr", ["FR", "BE", "CH", "CA", "SN", "ML", "CI", "MA", "DZ", "TN"]),
  locale("de", "de", ["DE", "AT", "CH"]),
  locale("es", "es", ["ES"]),
  locale("es-419", "es", ["MX", "AR", "CL", "CO"], {
    label: "Spanish (Latin America)",
    native: "Español (Latinoamérica)",
  }),
  locale("pt-PT", "pt", ["PT"], { label: "Portuguese (Portugal)", native: "Português (Portugal)" }),
  locale("pt-BR", "pt", ["BR"], { label: "Portuguese (Brazil)", native: "Português (Brasil)" }),
  // ---- East Asia ----
  locale("zh-Hans", "zh", ["CN", "SG"], { label: "Chinese (Simplified)", native: "简体中文" }),
  locale("zh-Hant", "zh", ["TW", "HK"], { label: "Chinese (Traditional)", native: "繁體中文" }),
  locale("ja", "ja", ["JP"]),
  locale("ko", "ko", ["KR"]),
];

/** Locale used when the device language matches nothing we translate. */
export const DEFAULT_LOCALE = "en";

/** BCP-47 tags for native platform declarations. */
export const NATIVE_LOCALE_TAGS: readonly string[] = APP_LOCALES.map((l) => l.tag);

/** Locales rendered right-to-left — used for native layout mirroring. */
export const RTL_LOCALE_TAGS: readonly string[] = APP_LOCALES.filter((l) => l.dir === "rtl").map(
  (l) => l.tag,
);

/**
 * Resolve an OS locale tag (e.g. "bn-BD", "zh-Hant-TW", "es-MX") to the
 * dictionary Heartify should load. Matching is exact tag → script/region tag →
 * base language → English, mirroring platform locale negotiation.
 */
export function resolveLocale(tag: string | null | undefined): AppLocale {
  const fallback = APP_LOCALES.find((l) => l.tag === DEFAULT_LOCALE)!;
  if (!tag) return fallback;
  const normalized = tag.replace(/_/g, "-");
  const lower = normalized.toLowerCase();

  const exact = APP_LOCALES.find((l) => l.tag.toLowerCase() === lower);
  if (exact) return exact;

  // Script-aware match: zh-Hant-TW → zh-Hant.
  const parts = normalized.split("-");
  for (let end = parts.length - 1; end >= 2; end--) {
    const candidate = parts.slice(0, end).join("-").toLowerCase();
    const hit = APP_LOCALES.find((l) => l.tag.toLowerCase() === candidate);
    if (hit) return hit;
  }

  // Latin-American Spanish and Brazilian Portuguese need explicit region routing.
  const base = parts[0].toLowerCase();
  const region = parts.find((p) => /^[A-Z]{2}$/.test(p));
  if (base === "es" && region && region !== "ES") {
    return APP_LOCALES.find((l) => l.tag === "es-419") ?? fallback;
  }
  if (base === "pt") {
    return (
      APP_LOCALES.find((l) => l.tag === (region === "PT" ? "pt-PT" : "pt-BR")) ?? fallback
    );
  }

  const byLanguage = APP_LOCALES.find((l) => l.tag.toLowerCase() === base) ??
    APP_LOCALES.find((l) => l.language === base);
  return byLanguage ?? fallback;
}

/** Text direction for an arbitrary OS locale tag. */
export function directionForLocale(tag: string | null | undefined): TextDirection {
  return resolveLocale(tag).dir;
}
