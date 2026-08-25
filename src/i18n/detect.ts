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
      // South Asia (launch region — densest coverage)
      "Asia/Dhaka": "BD",
      "Asia/Kolkata": "IN",
      "Asia/Calcutta": "IN",
      "Asia/Karachi": "PK",
      "Asia/Colombo": "LK",
      "Asia/Kathmandu": "NP",
      "Asia/Thimphu": "BT",
      "Indian/Maldives": "MV",
      "Asia/Kabul": "AF",
      // Southeast & East Asia
      "Asia/Jakarta": "ID",
      "Asia/Makassar": "ID",
      "Asia/Pontianak": "ID",
      "Asia/Jayapura": "ID",
      "Asia/Kuala_Lumpur": "MY",
      "Asia/Kuching": "MY",
      "Asia/Brunei": "BN",
      "Asia/Singapore": "SG",
      "Asia/Bangkok": "TH",
      "Asia/Manila": "PH",
      "Asia/Ho_Chi_Minh": "VN",
      "Asia/Phnom_Penh": "KH",
      "Asia/Shanghai": "CN",
      "Asia/Urumqi": "CN",
      "Asia/Hong_Kong": "HK",
      "Asia/Taipei": "TW",
      "Asia/Tokyo": "JP",
      "Asia/Seoul": "KR",
      // Middle East & Central Asia
      "Asia/Riyadh": "SA",
      "Asia/Dubai": "AE",
      "Asia/Qatar": "QA",
      "Asia/Kuwait": "KW",
      "Asia/Bahrain": "BH",
      "Asia/Muscat": "OM",
      "Asia/Aden": "YE",
      "Asia/Amman": "JO",
      "Asia/Beirut": "LB",
      "Asia/Damascus": "SY",
      "Asia/Baghdad": "IQ",
      "Asia/Gaza": "PS",
      "Asia/Hebron": "PS",
      "Asia/Jerusalem": "IL",
      "Asia/Tehran": "IR",
      "Europe/Istanbul": "TR",
      "Asia/Baku": "AZ",
      "Asia/Tashkent": "UZ",
      "Asia/Samarkand": "UZ",
      "Asia/Almaty": "KZ",
      "Asia/Bishkek": "KG",
      "Asia/Dushanbe": "TJ",
      "Asia/Ashgabat": "TM",
      // Africa
      "Africa/Cairo": "EG",
      "Africa/Tripoli": "LY",
      "Africa/Khartoum": "SD",
      "Africa/Casablanca": "MA",
      "Africa/Algiers": "DZ",
      "Africa/Tunis": "TN",
      "Africa/Nouakchott": "MR",
      "Africa/Dakar": "SN",
      "Africa/Bamako": "ML",
      "Africa/Niamey": "NE",
      "Africa/Ouagadougou": "BF",
      "Africa/Abidjan": "CI",
      "Africa/Conakry": "GN",
      "Africa/Ndjamena": "TD",
      "Africa/Douala": "CM",
      "Africa/Lagos": "NG",
      "Africa/Accra": "GH",
      "Africa/Freetown": "SL",
      "Africa/Banjul": "GM",
      "Africa/Mogadishu": "SO",
      "Africa/Djibouti": "DJ",
      "Africa/Addis_Ababa": "ET",
      "Africa/Asmara": "ER",
      "Africa/Nairobi": "KE",
      "Africa/Dar_es_Salaam": "TZ",
      "Africa/Kampala": "UG",
      "Africa/Kigali": "RW",
      "Africa/Maputo": "MZ",
      "Africa/Johannesburg": "ZA",
      // Europe
      "Europe/London": "GB",
      "Europe/Dublin": "IE",
      "Europe/Paris": "FR",
      "Europe/Berlin": "DE",
      "Europe/Vienna": "AT",
      "Europe/Zurich": "CH",
      "Europe/Amsterdam": "NL",
      "Europe/Brussels": "BE",
      "Europe/Madrid": "ES",
      "Europe/Lisbon": "PT",
      "Europe/Rome": "IT",
      "Europe/Stockholm": "SE",
      "Europe/Oslo": "NO",
      "Europe/Copenhagen": "DK",
      "Europe/Helsinki": "FI",
      "Europe/Warsaw": "PL",
      "Europe/Moscow": "RU",
      "Europe/Kiev": "UA",
      "Europe/Kyiv": "UA",
      "Europe/Sarajevo": "BA",
      "Europe/Tirane": "AL",
      "Europe/Belgrade": "XK",
      "Europe/Skopje": "MK",
      "Europe/Sofia": "BG",
      "Europe/Athens": "GR",
      "Europe/Bucharest": "RO",
      // Americas & Oceania
      "America/New_York": "US",
      "America/Chicago": "US",
      "America/Denver": "US",
      "America/Phoenix": "US",
      "America/Los_Angeles": "US",
      "America/Toronto": "CA",
      "America/Vancouver": "CA",
      "America/Edmonton": "CA",
      "America/Mexico_City": "MX",
      "America/Argentina/Buenos_Aires": "AR",
      "America/Santiago": "CL",
      "America/Bogota": "CO",
      "America/Sao_Paulo": "BR",
      "America/Port_of_Spain": "TT",
      "America/Guyana": "GY",
      "America/Paramaribo": "SR",
      "Australia/Sydney": "AU",
      "Australia/Melbourne": "AU",
      "Australia/Perth": "AU",
      "Pacific/Auckland": "NZ",
      "Pacific/Fiji": "FJ",
    };
    return map[tz] ?? null;
  } catch {
    return null;
  }
}
