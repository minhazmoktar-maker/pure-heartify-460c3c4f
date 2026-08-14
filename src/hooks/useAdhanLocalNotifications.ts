import { useEffect } from "react";
import type { PrayerSettings, PrayerSlot } from "@/lib/prayerTimes";

/**
 * On native (Capacitor), schedules OS-level local notifications for today's
 * enabled prayers so reminders fire even when the app is closed. On web this
 * is a no-op — the in-tab AdhanNotifier + browser Notification API cover that.
 */
export function useAdhanLocalNotifications(settings: PrayerSettings, slots: PrayerSlot[]) {
  useEffect(() => {
    if (!settings.adhanEnabled || slots.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { LocalNotifications } = await import("@capacitor/local-notifications");

        const perm = await LocalNotifications.checkPermissions();
        let granted = perm.display === "granted";
        if (!granted) {
          const req = await LocalNotifications.requestPermissions();
          granted = req.display === "granted";
        }
        if (!granted || cancelled) return;

        // Clear our previously scheduled prayer notifications, then reschedule.
        const pending = await LocalNotifications.getPending();
        const ours = pending.notifications.filter((n) =>
          typeof n.id === "number" && n.id >= 8100 && n.id <= 8199,
        );
        if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });

        const now = Date.now();
        const nameToId: Record<PrayerSlot["name"], number> = {
          fajr: 8101, sunrise: 8102, dhuhr: 8103, asr: 8104, maghrib: 8105, isha: 8106,
        };
        const today = new Date();
        const isSameLocalDay = (d: Date) =>
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate();

        const toSchedule = slots
          .filter((s) => settings.enabledPrayers[s.name])
          .map((s) => {
            const at = s.time.getTime() - settings.minutesBefore * 60_000;
            // Today and tomorrow share prayer names, so offset tomorrow's ids
            // by 10 to keep both scheduled (Fajr fires even after an overnight
            // app close). Still inside the reserved 8100-8199 band.
            const id = nameToId[s.name] + (isSameLocalDay(s.time) ? 0 : 10);
            return { slot: s, at, id };
          })
          .filter((x) => x.at > now + 5_000);

        if (!toSchedule.length) return;

        await LocalNotifications.schedule({
          notifications: toSchedule.map(({ slot, at, id }) => ({
            id,
            title: `${slot.label} — Adhan reminder`,
            body: settings.minutesBefore > 0
              ? `${slot.label} in ${settings.minutesBefore} minutes`
              : `It's time for ${slot.label}`,
            schedule: { at: new Date(at), allowWhileIdle: true },
            smallIcon: "ic_stat_icon",
          })),
        });
      } catch {
        /* Capacitor / plugin unavailable — safe no-op */
      }
    })();

    return () => { cancelled = true; };
  }, [settings, slots]);
}
