import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Mic2, Globe, Clock, BellRing, DownloadCloud, PartyPopper,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { INTEREST_OPTIONS } from "@/data/interestOptions";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { growth } from "@/lib/growthEvents";
import SEO from "@/components/SEO";
import { useLocale } from "@/contexts/LocaleContext";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useWebPush } from "@/hooks/useWebPush";

const STEP_KEYS = [
  "primary", "secondary", "exploration", "reciter", "locale", "reminder", "push", "install", "done",
] as const;
type StepKey = typeof STEP_KEYS[number];

const RECITERS = [
  { id: "mishary", name: "Mishary Rashid Alafasy" },
  { id: "sudais", name: "Abdul Rahman Al-Sudais" },
  { id: "shuraim", name: "Saud Al-Shuraim" },
  { id: "husary", name: "Mahmoud Khalil Al-Husary" },
  { id: "minshawi", name: "Mohamed Siddiq Al-Minshawi" },
  { id: "abdul-basit", name: "Abdul Basit Abdul Samad" },
  { id: "matrood", name: "Abdullah Al-Matrood" },
  { id: "ghamdi", name: "Saad Al-Ghamdi" },
  { id: "any", name: "Surprise me" },
];

const LOCALES = [
  { id: "en", label: "English" },
  { id: "ar", label: "العربية" },
  { id: "bn", label: "বাংলা" },
  { id: "de", label: "Deutsch" },
  { id: "fr", label: "Français" },
  { id: "id", label: "Bahasa Indonesia" },
  { id: "tr", label: "Türkçe" },
];

const REMINDER_HOURS = [5, 6, 7, 8, 12, 15, 18, 20, 21, 22];

const Onboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setLocale } = useLocale();
  const install = useInstallPrompt();
  const push = useWebPush();

  const [step, setStep] = useState<StepKey>("primary");
  const [picks, setPicks] = useState<{
    primary?: string; secondary?: string; exploration?: string;
    reciter?: string; locale?: string; hour?: number;
  }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login?redirect=/onboarding");
  }, [user, loading, navigate]);

  const currentIdx = STEP_KEYS.indexOf(step);
  const progress = ((currentIdx + 1) / STEP_KEYS.length) * 100;

  const disabledInterestIds = useMemo(() => {
    const used = new Set<string>();
    if (step !== "primary" && picks.primary) used.add(picks.primary);
    if (step !== "secondary" && picks.secondary) used.add(picks.secondary);
    if (step !== "exploration" && picks.exploration) used.add(picks.exploration);
    return used;
  }, [picks, step]);

  const persistProfileBits = async () => {
    if (!user) return;
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        preferred_reciter: picks.reciter ?? null,
        preferred_locale: picks.locale ?? null,
        daily_reminder_hour: picks.hour ?? null,
      },
      { onConflict: "id" },
    );
  };

  const persistInterestsAndFinish = async () => {
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
    if (error) {
      setSaving(false);
      toast({ title: "Couldn't save your interests", description: error.message, variant: "destructive" });
      return false;
    }
    await persistProfileBits();
    await supabase.rpc("seed_default_notification_prefs", { _user_id: user.id }).then(() => {}, () => {});
    await supabase
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", user.id);
    await qc.invalidateQueries({ queryKey: ["user-interests", user.id] });
    await qc.invalidateQueries({ queryKey: ["daily-dose", user.id] });
    growth.onboardingCompleted([picks.primary!, picks.secondary!, picks.exploration!]);
    setSaving(false);
    return true;
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case "primary": return !!picks.primary;
      case "secondary": return !!picks.secondary;
      case "exploration": return !!picks.exploration;
      case "reciter": return !!picks.reciter;
      case "locale": return !!picks.locale;
      case "reminder": return typeof picks.hour === "number";
      case "push":
      case "install":
      case "done":
        return true;
    }
  };

  const goNext = async () => {
    const next = STEP_KEYS[currentIdx + 1];
    if (step === "exploration") {
      // Save interests early so the profile is usable even if user bails.
      const ok = await persistInterestsAndFinish();
      if (!ok) return;
    }
    if (step === "locale" && picks.locale) {
      try { setLocale(picks.locale as never); } catch { /* noop */ }
    }
    if (!next) {
      navigate("/");
      return;
    }
    setStep(next);
  };

  const goBack = () => {
    if (currentIdx === 0) { navigate("/"); return; }
    setStep(STEP_KEYS[currentIdx - 1]);
  };

  if (loading || !user) return <div className="min-h-dvh bg-background" />;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary/5 via-background to-background">
      <SEO
        title="Welcome to Heartify — Get Started"
        description="Personalize your Heartify feed with the topics that matter to you."
        path="/onboarding"
      />
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-8 md:py-16">
        {/* Progress bar */}
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
            aria-label={`Step ${currentIdx + 1} of ${STEP_KEYS.length}`}
          />
        </div>

        {step === "primary" && (
          <InterestStep
            title="What matters most to you?"
            subtitle="Pick your primary interest — this fills 70% of your Daily Dose."
            icon={<Sparkles className="h-4 w-4" />}
            stepLabel="Step 1 · Interests"
            current={picks.primary}
            disabledIds={disabledInterestIds}
            onSelect={(id) => setPicks((p) => ({ ...p, primary: id }))}
          />
        )}
        {step === "secondary" && (
          <InterestStep
            title="And after that?"
            subtitle="Your secondary interest fills another 20% of your day."
            icon={<Sparkles className="h-4 w-4" />}
            stepLabel="Step 2 · Interests"
            current={picks.secondary}
            disabledIds={disabledInterestIds}
            onSelect={(id) => setPicks((p) => ({ ...p, secondary: id }))}
          />
        )}
        {step === "exploration" && (
          <InterestStep
            title="One area to explore?"
            subtitle="We'll sprinkle in 10% to broaden your horizons in shaa Allah."
            icon={<Sparkles className="h-4 w-4" />}
            stepLabel="Step 3 · Interests"
            current={picks.exploration}
            disabledIds={disabledInterestIds}
            onSelect={(id) => setPicks((p) => ({ ...p, exploration: id }))}
          />
        )}

        {step === "reciter" && (
          <ChoiceStep
            title="Who do you love to listen to?"
            subtitle="We'll open the Qur'ān with your reciter first."
            icon={<Mic2 className="h-4 w-4" />}
            stepLabel="Step 4 · Reciter"
            options={RECITERS.map((r) => ({ id: r.id, label: r.name }))}
            current={picks.reciter}
            onSelect={(id) => setPicks((p) => ({ ...p, reciter: id }))}
          />
        )}
        {step === "locale" && (
          <ChoiceStep
            title="Your language"
            subtitle="Translations and UI adapt to this."
            icon={<Globe className="h-4 w-4" />}
            stepLabel="Step 5 · Language"
            options={LOCALES.map((l) => ({ id: l.id, label: l.label }))}
            current={picks.locale}
            onSelect={(id) => setPicks((p) => ({ ...p, locale: id }))}
          />
        )}
        {step === "reminder" && (
          <ChoiceStep
            title="When should we remind you?"
            subtitle="One gentle nudge a day for your Daily Dose."
            icon={<Clock className="h-4 w-4" />}
            stepLabel="Step 6 · Reminder"
            options={REMINDER_HOURS.map((h) => ({
              id: String(h),
              label: `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`,
            }))}
            current={picks.hour != null ? String(picks.hour) : undefined}
            onSelect={(id) => setPicks((p) => ({ ...p, hour: Number(id) }))}
          />
        )}

        {step === "push" && (
          <PushStep
            status={push.status}
            supported={push.supported}
            onEnable={async () => {
              const s = await push.subscribe();
              if (s === "granted") toast({ title: "Notifications on 🔔" });
              else if (s === "denied") toast({ title: "You can enable notifications later in Settings" });
              // Persist reminder + reciter + locale after push decision.
              await persistProfileBits();
            }}
            onSkip={async () => { await persistProfileBits(); }}
          />
        )}

        {step === "install" && (
          <InstallStep
            canInstall={install.canInstall}
            isIOS={install.isIOS}
            isStandalone={install.isStandalone}
            onInstall={async () => {
              const r = await install.promptInstall();
              if (r === "accepted") toast({ title: "Installed 🎉" });
            }}
          />
        )}

        {step === "done" && <DoneStep />}

        <div className="mt-auto flex items-center justify-between gap-3 pt-8">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {currentIdx === 0 ? "Skip for now" : "Back"}
          </button>
          <button
            type="button"
            disabled={!canAdvance() || saving}
            onClick={goNext}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors",
              (!canAdvance() || saving) ? "opacity-50" : "hover:bg-primary/90",
            )}
          >
            {step === "done"
              ? "Start my Daily Dose"
              : saving
              ? "Saving…"
              : step === "push" || step === "install"
              ? "Continue"
              : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

function StepHeader({ icon, stepLabel, title, subtitle }: {
  icon: React.ReactNode; stepLabel: string; title: string; subtitle: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
        {icon}{stepLabel}
      </div>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">{subtitle}</p>
    </>
  );
}

function InterestStep({
  title, subtitle, icon, stepLabel, current, disabledIds, onSelect,
}: {
  title: string; subtitle: string; icon: React.ReactNode; stepLabel: string;
  current?: string; disabledIds: Set<string>; onSelect: (id: string) => void;
}) {
  return (
    <>
      <StepHeader icon={icon} stepLabel={stepLabel} title={title} subtitle={subtitle} />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        {INTEREST_OPTIONS.map((opt) => {
          const selected = current === opt.id;
          const disabled = disabledIds.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt.id)}
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
    </>
  );
}

function ChoiceStep({
  title, subtitle, icon, stepLabel, options, current, onSelect,
}: {
  title: string; subtitle: string; icon: React.ReactNode; stepLabel: string;
  options: { id: string; label: string }[]; current?: string; onSelect: (id: string) => void;
}) {
  return (
    <>
      <StepHeader icon={icon} stepLabel={stepLabel} title={title} subtitle={subtitle} />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        {options.map((opt) => {
          const selected = current === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={cn(
                "relative rounded-xl border p-4 text-left text-sm font-medium transition-all",
                selected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              {opt.label}
              {selected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

function PushStep({
  status, supported, onEnable, onSkip,
}: {
  status: string; supported: boolean;
  onEnable: () => void | Promise<void>; onSkip: () => void | Promise<void>;
}) {
  return (
    <>
      <StepHeader
        icon={<BellRing className="h-4 w-4" />}
        stepLabel="Step 7 · Reminders"
        title="Stay connected"
        subtitle="A single gentle push a day for your Daily Dose. You can change or turn this off any time in Settings."
      />
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        {!supported ? (
          <p className="text-sm text-muted-foreground">
            Your browser doesn't support push notifications. You'll still get in-app reminders.
          </p>
        ) : status === "granted" ? (
          <p className="text-sm text-foreground">Notifications enabled — assalāmu ʿalaykum ✨</p>
        ) : status === "denied" ? (
          <p className="text-sm text-muted-foreground">
            You've blocked notifications. Enable them in your browser settings any time.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onEnable}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <BellRing className="h-4 w-4" /> Enable notifications
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Maybe later
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function InstallStep({
  canInstall, isIOS, isStandalone, onInstall,
}: {
  canInstall: boolean; isIOS: boolean; isStandalone: boolean; onInstall: () => void | Promise<void>;
}) {
  return (
    <>
      <StepHeader
        icon={<DownloadCloud className="h-4 w-4" />}
        stepLabel="Step 8 · Install"
        title="Put Heartify on your home screen"
        subtitle="Opens like a real app. No app store needed."
      />
      <div className="mt-8 rounded-xl border border-border bg-card p-6 text-sm">
        {isStandalone ? (
          <p className="text-foreground">You're already using the installed app. Alhamdulillah.</p>
        ) : isIOS ? (
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Tap the <span className="font-semibold text-foreground">Share</span> button in Safari.</li>
            <li>Choose <span className="font-semibold text-foreground">Add to Home Screen</span>.</li>
            <li>Tap <span className="font-semibold text-foreground">Add</span> — done!</li>
          </ol>
        ) : canInstall ? (
          <button
            type="button"
            onClick={onInstall}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <DownloadCloud className="h-4 w-4" /> Install Heartify
          </button>
        ) : (
          <p className="text-muted-foreground">
            Use your browser menu → <span className="font-semibold text-foreground">Add to Home Screen</span> to install.
          </p>
        )}
      </div>
    </>
  );
}

function DoneStep() {
  return (
    <>
      <StepHeader
        icon={<PartyPopper className="h-4 w-4" />}
        stepLabel="You're all set"
        title="Your first Daily Dose is ready"
        subtitle="One tap and you're in — mabrūk 🌿"
      />
      <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-6 text-sm text-foreground">
        Personalization is live. We'll refine your feed as you watch.
      </div>
    </>
  );
}

export default Onboarding;
