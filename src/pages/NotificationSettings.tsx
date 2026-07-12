import { useEffect, useState } from "react";
import { Bell, Mail, Smartphone, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { toast } from "@/hooks/use-toast";
import { useWebPush } from "@/hooks/useWebPush";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface Pref {
  id?: string;
  kind: string;
  push_enabled: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

const KINDS: { key: string; title: string; description: string }[] = [
  { key: "daily_dose", title: "Daily Dose", description: "Your personalized daily reminder." },
  { key: "streak_risk", title: "Streak protection", description: "Alerts before your streak breaks." },
  { key: "prayer_time", title: "Prayer times", description: "Adhan and iqāmah reminders." },
  { key: "khatm", title: "Khatm group", description: "Group Qurʾān completion progress." },
  { key: "dua_ameen", title: "Duʿā ameens", description: "When someone says ameen to your duʿā." },
  { key: "social", title: "Social & mentions", description: "Follows, likes, mentions." },
  { key: "weekly_recap", title: "Weekly recap", description: "Your progress summary each Friday." },
];

export default function NotificationSettings() {
  const { user, loading: authLoading } = useAuth();
  const push = useWebPush();
  const [prefs, setPrefs] = useState<Record<string, Pref>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      // Ensure defaults exist for this user.
      await supabase.rpc("seed_default_notification_prefs", { _user_id: user.id }).then(() => {}, () => {});
      const { data } = await supabase
        .from("notification_preferences")
        .select("id, kind, push_enabled, email_enabled, in_app_enabled")
        .eq("user_id", user.id);
      const map: Record<string, Pref> = {};
      for (const kind of KINDS) {
        const row = data?.find((d) => d.kind === kind.key);
        map[kind.key] = row ?? {
          kind: kind.key,
          push_enabled: true,
          email_enabled: false,
          in_app_enabled: true,
        };
      }
      setPrefs(map);
      setLoading(false);
    })();
  }, [user]);

  const update = async (kind: string, field: "push_enabled" | "email_enabled" | "in_app_enabled", value: boolean) => {
    if (!user) return;
    const next = { ...prefs[kind], [field]: value };
    setPrefs((p) => ({ ...p, [kind]: next }));
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          kind,
          push_enabled: next.push_enabled,
          email_enabled: next.email_enabled,
          in_app_enabled: next.in_app_enabled,
        },
        { onConflict: "user_id,kind" },
      );
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    }
  };

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-10 text-center text-muted-foreground">
          Sign in to manage your notifications.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Notification Settings — Heartify"
        description="Choose which reminders you receive and where — push, email, or in-app."
        path="/settings/notifications"
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            Pick exactly what you want, exactly where you want it.
          </p>
        </header>

        {/* Browser push status */}
        <section className="mb-8 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {push.status === "granted" ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
              <div>
                <div className="font-semibold">Browser push</div>
                <div className="text-xs text-muted-foreground">
                  {push.status === "granted"
                    ? "Enabled on this device."
                    : push.status === "denied"
                    ? "Blocked — enable in browser settings."
                    : push.supported
                    ? "Not enabled on this device."
                    : "Not supported in this browser."}
                </div>
              </div>
            </div>
            {push.supported && push.status !== "granted" && push.status !== "denied" && (
              <Button size="sm" onClick={() => push.subscribe()}>Enable</Button>
            )}
            {push.status === "granted" && (
              <Button size="sm" variant="outline" onClick={() => push.unsubscribe()}>Disable</Button>
            )}
          </div>
        </section>

        {/* Matrix */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Notification</div>
            <div className="flex items-center gap-1 justify-self-center"><Smartphone className="h-3.5 w-3.5" />Push</div>
            <div className="flex items-center gap-1 justify-self-center"><Mail className="h-3.5 w-3.5" />Email</div>
            <div className="flex items-center gap-1 justify-self-center"><Bell className="h-3.5 w-3.5" />In-app</div>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : (
            KINDS.map((k) => {
              const p = prefs[k.key];
              return (
                <div
                  key={k.key}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
                >
                  <div>
                    <div className="font-medium text-foreground">{k.title}</div>
                    <div className="text-xs text-muted-foreground">{k.description}</div>
                  </div>
                  <Switch
                    checked={p?.push_enabled ?? true}
                    onCheckedChange={(v) => update(k.key, "push_enabled", v)}
                    aria-label={`Push for ${k.title}`}
                  />
                  <Switch
                    checked={p?.email_enabled ?? false}
                    onCheckedChange={(v) => update(k.key, "email_enabled", v)}
                    aria-label={`Email for ${k.title}`}
                  />
                  <Switch
                    checked={p?.in_app_enabled ?? true}
                    onCheckedChange={(v) => update(k.key, "in_app_enabled", v)}
                    aria-label={`In-app for ${k.title}`}
                  />
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
