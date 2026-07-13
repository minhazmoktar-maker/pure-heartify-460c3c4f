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
  | "ms"
  | "fa"
  | "ha"
  | "ps"
  | "zh"
  | "ko"
  | "ja"
  | "es"
  | "pt"
  | "sw";

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
  { code: "fa", label: "Persian", native: "فارسی" },
  { code: "ha", label: "Hausa", native: "Hausa" },
  { code: "ps", label: "Pashto", native: "پښتو" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
];

export const RTL_LANGUAGES: ReadonlySet<LanguageCode> = new Set(["ar", "ur", "fa", "ps"]);

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
