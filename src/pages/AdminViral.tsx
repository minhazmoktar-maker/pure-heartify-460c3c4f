import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flag, Gift, BookOpen, ToggleLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFeatureFlags } from "@/hooks/useFeatureFlag";
import { toast } from "sonner";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";

interface Flag {
  key: string;
  enabled: boolean;
  rollout_percent: number;
  description: string | null;
}

interface Stats {
  referrals_total: number;
  referrals_redeemed: number;
  suspicious_click_codes: number;
  active_khatm_groups: number;
  completed_khatm_groups: number;
  streaks_active: number;
}

export default function AdminViral() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: f }, { count: refTotal }, { count: refRedeemed }, { count: kgActive }, { count: kgDone }, { count: streaks }] =
      await Promise.all([
        supabase
          .from("feature_flags")
          .select("key,enabled,rollout_percent,description")
          .order("key"),
        supabase.from("referrals").select("*", { count: "exact", head: true }),
        supabase.from("referrals").select("*", { count: "exact", head: true }).eq("status", "redeemed"),
        supabase.from("khatm_groups").select("*", { count: "exact", head: true }).is("completed_at", null),
        supabase.from("khatm_groups").select("*", { count: "exact", head: true }).not("completed_at", "is", null),
        supabase.from("streaks").select("*", { count: "exact", head: true }).gte("current_streak", 1),
      ]);
    // fraud: codes with >20 clicks in 1h
    const { data: clicks } = await supabase
      .from("referral_clicks")
      .select("code,created_at")
      .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    const counts = new Map<string, number>();
    (clicks ?? []).forEach((c) => counts.set(c.code, (counts.get(c.code) ?? 0) + 1));
    const suspicious = Array.from(counts.values()).filter((n) => n > 20).length;

    setFlags((f ?? []) as Flag[]);
    setStats({
      referrals_total: refTotal ?? 0,
      referrals_redeemed: refRedeemed ?? 0,
      suspicious_click_codes: suspicious,
      active_khatm_groups: kgActive ?? 0,
      completed_khatm_groups: kgDone ?? 0,
      streaks_active: streaks ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const setFlag = async (key: string, patch: Partial<Flag>) => {
    const { error } = await supabase.from("feature_flags").update(patch).eq("key", key);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidateFeatureFlags();
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
    toast.success("Saved");
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Admin — Viral Mechanisms" description="Feature flags, referral fraud, khatm stats" path="/admin/viral" />
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-5">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Viral mechanisms</h1>
          <p className="text-sm text-muted-foreground">
            Feature flags, referral & streak stats, fraud watch.
          </p>
        </header>

        {loading || !stats ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat icon={<Gift className="h-4 w-4" />} label="Referrals redeemed" value={`${stats.referrals_redeemed}/${stats.referrals_total}`} />
              <Stat icon={<Flag className="h-4 w-4 text-amber-500" />} label="Suspicious codes (1h)" value={stats.suspicious_click_codes} />
              <Stat icon={<BookOpen className="h-4 w-4" />} label="Khatm groups" value={`${stats.active_khatm_groups} active · ${stats.completed_khatm_groups} done`} />
              <Stat label="Active streaks (≥1)" value={stats.streaks_active} />
            </div>

            <Card className="p-5 space-y-4">
              <h2 className="font-semibold text-foreground">Feature flags</h2>
              {flags.map((f) => (
                <div key={f.key} className="flex flex-wrap items-center gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">{f.key}</div>
                    <div className="text-xs text-muted-foreground">{f.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`ro-${f.key}`} className="text-xs">Rollout %</Label>
                    <Input
                      id={`ro-${f.key}`}
                      type="number"
                      min={0}
                      max={100}
                      className="h-8 w-20"
                      defaultValue={f.rollout_percent}
                      onBlur={(e) => {
                        const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        if (v !== f.rollout_percent) void setFlag(f.key, { rollout_percent: v });
                      }}
                    />
                  </div>
                  <Switch
                    checked={f.enabled}
                    onCheckedChange={(v) => setFlag(f.key, { enabled: v })}
                    aria-label={`Toggle ${f.key}`}
                  />
                </div>
              ))}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </Card>
  );
}
