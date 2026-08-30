import { Link } from "react-router-dom";
import { Flame, Clock, BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useWeeklyDigest } from "@/hooks/useBenefitDigest";

/**
 * "What you learned this week" — makes benefit visible so the habit loop closes
 * on learning, not watch time.
 */
export default function WeeklyDigestCard({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { data, isLoading } = useWeeklyDigest(Boolean(user));

  if (!user) return null;

  if (isLoading || !data) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }

  const delta = data.minutes_watched - data.prev_minutes_watched;
  const nothingYet =
    data.minutes_watched === 0 && data.doses_completed === 0 && data.concepts_learned.length === 0;

  return (
    <section
      aria-label="Your week of benefit"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Your week of benefit</h2>
        {!compact ? (
          <span className="text-micro text-muted-foreground">last 7 days</span>
        ) : null}
      </div>

      {nothingYet ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing logged yet this week.{" "}
          <Link to="/dose" className="underline">
            Start today&apos;s dose
          </Link>{" "}
          to begin your streak.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/60 p-3">
              <dt className="flex items-center gap-1 text-micro text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden /> Minutes
              </dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                {data.minutes_watched}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <dt className="flex items-center gap-1 text-micro text-muted-foreground">
                <Flame className="h-3.5 w-3.5" aria-hidden /> Streak
              </dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                {data.current_streak}d
              </dd>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <dt className="flex items-center gap-1 text-micro text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" aria-hidden /> Doses
              </dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                {data.doses_completed}
              </dd>
            </div>
          </dl>

          {data.prev_minutes_watched > 0 ? (
            <p className="mt-3 inline-flex items-center gap-1 text-micro text-muted-foreground">
              {delta >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" aria-hidden />
              )}
              {delta >= 0 ? "+" : ""}
              {delta} minutes vs last week
            </p>
          ) : null}

          {data.concepts_learned.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-micro font-medium uppercase tracking-wide text-muted-foreground">
                Concepts you learned
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {data.concepts_learned.map((c) => (
                  <li
                    key={c.title}
                    className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                  >
                    {c.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      {compact ? (
        <Link
          to="/digest"
          className="mt-4 inline-flex min-h-[44px] items-center text-sm font-medium text-primary"
        >
          See the full recap
        </Link>
      ) : null}
    </section>
  );
}
