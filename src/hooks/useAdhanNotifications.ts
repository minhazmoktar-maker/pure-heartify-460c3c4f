import { useEffect, useRef } from "react";
import type { PrayerSettings, PrayerSlot } from "@/lib/prayerTimes";

const FIRED_KEY = "heartify.prayer.fired.v1";

interface FiredMap {
  date: string; // YYYY-MM-DD
  names: string[]; // prayer names fired today
}

function loadFired(): FiredMap {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return { date: "", names: [] };
    return JSON.parse(raw);
  } catch {
    return { date: "", names: [] };
  }
}

function saveFired(f: FiredMap) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(f));
  } catch {
    // ignore
  }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Fires a browser Notification when a scheduled prayer time arrives.
 * Only runs while the tab is open — a full background push requires a
 * service worker + FCM which is a separate feature.
 */
export function useAdhanNotifications(settings: PrayerSettings, slots: PrayerSlot[]) {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!settings.adhanEnabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const tick = () => {
      if (Notification.permission !== "granted") return;
      const now = Date.now();
      const fired = loadFired();
      const today = todayKey();
      if (fired.date !== today) {
        fired.date = today;
        fired.names = [];
      }

      for (const slot of slots) {
        if (!settings.enabledPrayers[slot.name]) continue;
        const targetTs = slot.time.getTime() - settings.minutesBefore * 60_000;
        if (targetTs <= now && now - targetTs < 90_000) {
          const key = `${slot.name}:${settings.minutesBefore}`;
          if (fired.names.includes(key)) continue;
          try {
            new Notification(`${slot.label} — Adhan reminder`, {
              body:
                settings.minutesBefore > 0
                  ? `${slot.label} in ${settings.minutesBefore} minutes`
                  : `It's time for ${slot.label}`,
              icon: "/icon-192.png",
              tag: `adhan-${slot.name}`,
            });
          } catch {
            // ignore
          }
          fired.names.push(key);
          saveFired(fired);
        }
      }
    };

    tick();
    intervalRef.current = window.setInterval(tick, 30_000) as unknown as number;
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [settings, slots]);
}
