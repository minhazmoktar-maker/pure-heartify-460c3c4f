import { Link } from "react-router-dom";
import { Users, Flame, ArrowRight, Home } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import HouseholdPanel from "@/components/plus/HouseholdPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTeamStreaks } from "@/hooks/useTeamStreaks";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Family hub — one place for household plan sharing and shared streaks.
 * Composes the existing HouseholdPanel with a compact team-streaks preview
 * that deep-links into the full /teams management page.
 */
export default function Family() {
  const { user } = useAuth();
  const { teams, loading } = useTeamStreaks();

  const preview = teams.slice(0, 3);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEO
        title="Family — Heartify"
        description="Share your Heartify+ plan with up to 5 family members and build a shared streak together."
        path="/family"
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8 space-y-6">
        <header>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-card bg-primary/10">
              <Home className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <div>
              <h1 className="font-heading text-title font-bold text-foreground">Family</h1>
              <p className="text-sm text-muted-foreground">
                One plan for your household. One streak you build together.
              </p>
            </div>
          </div>
        </header>

        {/* Family seats */}
        <section aria-labelledby="family-seats">
          <h2 id="family-seats" className="sr-only">Family seats</h2>
          <HouseholdPanel />
        </section>

        {/* Team streaks preview */}
        <section aria-labelledby="family-streak" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 id="family-streak" className="font-heading text-heading font-semibold text-foreground">
              Shared streak
            </h2>
            <Link
              to="/teams"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Manage <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {!user ? (
            <Card className="p-6 text-sm text-muted-foreground">
              Sign in to start a shared streak with your family.
            </Card>
          ) : loading ? (
            <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
          ) : preview.length === 0 ? (
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">Start a shared streak</div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Groups of 2–10 share one streak. It advances only when everyone
                    completes their daily dose.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Button asChild size="sm">
                  <Link to="/teams">Create or join a team</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <ul className="space-y-2">
              {preview.map((t) => {
                const allDone = t.completed_today_count === t.member_count;
                return (
                  <li key={t.id}>
                    <Link
                      to="/teams"
                      className="flex items-center gap-3 rounded-card border border-border bg-card p-4 transition-colors hover:border-primary/40"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-primary/10">
                        <Flame className="h-5 w-5 text-orange-500" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">{t.name}</div>
                        <div className="text-micro text-muted-foreground">
                          {t.current_streak}-day streak · {t.completed_today_count}/{t.member_count} today
                          {allDone ? " · advanced 🎉" : t.i_completed_today ? " · waiting on team" : " · your turn"}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
