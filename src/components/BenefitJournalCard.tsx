import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sprout, HeartHandshake, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RecentLabel {
  video_id: string;
  video_title: string | null;
  worth_it: string | null;
  acted_on: boolean | null;
  horizon_days: number | null;
  responded_at: string | null;
}

interface Summary {
  answered?: number;
  worth_it?: number;
  somewhat?: number;
  not_beneficial?: number;
  acted_on?: number;
  pending?: number;
  scheduled?: number;
  recent?: RecentLabel[];
}

/**
 * "Your benefit" — the user-facing mirror of the T+90 benefit label.
 *
 * Shows what the person themselves said was worth their time weeks later, and
 * how often they acted on it. Before any answers exist it explains the loop
 * instead of showing empty zeros, so the surface is honest on day one.
 */
export default function BenefitJournalCard() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["my-benefit-summary", user?.id],
    enabled: Boolean(user),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Summary> => {
      const { data, error } = await supabase.rpc("my_benefit_summary");
      if (error) throw error;
      return (data as unknown as Summary) ?? {};
    },
  });

  if (!user || !data) return null;

  const answered = data.answered ?? 0;
  const worthIt = data.worth_it ?? 0;
  const actedOn = data.acted_on ?? 0;
  const waiting = (data.pending ?? 0) + (data.scheduled ?? 0);

  return (
    <section
      aria-label="Your benefit"
      className="rounded-card border border-border/60 bg-card/80 p-4"
    >
      <div className="flex items-start gap-2">
        <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Your benefit</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {answered > 0
              ? "What you told us weeks after watching — the only score Heartify optimizes for."
              : "Weeks after you watch, we'll ask a single question: was it worth your time? Your answers shape what we recommend."}
          </p>
        </div>
      </div>

      {answered > 0 ? (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Worth your time" value={`${worthIt}/${answered}`} />
            <Stat label="You acted on" value={String(actedOn)} icon={<HeartHandshake className="h-3 w-3" />} />
            <Stat label="Follow-ups due" value={String(waiting)} icon={<Clock3 className="h-3 w-3" />} />
          </dl>

          {(data.recent?.length ?? 0) > 0 && (
            <ul className="mt-3 space-y-1.5">
              {data.recent!.slice(0, 4).map((r) => (
                <li key={`${r.video_id}-${r.responded_at}`} className="flex items-center gap-2 text-xs">
                  <span
                    aria-hidden
                    className={
                      r.worth_it === "clearly_yes" || r.worth_it === "yes"
                        ? "h-1.5 w-1.5 shrink-0 rounded-pill bg-primary"
                        : r.worth_it === "somewhat"
                        ? "h-1.5 w-1.5 shrink-0 rounded-pill bg-muted-foreground"
                        : "h-1.5 w-1.5 shrink-0 rounded-pill bg-border"
                    }
                  />
                  <Link
                    to={`/watch/${r.video_id}`}
                    className="truncate text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {r.video_title ?? "A lesson you watched"}
                  </Link>
                  {r.acted_on && (
                    <span className="shrink-0 text-micro font-medium text-primary">acted on</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        waiting > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {waiting} {waiting === 1 ? "follow-up is" : "follow-ups are"} lined up from what
            you've already watched.
          </p>
        )
      )}
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border/50 bg-background/60 p-2.5">
      <dt className="flex items-center gap-1 text-micro text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
