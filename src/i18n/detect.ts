/**
 * Best-effort locale detection with zero third-party geo-IP calls.
 * Runs entirely client-side. Users can always override.
 */
import { SUPPORTED_LANGUAGES, type LanguageCode } from "./index";

const SUPPORTED = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export function detectLanguage(): LanguageCode {
  if (typeof navigator === "undefined") return "en";
  const candidates = [navigator.language, ...(navigator.languages ?? [])];
  for (const c of candidates) {
    const base = c.split("-")[0].toLowerCase() as LanguageCode;
    if (SUPPORTED.has(base)) return base;
  }
  return "en";
}

/** Rough country guess from Intl timezone; nulls are honest. */
export function detectCountry(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    // Small, extensible map — falls back to null when unknown.
    const map: Record<string, string> = {
      "Europe/Istanbul": "TR",
      "Asia/Dhaka": "BD",
      "Asia/Jakarta": "ID",
      "Asia/Makassar": "ID",
      "Europe/Paris": "FR",
      "Europe/Berlin": "DE",
      "Asia/Riyadh": "SA",
      "Asia/Karachi": "PK",
      "Asia/Kuala_Lumpur": "MY",
      "America/New_York": "US",
      "America/Chicago": "US",
      "America/Los_Angeles": "US",
      "Europe/London": "GB",
    };
    return map[tz] ?? null;
  } catch {
    return null;
  }
}
