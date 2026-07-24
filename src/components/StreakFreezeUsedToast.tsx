import { useEffect } from "react";
import { toast } from "sonner";
import { Snowflake } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Listens for `heartify:streak-freeze-used` events dispatched by
 * useStreak.recordActivity when the DB auto-consumes a streak freeze
 * after a single missed day. Surfaces a warm, non-punitive confirmation
 * so the user understands their streak was protected — a core retention
 * lever (Duolingo pattern).
 */
export function StreakFreezeUsedToast() {
  useEffect(() => {
    const handler = (e: Event) => {
      const current = (e as CustomEvent<{ current: number }>).detail?.current ?? 0;
      void track("streak_freeze_used", { current });
      toast(
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10">
            <Snowflake className="h-4 w-4 text-sky-500" aria-hidden />
          </div>
          <div>
            <div className="font-semibold text-foreground">Your streak was saved ❄️</div>
            <div className="text-sm text-muted-foreground">
              A freeze protected your {current}-day streak. Keep going.
            </div>
          </div>
        </div>,
        { duration: 6000 },
      );
    };
    window.addEventListener("heartify:streak-freeze-used", handler);
    return () => window.removeEventListener("heartify:streak-freeze-used", handler);
  }, []);
  return null;
}

export default StreakFreezeUsedToast;
