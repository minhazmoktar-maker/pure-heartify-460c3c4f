import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Heart, Sparkles, BookOpen, Flame, Share2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeeklyRecap } from "@/hooks/useWeeklyRecap";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { shareContent } from "@/lib/share";
import { useAuth } from "@/contexts/AuthContext";
import { useMyHandle } from "@/hooks/useMyHandle";

export function WeeklyRecapCard() {
  const enabled = useFeatureFlag("viral.weekly_recap", true);
  const { recap, loading } = useWeeklyRecap();
  const { user } = useAuth();
  const { handle } = useMyHandle();

  if (!enabled) return null;



  if (loading) {
    return (
      <Card className="p-5 space-y-4" aria-label="Loading weekly recap" role="status">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-card border border-border/40 p-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-10" />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-full rounded-card" />
      </Card>
    );
  }
  if (!recap) return null;

  const empty =
    recap.minutes_watched === 0 &&
    recap.favorites_added === 0 &&
    recap.dhikr_count === 0 &&
    recap.juz_completed === 0;

  const onShare = () =>
    shareContent({
      kind: "weekly_recap",
      title: "My Heartify week",
      text: `This week on Heartify: ${recap.minutes_watched} min watched · ${recap.dhikr_count} dhikr · ${recap.juz_completed} juz · ${recap.streak_length}-day streak 🌙`,
      url: handle ? `${window.location.origin}/w/${handle}/${recap.week_start}` : undefined,
    });

  return (
    <Card className="p-5 space-y-4" aria-label="Weekly recap">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
            <h3 className="font-semibold text-foreground">This week</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {empty ? "Start something small today — every deed counts." : "Barakallahu feek — your week at a glance."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onShare} className="gap-1.5" disabled={empty}>
          <Share2 className="h-4 w-4" aria-hidden /> Share
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Clock} label="Minutes" value={recap.minutes_watched} />
        <Stat icon={Heart} label="Favorites" value={recap.favorites_added} />
        <Stat icon={Sparkles} label="Dhikr" value={recap.dhikr_count} />
        <Stat icon={BookOpen} label="Juz" value={recap.juz_completed} />
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Flame className="h-4 w-4 text-orange-500" aria-hidden />
        <span>
          Current streak: <span className="font-semibold text-foreground tabular-nums">{recap.streak_length}</span>
        </span>
      </div>
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-card border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-1.5 text-micro text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
      </div>
      <div className="mt-0.5 text-heading font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

export default WeeklyRecapCard;
