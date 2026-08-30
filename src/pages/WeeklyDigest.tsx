import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import WeeklyDigestCard from "@/components/digest/WeeklyDigestCard";
import { useAuth } from "@/contexts/AuthContext";

export default function WeeklyDigest() {
  const { user } = useAuth();

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Your weekly recap — Heartify"
        description="See what you learned this week: minutes of beneficial knowledge, your streak, and the concepts you completed."
        path="/digest"
      />
      <Navbar />
      <main className="mx-auto max-w-[720px] px-4 pb-28 pt-6 md:px-6 md:pt-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          What you learned
        </h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          A calm weekly recap of benefit — not screen time.
        </p>

        <div className="mt-6">
          {user ? (
            <WeeklyDigestCard />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="underline">
                  Sign in
                </Link>{" "}
                to see your weekly recap.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/certificates"
            className="inline-flex min-h-[44px] items-center rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground"
          >
            My certificates
          </Link>
          <Link
            to="/learn"
            className="inline-flex min-h-[44px] items-center rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground"
          >
            Continue a learning path
          </Link>
        </div>
      </main>
    </div>
  );
}
