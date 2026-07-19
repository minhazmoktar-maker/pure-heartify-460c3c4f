import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Qibla,
  Madhab,
  type CalculationParameters,
} from "adhan";

export type MadhabKey = "shafi" | "hanafi";
export type MethodKey =
  | "MuslimWorldLeague"
  | "Egyptian"
  | "Karachi"
  | "UmmAlQura"
  | "Dubai"
  | "MoonsightingCommittee"
  | "NorthAmerica"
  | "Kuwait"
  | "Qatar"
  | "Singapore"
  | "Turkey"
  | "Tehran";

const METHOD_MAP: Record<MethodKey, () => CalculationParameters> = {
  MuslimWorldLeague: () => CalculationMethod.MuslimWorldLeague(),
  Egyptian: () => CalculationMethod.Egyptian(),
  Karachi: () => CalculationMethod.Karachi(),
  UmmAlQura: () => CalculationMethod.UmmAlQura(),
  Dubai: () => CalculationMethod.Dubai(),
  MoonsightingCommittee: () => CalculationMethod.MoonsightingCommittee(),
  NorthAmerica: () => CalculationMethod.NorthAmerica(),
  Kuwait: () => CalculationMethod.Kuwait(),
  Qatar: () => CalculationMethod.Qatar(),
  Singapore: () => CalculationMethod.Singapore(),
  Turkey: () => CalculationMethod.Turkey(),
  Tehran: () => CalculationMethod.Tehran(),
};

export const METHOD_LABELS: Record<MethodKey, string> = {
  MuslimWorldLeague: "Muslim World League",
  Egyptian: "Egyptian General Authority",
  Karachi: "University of Islamic Sciences, Karachi",
  UmmAlQura: "Umm al-Qura, Makkah",
  Dubai: "Dubai",
  MoonsightingCommittee: "Moonsighting Committee",
  NorthAmerica: "ISNA (North America)",
  Kuwait: "Kuwait",
  Qatar: "Qatar",
  Singapore: "Singapore",
  Turkey: "Diyanet (Turkey)",
  Tehran: "Tehran",
};

export interface PrayerLocation {
  latitude: number;
  longitude: number;
  label?: string;
  /** True when derived from IP geolocation; encourages an upgrade to GPS. */
  approximate?: boolean;
}

export interface PrayerSlot {
  name: "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
  label: string;
  time: Date;
}

export function computePrayerTimes(
  loc: PrayerLocation,
  date: Date,
  method: MethodKey = "MuslimWorldLeague",
  madhab: MadhabKey = "shafi",
): PrayerSlot[] {
  const coords = new Coordinates(loc.latitude, loc.longitude);
  const params = METHOD_MAP[method]();
  params.madhab = madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  const pt = new PrayerTimes(coords, date, params);
  return [
    { name: "fajr", label: "Fajr", time: pt.fajr },
    { name: "sunrise", label: "Sunrise", time: pt.sunrise },
    { name: "dhuhr", label: "Dhuhr", time: pt.dhuhr },
    { name: "asr", label: "Asr", time: pt.asr },
    { name: "maghrib", label: "Maghrib", time: pt.maghrib },
    { name: "isha", label: "Isha", time: pt.isha },
  ];
}

export function nextPrayer(slots: PrayerSlot[], now: Date = new Date()): PrayerSlot | null {
  return slots.find((s) => s.time.getTime() > now.getTime()) ?? null;
}

export function qiblaBearing(loc: PrayerLocation): number {
  return Qibla(new Coordinates(loc.latitude, loc.longitude));
}

const STORAGE_KEY = "heartify.prayer.settings.v1";

export interface PrayerSettings {
  location: PrayerLocation | null;
  method: MethodKey;
  madhab: MadhabKey;
  adhanEnabled: boolean;
  minutesBefore: number;
  enabledPrayers: Record<PrayerSlot["name"], boolean>;
}

export const DEFAULT_SETTINGS: PrayerSettings = {
  location: null,
  method: "MuslimWorldLeague",
  madhab: "shafi",
  adhanEnabled: false,
  minutesBefore: 0,
  enabledPrayers: {
    fajr: true,
    sunrise: false,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  },
};

export function loadSettings(): PrayerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed, enabledPrayers: { ...DEFAULT_SETTINGS.enabledPrayers, ...(parsed.enabledPrayers ?? {}) } };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: PrayerSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatCountdown(ms: number): string {
  if (ms < 0) return "now";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
