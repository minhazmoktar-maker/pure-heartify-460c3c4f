import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Loader2, MapPin, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import QiblaCompass from "@/components/QiblaCompass";
import { useAdhanNotifications } from "@/hooks/useAdhanNotifications";
import {
  DEFAULT_SETTINGS,
  METHOD_LABELS,
  computePrayerTimes,
  formatCountdown,
  formatTime,
  loadSettings,
  nextPrayer,
  qiblaBearing,
  saveSettings,
  type MadhabKey,
  type MethodKey,
  type PrayerSettings,
  type PrayerSlot,
} from "@/lib/prayerTimes";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PRAYER_NAMES: PrayerSlot["name"][] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

export default function Prayer() {
  const [settings, setSettings] = useState<PrayerSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const stored = loadSettings();
    setSettings(stored);

    // Never a blank screen: if the user has no saved location, silently
    // resolve an approximate one from their IP so times render immediately.
    // GPS remains an explicit opt-in via "Use precise location".
    if (!stored.location) {
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
          const label = [j?.city, j?.country_name].filter(Boolean).join(", ") || "Approximate location";
          setSettings((prev) => {
            if (prev.location) return prev;
            const next: PrayerSettings = {
              ...prev,
              location: { latitude: lat, longitude: lon, label, approximate: true },
            };
            saveSettings(next);
            return next;
          });
        } catch { /* offline — the empty-state CTA still shows */ }
      })();
      return () => { cancelled = true; };
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const update = (patch: Partial<PrayerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const detectLocation = () => {
    if (!("geolocation" in navigator)) {
      toast({ title: "Geolocation unavailable", variant: "destructive" });
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update({
          location: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            label: "Current location",
            approximate: false,
          },
        });
        setLoading(false);
        toast({ title: "Location set", description: "Prayer times updated for your area." });
      },
      (err) => {
        setLoading(false);
        toast({ title: "Couldn't get location", description: err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const enableAdhan = async () => {
    if (!("Notification" in window)) {
      toast({ title: "Notifications not supported", variant: "destructive" });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast({ title: "Permission denied", description: "Enable notifications in your browser settings.", variant: "destructive" });
      return;
    }
    update({ adhanEnabled: true });
    toast({ title: "Adhan reminders on", description: "You'll get notified while this app is open." });
  };

  const slots = useMemo(() => {
    if (!settings.location) return [];
    return computePrayerTimes(settings.location, now, settings.method, settings.madhab);
  }, [settings.location, settings.method, settings.madhab, now]);

  const next = useMemo(() => nextPrayer(slots, now), [slots, now]);
  const qibla = useMemo(() => (settings.location ? qiblaBearing(settings.location) : null), [settings.location]);

  useAdhanNotifications(settings, slots);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEO
        title="Prayer Times & Qibla — Heartify"
        description="Accurate prayer times, Qibla direction, and Adhan reminders for Muslims worldwide."
        path="/prayer"
      />
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <header className="mb-6">
          <h1 className="text-title font-bold text-foreground">Prayer</h1>
          <p className="text-sm text-muted-foreground">Prayer times, Qibla direction, and Adhan reminders.</p>
        </header>

        {!settings.location ? (
          <div className="rounded-card border border-border bg-card p-8 text-center">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="mb-1 text-heading font-semibold">Set your location</h2>
            <p className="mb-4 text-sm text-muted-foreground">We need your location to calculate accurate prayer times and the Qibla direction. It stays on your device.</p>
            <button
              onClick={detectLocation}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Use my location
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Next prayer + list */}
            <section className="rounded-card border border-border bg-card p-6">
              {next && (
                <div className="mb-4 rounded-card bg-primary/10 p-4">
                  <div className="text-micro uppercase tracking-wide text-muted-foreground">Next prayer</div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <div className="text-title font-bold text-foreground">{next.label}</div>
                    <div className="text-heading font-medium text-primary">{formatTime(next.time)}</div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">in {formatCountdown(next.time.getTime() - now.getTime())}</div>
                </div>
              )}
              <ul className="divide-y divide-border">
                {slots.map((slot) => {
                  const isNext = next?.name === slot.name;
                  return (
                    <li key={slot.name} className={cn("flex items-center justify-between py-3", isNext && "font-semibold text-primary")}>
                      <span>{slot.label}</span>
                      <span className="tabular-nums">{formatTime(slot.time)}</span>
                    </li>
                  );
                })}
              </ul>
              {settings.location.approximate && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-card border border-primary/30 bg-primary/5 px-3 py-2 text-micro">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground">Approximate location from your network</span>
                  <button
                    onClick={detectLocation}
                    disabled={loading}
                    className="ml-auto inline-flex items-center gap-1 rounded-pill bg-primary px-2.5 py-1 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                    Use precise location
                  </button>
                </div>
              )}
              {!settings.location.approximate && (
                <button
                  onClick={detectLocation}
                  className="mt-4 inline-flex items-center gap-2 text-micro text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" /> Update location
                </button>
              )}
              {settings.location.label && (
                <p className="mt-1 text-micro text-muted-foreground">
                  {settings.location.label} • {settings.location.latitude.toFixed(3)}, {settings.location.longitude.toFixed(3)}
                </p>
              )}
            </section>

            {/* Qibla */}
            <section className="rounded-card border border-border bg-card p-6">
              <h2 className="mb-4 text-heading font-semibold">Qibla</h2>
              {qibla != null && <QiblaCompass bearing={qibla} />}
            </section>

            {/* Settings */}
            <section className="rounded-card border border-border bg-card p-6 lg:col-span-2">
              <h2 className="mb-4 text-heading font-semibold">Settings</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Calculation method</span>
                  <select
                    value={settings.method}
                    onChange={(e) => update({ method: e.target.value as MethodKey })}
                    className="w-full rounded-card border border-border bg-background px-3 py-2"
                  >
                    {(Object.keys(METHOD_LABELS) as MethodKey[]).map((k) => (
                      <option key={k} value={k}>{METHOD_LABELS[k]}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Madhab (Asr)</span>
                  <select
                    value={settings.madhab}
                    onChange={(e) => update({ madhab: e.target.value as MadhabKey })}
                    className="w-full rounded-card border border-border bg-background px-3 py-2"
                  >
                    <option value="shafi">Shafi'i / Maliki / Hanbali (standard)</option>
                    <option value="hanafi">Hanafi (later)</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Notify me</span>
                  <select
                    value={settings.minutesBefore}
                    onChange={(e) => update({ minutesBefore: Number(e.target.value) })}
                    className="w-full rounded-card border border-border bg-background px-3 py-2"
                  >
                    <option value={0}>At prayer time</option>
                    <option value={5}>5 minutes before</option>
                    <option value={10}>10 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                  </select>
                </label>
                <div className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Adhan reminders</span>
                  {settings.adhanEnabled ? (
                    <button
                      onClick={() => update({ adhanEnabled: false })}
                      className="inline-flex items-center gap-2 rounded-card border border-border px-3 py-2 hover:bg-secondary"
                    >
                      <BellOff className="h-4 w-4" /> Turn off
                    </button>
                  ) : (
                    <button
                      onClick={enableAdhan}
                      className="inline-flex items-center gap-2 rounded-card bg-primary px-3 py-2 text-primary-foreground hover:opacity-90"
                    >
                      <Bell className="h-4 w-4" /> Enable
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-sm text-muted-foreground">Remind me for:</div>
                <div className="flex flex-wrap gap-2">
                  {PRAYER_NAMES.map((name) => {
                    const active = settings.enabledPrayers[name];
                    return (
                      <button
                        key={name}
                        onClick={() =>
                          update({
                            enabledPrayers: { ...settings.enabledPrayers, [name]: !active },
                          })
                        }
                        className={cn(
                          "rounded-pill border px-3 py-1 text-micro font-medium capitalize transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-micro text-muted-foreground">
                  Reminders fire while Heartify is open in your browser. Background push notifications are coming next.
                </p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
