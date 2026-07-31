import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, X } from "lucide-react";

/**
 * MVP-4 — T+90 benefit label collection.
 *
 * Asks one question at a time, only when a label is due (T+7 / T+30 / T+90
 * after a completed watch). This is the ground truth for the benefit
 * objective — it is never used as an engagement nudge.
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

function horizonLabel(days: number) {
  if (days === 7) return "a week ago";
  if (days === 30) return "a month ago";
  return "three months ago";
}

export default function BenefitLabelPrompt() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [hidden, setHidden] = useState(false);

  const { data } = useQuery({
    queryKey: ["benefit-label-due", user?.id],
    enabled: Boolean(user),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<DueLabel | null> => {
      const { data, error } = await supabase.rpc("get_due_benefit_label");
      if (error) throw error;
      return (data as unknown as DueLabel | null) ?? null;
    },
  });

  const answer = useMutation({
    mutationFn: async (vars: { worthIt?: string; dismiss?: boolean }) => {
      if (!data) return;
      const { error } = await supabase.rpc("submit_benefit_label", {
        _id: data.id,
        _worth_it: vars.worthIt ?? null,
        _remembered: null,
        _acted_on: null,
        _note: null,
        _dismiss: vars.dismiss ?? false,
      });
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      setHidden(true);
      qc.invalidateQueries({ queryKey: ["benefit-label-due", user?.id] });
      if (!vars.dismiss) toast.success("Thank you — this shapes what we recommend.");
    },
    onError: () => toast.error("Could not save your answer. Please try again."),
  });

  if (!user || !data || hidden) return null;

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
