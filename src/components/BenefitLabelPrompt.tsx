import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, X } from "lucide-react";

/**
 * MVP-4 / MVP-7 — T+90 benefit label collection.
 *
 * Asks one question at a time, only when a label is due (T+7 / T+30 / T+90
 * after a completed watch). This is the ground truth for the benefit
 * objective — it is never used as an engagement nudge.
 *
 * MVP-7 adds:
 *  - a session-level lock so the prompt is asked at most once per session even
 *    when mounted on several surfaces (Home, Library, Profile);
 *  - an optional follow-up ("did you act on it?") that only appears after a
 *    positive answer, which is the highest-signal part of the label.
 */

interface DueLabel {
  id: string;
  video_id: string;
  video_title: string | null;
  horizon_days: number;
  watched_at: string;
}

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: "clearly_yes", label: "Yes, clearly" },
  { value: "somewhat", label: "Somewhat" },
  { value: "not_really", label: "Not really" },
  { value: "regret", label: "Waste of time" },
];

const SESSION_KEY = "heartify.benefit_label.session";

function sessionState(): "open" | "claimed" | "done" {
  try {
    return (sessionStorage.getItem(SESSION_KEY) as "claimed" | "done" | null) ?? "open";
  } catch {
    return "open";
  }
}

function setSessionState(v: "claimed" | "done") {
  try {
    sessionStorage.setItem(SESSION_KEY, v);
  } catch {
    /* private mode — degrade to per-mount behaviour */
  }
}

function horizonLabel(days: number) {
  if (days === 7) return "a week ago";
  if (days === 30) return "a month ago";
  return "three months ago";
}

/** Stable per-mount id so only the first mounted instance renders. */
let activeOwner: string | null = null;

export default function BenefitLabelPrompt() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [hidden, setHidden] = useState(false);
  const [stage, setStage] = useState<"ask" | "followup">("ask");
  const [worthIt, setWorthIt] = useState<string | null>(null);
  const [owner] = useState(() => Math.random().toString(36).slice(2));
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (activeOwner === null) {
      activeOwner = owner;
      setIsOwner(true);
    } else {
      setIsOwner(activeOwner === owner);
    }
    return () => {
      if (activeOwner === owner) activeOwner = null;
    };
  }, [owner]);

  const alreadyAsked = sessionState() === "done";

  const { data } = useQuery({
    queryKey: ["benefit-label-due", user?.id],
    enabled: Boolean(user) && isOwner && !alreadyAsked,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<DueLabel | null> => {
      const { data, error } = await supabase.rpc("get_due_benefit_label");
      if (error) throw error;
      return (data as unknown as DueLabel | null) ?? null;
    },
  });

  const answer = useMutation({
    mutationFn: async (vars: { worthIt?: string; actedOn?: boolean | null; dismiss?: boolean }) => {
      if (!data) return;
      const { error } = await supabase.rpc("submit_benefit_label", {
        _id: data.id,
        _worth_it: vars.worthIt ?? null,
        _remembered: null,
        _acted_on: vars.actedOn ?? null,
        _note: null,
        _dismiss: vars.dismiss ?? false,
      });
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      setSessionState("done");
      qc.invalidateQueries({ queryKey: ["benefit-label-due", user?.id] });
      if (vars.dismiss) {
        setHidden(true);
        return;
      }
      // Positive answers unlock the follow-up; anything else closes out.
      if (stage === "ask" && (vars.worthIt === "clearly_yes" || vars.worthIt === "somewhat")) {
        setWorthIt(vars.worthIt);
        setStage("followup");
        return;
      }
      setHidden(true);
      toast.success("Thank you — this shapes what we recommend.");
    },
    onError: () => toast.error("Could not save your answer. Please try again."),
  });

  if (!user || !data || hidden || !isOwner || alreadyAsked) return null;

  if (stage === "followup") {
    return (
      <section aria-label="Did you act on it?" className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">One last thing — did you act on it?</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Changed a habit, taught someone, or applied what you learned.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: "Yes, I acted on it", value: true },
            { label: "Not yet", value: false },
          ].map((o) => (
            <Button
              key={o.label}
              variant="outline"
              size="sm"
              className="h-11 rounded-full"
              disabled={answer.isPending}
              onClick={() => answer.mutate({ worthIt: worthIt ?? undefined, actedOn: o.value })}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Was this worth your time?"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Looking back — was it worth your time?
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              You watched{" "}
              <span className="font-medium text-foreground">
                {data.video_title ?? "a lesson"}
              </span>{" "}
              {horizonLabel(data.horizon_days)}.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => answer.mutate({ dismiss: true })}
          aria-label="Ask me later"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <Button
            key={o.value}
            variant="outline"
            size="sm"
            className="h-11 rounded-full"
            disabled={answer.isPending}
            onClick={() => answer.mutate({ worthIt: o.value })}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
