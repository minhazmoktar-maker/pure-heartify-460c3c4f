import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, MapPin } from "lucide-react";
import {
  computePrayerTimes,
  formatCountdown,
  formatTime,
  loadSettings,
  nextPrayer,
  saveSettings,
  type PrayerSettings,
  type PrayerSlot,
} from "@/lib/prayerTimes";

/**
 * Compact next-salah widget for the home page.
 * - Never a blank dead-end: if no location is saved, silently resolve an
 *   approximate one from IP (ipapi.co) so the countdown paints immediately.
 *   Precise GPS remains an explicit opt-in on /prayer.
 * - Updates the countdown every second without re-computing the whole prayer table.
 */
export default function NextSalahWidget() {
  const [settings, setSettings] = useState<PrayerSettings | null>(null);
  const [now, setNow] = useState(new Date());
  const [ipTried, setIpTried] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Auto-resolve approximate location from IP the first time we render
  // without one. Silent on failure — the CTA fallback still shows.
  useEffect(() => {
    if (!settings || settings.location || ipTried) return;
    setIpTried(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        const lat = Number(j?.latitude);
        const lon = Number(j?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        if (cancelled) return;
        const label =
          [j?.city, j?.country_code || j?.country_name].filter(Boolean).join(", ") ||
          "Approximate location";
        setSettings((prev) => {
          if (!prev || prev.location) return prev;
          const next: PrayerSettings = {
            ...prev,
            location: { latitude: lat, longitude: lon, label, approximate: true },
          };
          saveSettings(next);
          return next;
        });
      } catch {
        /* offline / blocked — CTA fallback still renders */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings, ipTried]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const slots: PrayerSlot[] = useMemo(() => {
    if (!settings?.location) return [];
    return computePrayerTimes(
      settings.location,
      now,
      settings.method,
      settings.madhab,
    );
  }, [settings, now]);

  const next = useMemo(() => nextPrayer(slots, now), [slots, now]);

  if (!settings) return null;

  // No location, and IP fallback hasn't landed yet or failed — soft prompt,
  // no error, no scary UI. Explains *why* precise is optional (Apple Weather posture).
  if (!settings.location) {
    return (
      <Link
        to="/prayer"
        className="mx-auto mt-3 flex max-w-[1800px] items-center gap-2 rounded-card border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm transition-colors hover:bg-primary/10 md:mx-6"
        aria-label="Set your location to see the next prayer time"
      >
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="whitespace-nowrap font-medium text-foreground">Set location</span>
        <span className="min-w-0 truncate text-muted-foreground">
          for accurate prayer times — never shared
        </span>
        <Compass className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    );
  }

  if (!next) return null;

  const countdown = formatCountdown(next.time.getTime() - now.getTime());
  const label = next.label;
  const approx = settings.location.approximate;

  return (
    <Link
      to="/prayer"
      className="mx-auto mt-3 flex max-w-[1800px] items-center gap-3 rounded-card border border-border bg-card px-4 py-2.5 text-sm shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40 md:mx-6"
      aria-label={`Next prayer: ${label} in ${countdown}${approx ? " (approximate location)" : ""}`}
    >
      <Compass className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span className="font-semibold text-foreground">Next: {label}</span>
      <span className="text-muted-foreground">
        {formatTime(next.time)} · in{" "}
        <span className="tabular-nums font-medium text-foreground">{countdown}</span>
      </span>
      {settings.location.label ? (
        <span className="ml-auto flex items-center gap-1 truncate text-micro text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden />
          {approx ? <span className="italic">Approx —</span> : null}
          {settings.location.label}
        </span>
      ) : null}
    </Link>
  );
}
