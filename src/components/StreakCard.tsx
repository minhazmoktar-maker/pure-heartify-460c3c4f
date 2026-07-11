import { useEffect, useState } from "react";
import { Flame, Snowflake, Trophy, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useStreak } from "@/hooks/useStreak";
import { shareContent } from "@/lib/share";
import { supabase } from "@/integrations/supabase/client";

export function StreakCard() {
  const s = useStreak();
  const [handle, setHandle] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365];

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      const { data } = await supabase.from("profiles").select("handle").eq("id", user.id).maybeSingle();
      if (mounted && data?.handle) setHandle(data.handle);
    })();
    return () => { mounted = false; };
  }, []);

  // One-shot celebration when the current streak lands on a milestone day.
  // Persists a "seen" marker per (user × milestone) so returning users don't
  // re-trigger the pop on every mount.
  useEffect(() => {
    if (s.loading || s.current <= 0) return;
    if (!MILESTONES.includes(s.current)) return;
    const key = `streak:milestone-seen:${s.current}`;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
    setCelebrate(true);
    const t = window.setTimeout(() => setCelebrate(false), 900);
    return () => window.clearTimeout(t);
  }, [s.loading, s.current]);

  if (s.loading) {
    return (
      <Card className="p-5 space-y-4" aria-label="Loading streak" role="status">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-12 rounded-md" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </Card>
    );
  }

  const pct = s.nextMilestone ? Math.min(100, (s.current / s.nextMilestone) * 100) : 100;

  const share = () =>
    shareContent({
      kind: "streak_milestone",
      refId: String(s.current),
      title: "My Heartify streak",
      text: `I'm on a ${s.current}-day Heartify streak 🔥 — building consistent worship, in shaa Allah.`,
      url: handle ? `${window.location.origin}/s/${handle}/${s.current}` : undefined,
    });


  return (
    <Card className="p-5 space-y-4" aria-label="Current streak">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" aria-hidden />
            <h3 className="font-semibold text-foreground">Your streak</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {s.current > 0
              ? `${s.current} day${s.current === 1 ? "" : "s"} of consistent worship`
              : "Start today and build a habit"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-foreground tabular-nums">{s.current}</div>
          <div className="text-xs text-muted-foreground">longest: {s.longest}</div>
        </div>
      </div>

      {s.nextMilestone && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Next milestone</span>
            <span className="tabular-nums">
              {s.current}/{s.nextMilestone}
            </span>
          </div>
          <Progress value={pct} aria-label={`Progress to ${s.nextMilestone}-day milestone`} />
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1" title="Streak freezes protect one missed day">
            <Snowflake className="h-4 w-4 text-sky-400" aria-hidden />
            <span className="tabular-nums">{s.freezes}</span>
            <span className="sr-only">streak freezes</span>
          </span>
          <span className="inline-flex items-center gap-1" title="Earned milestones">
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
            <span className="tabular-nums">{s.milestones.length}</span>
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={share} className="gap-1.5">
          <Share2 className="h-4 w-4" aria-hidden /> Share
        </Button>
      </div>
    </Card>
  );
}

export default StreakCard;
