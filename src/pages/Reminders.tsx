import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell, BellOff, Compass, BookOpen, CircleDot, ListChecks, Sunrise } from "lucide-react";

type ReminderKey = "prayer" | "quran" | "dhikr" | "adhkar_morning" | "adhkar_evening" | "salah_review";

type Reminder = {
  key: ReminderKey;
  label: string;
  description: string;
  defaultTime: string;
  icon: typeof Bell;
};

const REMINDERS: Reminder[] = [
  { key: "prayer", label: "Prayer window opens", description: "Nudge before each salah window begins.", defaultTime: "05:00", icon: Compass },
  { key: "quran", label: "Daily Quran", description: "One page or one ayah — every day.", defaultTime: "07:30", icon: BookOpen },
  { key: "dhikr", label: "Dhikr session", description: "Short tasbih break in your day.", defaultTime: "12:30", icon: CircleDot },
  { key: "adhkar_morning", label: "Morning adhkar", description: "Adhkar al-sabah after Fajr.", defaultTime: "06:15", icon: Sunrise },
  { key: "adhkar_evening", label: "Evening adhkar", description: "Adhkar al-masaa after Asr.", defaultTime: "17:30", icon: Sunrise },
  { key: "salah_review", label: "Salah check-in", description: "End-of-day review of your five prayers.", defaultTime: "22:00", icon: ListChecks },
];

const STORAGE_KEY = "heartify.reminders.v1";

type Prefs = Record<ReminderKey, { enabled: boolean; time: string }>;

const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const defaults = {} as Prefs;
  REMINDERS.forEach((r) => (defaults[r.key] = { enabled: false, time: r.defaultTime }));
  return defaults;
};

const Reminders = () => {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  // Simple in-tab scheduler: checks every minute if a reminder should fire.
  useEffect(() => {
    const fired = new Set<string>();
    const tick = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const dayKey = now.toDateString();
      Object.entries(prefs).forEach(([key, val]) => {
        if (!val.enabled) return;
        if (val.time !== hhmm) return;
        const marker = `${dayKey}:${key}`;
        if (fired.has(marker)) return;
        fired.add(marker);
        const r = REMINDERS.find((x) => x.key === key);
        if (!r) return;
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Heartify reminder", { body: r.label, icon: "/favicon.ico" });
        } else {
          toast(r.label, { description: r.description });
        }
      });
    };
    const id = setInterval(tick, 30_000);
    tick();
    return () => clearInterval(id);
  }, [prefs]);

  const requestPerm = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Notifications not supported on this device");
      return;
    }
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") toast.success("Notifications enabled");
    else toast.error("Notifications blocked — you'll still see in-app toasts");
  };

  const toggle = (key: ReminderKey, enabled: boolean) =>
    setPrefs((p) => ({ ...p, [key]: { ...p[key], enabled } }));
  const setTime = (key: ReminderKey, time: string) =>
    setPrefs((p) => ({ ...p, [key]: { ...p[key], time } }));

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Habit reminders — Heartify"
        description="Configure daily reminders for prayer, Quran, dhikr, and adhkar so consistency becomes effortless."
        path="/reminders"
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Habit reminders</h1>
          <p className="mt-2 text-muted-foreground">
            Gentle daily nudges for the habits that matter. Reminders run while Heartify is open in a tab.
          </p>
        </header>

        <Card className="mb-6 flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {perm === "granted" ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
            <div>
              <p className="font-medium">Browser notifications</p>
              <p className="text-sm text-muted-foreground">
                Status: <span className="font-medium">{perm}</span>
              </p>
            </div>
          </div>
          {perm !== "granted" && (
            <Button onClick={requestPerm} size="sm">Enable</Button>
          )}
        </Card>

        <div className="grid gap-3">
          {REMINDERS.map((r) => {
            const Icon = r.icon;
            const val = prefs[r.key];
            return (
              <Card key={r.key} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-secondary p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor={`sw-${r.key}`} className="text-base font-medium">{r.label}</Label>
                      <p className="text-sm text-muted-foreground">{r.description}</p>
                    </div>
                  </div>
                  <Switch
                    id={`sw-${r.key}`}
                    checked={val.enabled}
                    onCheckedChange={(v) => toggle(r.key, v)}
                  />
                </div>
                {val.enabled && (
                  <div className="mt-3 flex items-center gap-2 pl-12">
                    <Label htmlFor={`t-${r.key}`} className="text-sm text-muted-foreground">Time</Label>
                    <Input
                      id={`t-${r.key}`}
                      type="time"
                      value={val.time}
                      onChange={(e) => setTime(r.key, e.target.value)}
                      className="w-32"
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Reminders are stored locally on this device. For background delivery when Heartify is closed, install the app to your home screen.
        </p>
      </main>
    </div>
  );
};

export default Reminders;
