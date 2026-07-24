// Household PIN dialog — used to set a new PIN and to unlock Kids Mode when a
// PIN is already in place. Presents a 4-digit numeric input, validates
// asynchronously, and calls back on success.

import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setHouseholdPin, verifyHouseholdPin } from "@/lib/householdPin";
import { toast } from "sonner";

type Mode = "set" | "verify";

interface Props {
  open: boolean;
  mode: Mode;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

export default function HouseholdPinDialog({ open, mode, onOpenChange, onSuccess }: Props) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin("");
      setConfirm("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, mode]);

  const submit = async () => {
    if (pin.length !== 4) return toast.error("PIN must be 4 digits");
    setBusy(true);
    try {
      if (mode === "set") {
        if (pin !== confirm) {
          toast.error("PINs don't match");
          return;
        }
        await setHouseholdPin(pin);
        toast.success("Household PIN saved");
        onSuccess();
        onOpenChange(false);
      } else {
        const ok = await verifyHouseholdPin(pin);
        if (!ok) {
          toast.error("Incorrect PIN");
          setPin("");
          inputRef.current?.focus();
          return;
        }
        onSuccess();
        onOpenChange(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "set" ? "Set household PIN" : "Enter household PIN";
  const description =
    mode === "set"
      ? "Choose a 4-digit PIN. It's required to turn Kids Mode off."
      : "Enter the caregiver's PIN to turn Kids Mode off.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Input
            ref={inputRef}
            inputMode="numeric"
            pattern="\d*"
            maxLength={4}
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="h-12 text-center text-2xl tracking-[0.5em]"
            aria-label="PIN"
            onKeyDown={(e) => {
              if (e.key === "Enter" && mode === "verify") submit();
            }}
          />
          {mode === "set" && (
            <Input
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-12 text-center text-2xl tracking-[0.5em]"
              aria-label="Confirm PIN"
              placeholder="Confirm"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || pin.length !== 4 || (mode === "set" && confirm.length !== 4)}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "set" ? "Save PIN" : "Unlock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
