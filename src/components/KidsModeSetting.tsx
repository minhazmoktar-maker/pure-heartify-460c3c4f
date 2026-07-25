// Kids Mode setting — lives in Profile > Preferences.
// Locks the feed to safe-content-only for young viewers. When a household PIN
// is set, disabling Kids Mode requires the PIN (Sprint 3 — Household Mode).

import { useState } from "react";
import { Baby, Lock, KeyRound } from "lucide-react";
import { useKidsMode } from "@/contexts/KidsModeContext";
import { soundTap } from "@/lib/soundHaptics";
import { cn } from "@/lib/utils";
import { clearHouseholdPin, hasHouseholdPin } from "@/lib/householdPin";
import HouseholdPinDialog from "@/components/HouseholdPinDialog";
import { toast } from "sonner";

export default function KidsModeSetting() {
  const { enabled, setEnabled } = useKidsMode();
  const [pinLocked, setPinLocked] = useState<boolean>(() => hasHouseholdPin());
  const [dialog, setDialog] = useState<{ open: boolean; mode: "set" | "verify"; intent: "toggle-off" | "add-pin" | "remove-pin" }>({
    open: false,
    mode: "set",
    intent: "add-pin",
  });

  const handleToggle = () => {
    soundTap();
    if (enabled && pinLocked) {
      setDialog({ open: true, mode: "verify", intent: "toggle-off" });
      return;
    }
    setEnabled(!enabled);
  };

  const handleRemovePin = () => {
    setDialog({ open: true, mode: "verify", intent: "remove-pin" });
  };

  const onDialogSuccess = () => {
    if (dialog.intent === "toggle-off") {
      setEnabled(false);
    } else if (dialog.intent === "remove-pin") {
      clearHouseholdPin();
      setPinLocked(false);
      toast.success("Household PIN removed");
    } else if (dialog.intent === "add-pin") {
      setPinLocked(true);
    }
  };

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-pill",
              enabled ? "bg-primary/15 text-primary" : "bg-secondary text-foreground",
            )}
            aria-hidden
          >
            <Baby className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Kids mode</h2>
            <p className="text-micro text-muted-foreground">
              Restricts the feed to child-safe Islamic and educational content.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? "Turn Kids mode off" : "Turn Kids mode on"}
          onClick={handleToggle}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
            enabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform",
              enabled ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-card border border-border/70 bg-background/40 p-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-pill",
              pinLocked ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-secondary text-muted-foreground",
            )}
            aria-hidden
          >
            {pinLocked ? <Lock className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {pinLocked ? "Household PIN enabled" : "Household PIN"}
            </p>
            <p className="text-micro text-muted-foreground">
              {pinLocked
                ? "A 4-digit PIN is required to turn Kids Mode off."
                : "Add a PIN so children can't disable Kids Mode."}
            </p>
          </div>
        </div>
        {pinLocked ? (
          <button
            type="button"
            onClick={handleRemovePin}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Remove
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setDialog({ open: true, mode: "set", intent: "add-pin" })}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Set PIN
          </button>
        )}
      </div>

      <HouseholdPinDialog
        open={dialog.open}
        mode={dialog.mode}
        onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}
        onSuccess={onDialogSuccess}
      />
    </section>
  );
}
