import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, MapPin } from "lucide-react";
import {
  computePrayerTimes,
  formatCountdown,
  formatTime,
  loadSettings,
  nextPrayer,
  type PrayerSettings,
  type PrayerSlot,
} from "@/lib/prayerTimes";

/**
 * Compact next-salah widget for the home page.
 * - Zero friction: reads location from stored settings; if missing, shows a soft CTA.
 * - Updates the countdown every second without re-computing the whole prayer table.
 */
export default function NextSalahWidget() {
  const [settings, setSettings] = useState<PrayerSettings | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

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

  // No location yet — soft prompt, no error, no scary UI.
  if (!settings.location) {
    return (
      <Link
        to="/prayer"
        className="mx-auto mt-3 flex max-w-[1800px] items-center gap-3 rounded-card border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm transition-colors hover:bg-primary/10 md:mx-6"
        aria-label="Set your location to see the next prayer time"
      >
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="font-medium text-foreground">Set location</span>
        <span className="truncate text-muted-foreground">
          to see the next salah countdown
        </span>
        <Compass className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
      </Link>
    );
  }

  if (!next) return null;

  const countdown = formatCountdown(next.time.getTime() - now.getTime());
  const label = next.label;

  return (
    <Link
      to="/prayer"
      className="mx-auto mt-3 flex max-w-[1800px] items-center gap-3 rounded-card border border-border bg-card px-4 py-2.5 text-sm shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40 md:mx-6"
      aria-label={`Next prayer: ${label} in ${countdown}`}
    >
      <Compass className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span className="font-semibold text-foreground">Next: {label}</span>
      <span className="text-muted-foreground">
        {formatTime(next.time)} · in <span className="tabular-nums font-medium text-foreground">{countdown}</span>
      </span>
      {settings.location.label ? (
        <span className="ml-auto flex items-center gap-1 truncate text-micro text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden />
          {settings.location.label}
        </span>
      ) : null}
    </Link>
  );
}
