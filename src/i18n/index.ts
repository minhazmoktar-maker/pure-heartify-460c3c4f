/**
 * Lightweight i18n for Heartify.
 * - Dictionaries are lazy-loaded per language, so bundle size is unaffected.
 * - Missing keys fall back to English, then to the raw key.
 * - Simple {var} interpolation. No plurals yet — add ICU later if needed.
 */
import enDict from "./dictionaries/en.json";

export type LanguageCode =
  | "en"
  | "ar"
  | "tr"
  | "bn"
  | "id"
  | "fr"
  | "de"
  | "ur"
  | "ms";

export const SUPPORTED_LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "ur", label: "Urdu", native: "اردو" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu" },
];

export const RTL_LANGUAGES: ReadonlySet<LanguageCode> = new Set(["ar", "ur"]);

type Dict = Record<string, string>;
const cache: Partial<Record<LanguageCode, Dict>> = { en: enDict as Dict };

export async function loadDictionary(lang: LanguageCode): Promise<Dict> {
  if (cache[lang]) return cache[lang]!;
  try {
    const mod = await import(`./dictionaries/${lang}.json`);
    cache[lang] = mod.default as Dict;
    return cache[lang]!;
  } catch {
    return enDict as Dict;
  }
}

export function translate(
  dict: Dict | undefined,
  key: string,
  vars?: Record<string, string | number>,
  fallback?: string,
): string {
  const raw = dict?.[key] ?? (enDict as Dict)[key] ?? fallback ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
