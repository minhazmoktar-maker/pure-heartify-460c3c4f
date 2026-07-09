// Cross-platform DTOs. Kept dependency-free so they can be mirrored 1:1 in
// Swift/Kotlin type definitions for watchOS, iOS, Android, TV, and Auto clients.

export type Platform =
  | "web" | "ios" | "android"
  | "watchos" | "wearos"
  | "tvos" | "androidtv"
  | "carplay" | "androidauto"
  | "other";

export type PrayerName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type CalculationMethod =
  | "MWL" | "ISNA" | "Egypt" | "Makkah" | "Karachi" | "Tehran" | "Jafari";

export interface PrayerTimes {
  date: string; // YYYY-MM-DD
  method: CalculationMethod;
  coordinates: { lat: number; lng: number };
  times_utc: Record<PrayerName | "sunrise", string>; // "HH:MM"
}

export interface QiblaResult {
  bearing_degrees: number;
  kaaba: { lat: number; lng: number };
}

export interface EntitlementSummary {
  plan: string;
  expires_at: string | null;
}

export interface BootstrapPayload {
  server_time: string;
  user_id: string | null;
  profile: { display_name?: string; avatar_url?: string; locale?: string } | null;
  entitlement: EntitlementSummary;
  preferences: Record<string, unknown>;
  feature_flags: Record<string, boolean>;
  capabilities: { platforms: Platform[] };
}

export interface DhikrSession {
  id?: string;
  dhikr_key: string;
  count: number;
  target?: number | null;
  source?: string;
  completed_at?: string | null;
  updated_at?: string;
}

export interface SalahEntry {
  id?: string;
  prayer_date: string;
  prayer: PrayerName;
  prayed_at?: string | null;
  on_time?: boolean | null;
  source?: string;
  updated_at?: string;
}

export interface ReadingProgress {
  id?: string;
  resource_type: string;
  resource_id: string;
  position: Record<string, unknown>;
  percent?: number | null;
  updated_at?: string;
}

export interface DeviceRegistration {
  platform: Platform;
  device_id: string;
  app_version?: string;
  os_version?: string;
  capabilities?: Record<string, unknown>;
}

export interface SyncPullResponse {
  server_time: string;
  since: string;
  dhikr_sessions: DhikrSession[];
  salah_log: SalahEntry[];
  reading_progress: ReadingProgress[];
  favorites: unknown[];
  preferences: { key: string; value: unknown }[];
  streaks: unknown[];
}

export interface SyncPushBody {
  dhikr_sessions?: DhikrSession[];
  salah_log?: SalahEntry[];
  reading_progress?: ReadingProgress[];
  preferences?: { key: string; value: unknown }[];
  device?: DeviceRegistration;
}
