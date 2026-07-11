import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Flame, Snowflake, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStreak } from "@/hooks/useStreak";

/**
 * Retention: shown late in the day when a user has an active streak (>=1)
 * but hasn't recorded any activity today. Nudges them to complete the daily
 * dose so the streak survives; surfaces available freezes as a safety net.
 */
export function StreakAtRiskBanner() {
  const s = useStreak();

  const atRisk = useMemo(() => {
    if (s.loading || s.current < 1) return false;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const isoToday = `${y}-${m}-${d}`;
    const missedToday = s.lastCompletedDate !== isoToday;
    // Only nudge after 5pm local so we don't annoy morning users.
    return missedToday && today.getHours() >= 17;
  }, [s.loading, s.current, s.lastCompletedDate]);

  if (!atRisk) return null;

  return (
    <Card
      role="status"
      aria-label="Streak at risk"
      className="border-orange-500/40 bg-gradient-to-r from-orange-500/10 to-amber-500/5 p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Flame className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            Keep your {s.current}-day streak alive
          </p>
          <p className="text-sm text-muted-foreground">
            Complete today's daily dose before midnight.
            {s.freezes > 0 && (
              <>
                {" "}
                <span className="inline-flex items-center gap-1 text-sky-400">
                  <Snowflake className="h-3.5 w-3.5" aria-hidden />
                  {s.freezes} freeze{s.freezes === 1 ? "" : "s"} ready
                </span>{" "}
                as backup.
              </>
            )}
          </p>
        </div>
        <Button asChild size="sm" className="gap-1">
          <Link to="/">Continue <ChevronRight className="h-4 w-4" aria-hidden /></Link>
        </Button>
      </div>
    </Card>
  );
}

export default StreakAtRiskBanner;
