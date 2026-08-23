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
    // South Asia is covered densely: it is the launch region and device
    // language there is a poor proxy for content language.
    const map: Record<string, string> = {
      "Europe/Istanbul": "TR",
      "Asia/Dhaka": "BD",
      "Asia/Kolkata": "IN",
      "Asia/Calcutta": "IN",
      "Asia/Karachi": "PK",
      "Asia/Colombo": "LK",
      "Asia/Kathmandu": "NP",
      "Asia/Kabul": "AF",
      "Asia/Tehran": "IR",
      "Asia/Jakarta": "ID",
      "Asia/Makassar": "ID",
      "Asia/Pontianak": "ID",
      "Asia/Jayapura": "ID",
      "Asia/Brunei": "BN",
      "Europe/Paris": "FR",
      "Europe/Berlin": "DE",
      "Europe/Madrid": "ES",
      "Europe/Lisbon": "PT",
      "Asia/Riyadh": "SA",
      "Asia/Dubai": "AE",
      "Asia/Qatar": "QA",
      "Asia/Kuwait": "KW",
      "Asia/Bahrain": "BH",
      "Asia/Muscat": "OM",
      "Africa/Cairo": "EG",
      "Africa/Casablanca": "MA",
      "Africa/Algiers": "DZ",
      "Africa/Tunis": "TN",
      "Africa/Lagos": "NG",
      "Africa/Nairobi": "KE",
      "Africa/Dar_es_Salaam": "TZ",
      "Asia/Kuala_Lumpur": "MY",
      "Asia/Singapore": "SG",
      "America/New_York": "US",
      "America/Chicago": "US",
      "America/Denver": "US",
      "America/Los_Angeles": "US",
      "America/Toronto": "CA",
      "America/Sao_Paulo": "BR",
      "Europe/London": "GB",
    };
    return map[tz] ?? null;
  } catch {
    return null;
  }
}
