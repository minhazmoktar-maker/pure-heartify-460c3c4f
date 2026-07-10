import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SETTINGS,
  computePrayerTimes,
  loadSettings,
  type PrayerSettings,
} from "@/lib/prayerTimes";
import { useAdhanNotifications } from "@/hooks/useAdhanNotifications";
import { useAdhanLocalNotifications } from "@/hooks/useAdhanLocalNotifications";

/**
 * Mount once at app root so Fajr/Maghrib reminders fire whenever the tab is
 * open, not only on /prayer. Settings persist in localStorage.
 */
export default function AdhanNotifier() {
  const [settings, setSettings] = useState<PrayerSettings>(DEFAULT_SETTINGS);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setSettings(loadSettings());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "heartify.prayer.settings.v1") setSettings(loadSettings());
    };
    window.addEventListener("storage", onStorage);
    const iv = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(iv);
    };
  }, []);

  const slots = useMemo(() => {
    if (!settings.location) return [];
    return computePrayerTimes(settings.location, now, settings.method, settings.madhab);
  }, [settings.location, settings.method, settings.madhab, now]);

  useAdhanNotifications(settings, slots);
  useAdhanLocalNotifications(settings, slots);
  return null;
}
