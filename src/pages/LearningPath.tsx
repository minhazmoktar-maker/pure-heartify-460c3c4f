import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronRight, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  useLearningPath,
  useSetStepProgress,
  type LearningPathStep,
} from "@/hooks/useLearningPaths";

const BASE = "https://pure-heartify.lovable.app";

/**
 * MVP-6 — a guided learning path: ordered concepts with real prerequisites,
 * reviewed lessons per step, and per-user completion.
 */
export default function LearningPath() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useLearningPath(slug);
  const { user } = useAuth();
  const setProgress = useSetStepProgress(slug);

  const steps = data?.steps ?? [];
  const completed = steps.filter((s) => s.completed).length;
  const nextIndex = useMemo(() => steps.findIndex((s) => !s.completed), [steps]);

  const jsonLd = data
    ? {
        "@context": "https://schema.org",
        "@type": "Course",
        name: data.title,
        description: data.description ?? data.subtitle ?? undefined,
        url: `${BASE}/learn/path/${data.slug}`,
        provider: { "@type": "Organization", name: "Heartify", url: BASE },
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "online",
          courseWorkload: `PT${Math.max(1, steps.length)}H`,
        },
      }
    : null;

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="mx-auto max-w-[820px] px-4 py-8 md:px-6">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-lg" />
          <div className="mt-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="mx-auto max-w-[720px] px-4 py-16 text-center md:px-6">
          <h1 className="text-2xl font-semibold text-foreground">Path not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This learning path may have been renamed or unpublished.
          </p>
          <Link
            to="/learn"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Browse the knowledge map
          </Link>
        </main>
      </div>
    );
  }

  const pct = steps.length ? Math.round((completed / steps.length) * 100) : 0;

  function toggle(step: LearningPathStep) {
    if (!user) {
      toast("Sign in to track your progress");
      return;
    }
    setProgress.mutate(
      { conceptSlug: step.concept_slug, completed: !step.completed },
      {
        onError: () => toast.error("Could not save your progress"),
      },
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${data.title} — a Heartify learning path`}
        description={
          data.description ??
          `${steps.length} concepts in prerequisite order, each with reviewed lessons.`
        }
        path={`/learn/path/${data.slug}`}
        type="article"
        jsonLd={jsonLd ?? undefined}
      />
      <Navbar />
      <main className="mx-auto max-w-[820px] px-4 pb-28 pt-6 md:px-6 md:pt-10">
        <nav aria-label="Breadcrumb" className="text-micro text-muted-foreground">
          <Link to="/learn" className="hover:text-foreground">
            Learn
          </Link>
          <span className="px-1.5">/</span>
          <span>{data.domain}</span>
        </nav>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {data.title}
        </h1>
        {data.subtitle ? (
          <p className="mt-1 text-sm font-medium text-primary">{data.subtitle}</p>
        ) : null}
        {data.description ? (
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            {data.description}
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {completed} of {steps.length} steps complete
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Path progress"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {!user ? (
            <p className="mt-3 text-xs text-muted-foreground">
              <Link to="/auth" className="underline">
                Sign in
              </Link>{" "}
              to save your place in this path.
            </p>
          ) : null}
        </div>

        <ol className="mt-8 space-y-3">
          {steps.map((step, i) => {
            const isNext = i === nextIndex;
            const locked = i > 0 && !steps[i - 1].completed && !step.completed;
            return (
              <li key={step.concept_slug}>
                <div
                  className={`rounded-2xl border bg-card p-4 transition-colors ${
                    isNext ? "border-primary/50" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggle(step)}
                      aria-pressed={step.completed}
                      aria-label={
                        step.completed
                          ? `Mark ${step.title} as not complete`
                          : `Mark ${step.title} as complete`
                      }
                      className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        step.completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {step.completed ? (
                        <Check className="h-5 w-5" aria-hidden />
                      ) : (
                        <span className="text-sm font-semibold">{step.step_order}</span>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h2 className="text-base font-semibold text-foreground">
                          {step.title}
                        </h2>
                        {step.arabic_term ? (
                          <span dir="rtl" className="text-sm text-muted-foreground">
                            {step.arabic_term}
                          </span>
                        ) : null}
                        {isNext ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-micro font-medium text-primary">
                            Next up
                          </span>
                        ) : null}
                      </div>
                      {step.summary ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {step.summary}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Link
                          to={`/learn/${step.concept_slug}`}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground"
                        >
                          {step.completed ? "Review lessons" : "Start this step"}
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                        <span className="inline-flex items-center gap-1 text-micro text-muted-foreground">
                          {locked ? (
                            <>
                              <Lock className="h-3.5 w-3.5" aria-hidden />
                              Best after step {step.step_order - 1}
                            </>
                          ) : (
                            <>
                              {step.lesson_count} reviewed{" "}
                              {step.lesson_count === 1 ? "lesson" : "lessons"}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
