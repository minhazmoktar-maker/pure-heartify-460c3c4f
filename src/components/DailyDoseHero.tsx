import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Clock, CheckCircle2, Flame, PlayCircle } from "lucide-react";
import { useDailyDose } from "@/hooks/useDailyDose";
import { useUserInterests } from "@/hooks/useUserInterests";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const DailyDoseHero = () => {
  const { user } = useAuth();
  const { data, isLoading } = useDailyDose();
  const { data: interests, isLoading: interestsLoading } = useUserInterests();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-redirect signed-in users without interests to onboarding (one-time per session).
  useEffect(() => {
    if (!user || interestsLoading) return;
    if (location.pathname !== "/") return;
    const skipped = sessionStorage.getItem("onboarding-skipped");
    const hasAny = interests && (interests.primary_interest || interests.secondary_interest || interests.exploration_interest);
    if (!hasAny && !skipped) {
      sessionStorage.setItem("onboarding-skipped", "1");
      navigate("/onboarding");
    }
  }, [user, interests, interestsLoading, navigate, location.pathname]);

  if (!user) {
    return (
      <section className="mx-auto mt-6 max-w-[1800px] px-4 md:px-6">
        <div className="rounded-card border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
          <div className="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" />
            Daily Dose
          </div>
          <h2 className="mt-2 font-heading text-title font-bold text-foreground md:text-title">
            3 beneficial videos. ~18 minutes a day.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
            Heartify replaces endless scrolling with one intentional daily dose of beneficial,
            halal-friendly content — built around your interests.
          </p>
          <Link
            to="/signup"
            className="mt-4 inline-flex items-center gap-2 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start your journey
          </Link>
        </div>
      </section>
    );
  }

  if (isLoading || !data) {
    return (
      <section className="mx-auto mt-6 max-w-[1800px] px-4 md:px-6">
        <Skeleton className="h-48 w-full rounded-card" />
      </section>
    );
  }

  const { dose, videos, completedVideoIds, streak } = data;
  const total = videos.length || 3;
  const done = completedVideoIds.length;
  const pct = Math.round((done / total) * 100);
  const allDone = done >= total && total > 0;

  return (
    <section className="mx-auto mt-6 max-w-[1800px] px-4 md:px-6 motion-safe:animate-fade-in">
      <div className="overflow-hidden rounded-card border border-border bg-gradient-to-br from-primary/10 via-card to-card shadow-card transition-shadow duration-medium hover:shadow-card-hover motion-reduce:transition-none">

        <div className="flex flex-col gap-5 p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-4 w-4" />
                Today's Daily Dose
              </div>
              <h2 className="mt-1 font-heading text-title font-bold text-foreground md:text-title">
                {allDone ? "Alhamdulillah 🌿 You're done for today" : `${total} Videos · ${dose.total_minutes} Minutes`}
              </h2>
              <p className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  ~{dose.total_minutes} min
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {done}/{total} Completed
                </span>
                {streak.current_streak > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent/15 px-2 py-0.5 text-micro font-semibold text-accent-foreground">
                    <Flame className="h-3.5 w-3.5 text-accent" />
                    {streak.current_streak}-day streak
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-pill bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-medium ease-out will-change-[width] motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Video cards */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {videos.map((v, i) => {
              const completed = completedVideoIds.includes(v.video_id);
              return (
                <Link
                  key={v.video_id}
                  to={`/watch/${v.video_id}`}
                  style={{ animationDelay: `${i * 90}ms` }}
                  className={cn(
                    "group relative flex gap-3 rounded-card border border-border bg-background/60 p-2.5 transition-all duration-short ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover motion-safe:animate-fade-in motion-reduce:transform-none motion-reduce:transition-none",
                    completed && "opacity-70",
                  )}
                >
                  <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-card bg-muted">
                    <img
                      src={v.thumbnail_url}
                      alt={v.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                    {completed ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/70 motion-safe:animate-scale-in">
                        <CheckCircle2 className="h-7 w-7 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                        <PlayCircle className="h-7 w-7 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                      {v.title}
                    </p>
                    <p className="mt-1 truncate text-micro text-muted-foreground">{v.channel_title}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="rounded-pill bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        ✓ Reviewed
                      </span>
                      {v.halal_score && v.halal_score >= 85 && (
                        <span className="rounded-pill bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                          Up to 85% halal
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {allDone && (
            <div className="rounded-card border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
              You invested <strong>{dose.total_minutes} minutes</strong> in beneficial content today.
              Come back tomorrow — your streak is now <strong>{streak.current_streak} days</strong>. 🌿
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DailyDoseHero;
