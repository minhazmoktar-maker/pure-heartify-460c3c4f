import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * StreakChip — persistent identity signal in the app header.
 *
 * A tiny always-visible chip that reinforces the daily-video habit.
 * Signed-out users don't see it; signed-in users see their current
 * streak, always one tap from the streak surface on their profile.
 */
export default function StreakChip({ className }: { className?: string }) {
  const { user } = useAuth();
  const { current } = useStreak();
  if (!user) return null;

  const active = current > 0;

  return (
    <Link
      to="/profile?tab=streak"
      aria-label={`Streak: ${current} day${current === 1 ? "" : "s"}`}
      title={`Streak: ${current} day${current === 1 ? "" : "s"}`}
      className={cn(
        "inline-flex min-h-11 items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold transition-colors",
        active
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "bg-secondary text-muted-foreground hover:bg-muted",
        className,
      )}
    >
      <Flame className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
      <span>{current}</span>
    </Link>
  );
}
