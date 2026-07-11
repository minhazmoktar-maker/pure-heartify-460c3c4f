import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { INTEREST_OPTIONS } from "@/data/interestOptions";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { growth } from "@/lib/growthEvents";

const STEPS = [
  {
    key: "primary",
    title: "What matters most to you?",
    subtitle: "Pick your primary interest — this fills 70% of your Daily Dose.",
  },
  {
    key: "secondary",
    title: "And after that?",
    subtitle: "Your secondary interest fills another 20% of your day.",
  },
  {
    key: "exploration",
    title: "One area to explore?",
    subtitle: "We'll sprinkle in 10% to broaden your horizons in shaa Allah.",
  },
] as const;

const Onboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<{ primary?: string; secondary?: string; exploration?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login?redirect=/onboarding");
  }, [user, loading, navigate]);

  const currentKey = STEPS[step].key as "primary" | "secondary" | "exploration";
  const currentPick = picks[currentKey];

  const disabledIds = useMemo(() => {
    const used = new Set<string>();
    if (currentKey !== "primary" && picks.primary) used.add(picks.primary);
    if (currentKey !== "secondary" && picks.secondary) used.add(picks.secondary);
    if (currentKey !== "exploration" && picks.exploration) used.add(picks.exploration);
    return used;
  }, [picks, currentKey]);

  const handleSelect = (id: string) => {
    setPicks((p) => ({ ...p, [currentKey]: id }));
  };

  const handleNext = async () => {
    if (!currentPick) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_interests")
      .upsert(
        {
          user_id: user.id,
          primary_interest: picks.primary!,
          secondary_interest: picks.secondary!,
          exploration_interest: picks.exploration!,
        },
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save your interests", description: error.message, variant: "destructive" });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["user-interests", user.id] });
    await qc.invalidateQueries({ queryKey: ["daily-dose", user.id] });
    growth.onboardingCompleted([picks.primary!, picks.secondary!, picks.exploration!]);
    toast({ title: "Alhamdulillah 🌿", description: "Your Daily Dose is being personalized." });
    navigate("/");
  };

  if (loading || !user) {
    return <div className="min-h-dvh bg-background" />;
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-10 md:py-16">
        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-10 bg-primary" : i < step ? "w-6 bg-primary/50" : "w-6 bg-muted",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-4 w-4" />
          Step {step + 1} of {STEPS.length}
        </div>
        <h1 className="mt-2 font-heading text-3xl font-bold text-foreground md:text-4xl">
          {STEPS[step].title}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
          {STEPS[step].subtitle}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
          {INTEREST_OPTIONS.map((opt) => {
            const selected = currentPick === opt.id;
            const disabled = disabledIds.has(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(opt.id)}
                className={cn(
                  "relative flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                    : "border-border bg-card hover:border-primary/40 hover:bg-card/80",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="font-semibold leading-tight text-foreground">{opt.title}</span>
                <span className="text-xs leading-snug text-muted-foreground">{opt.description}</span>
                {selected && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-8">
          <button
            type="button"
            onClick={() => (step === 0 ? navigate("/") : setStep(step - 1))}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Skip for now" : "Back"}
          </button>
          <button
            type="button"
            disabled={!currentPick || saving}
            onClick={handleNext}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors",
              (!currentPick || saving) ? "opacity-50" : "hover:bg-primary/90",
            )}
          >
            {step === STEPS.length - 1 ? (saving ? "Saving…" : "Finish") : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
