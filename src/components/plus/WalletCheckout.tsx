/**
 * bKash / Nagad checkout affordance for Bangladeshi members.
 *
 * Shown only when the pricing region resolves to Bangladesh, because these rails
 * settle exclusively in BDT. Thumb-reachable 44px targets, Bengali endonyms
 * first (বিকাশ / নগদ are what the wallets are actually called), and an explicit
 * statement that the charge is in BDT with no conversion fee — the two things
 * BD buyers check before tapping.
 */
import { useState } from "react";
import { Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { WALLETS, startWalletCheckout, type Wallet, type WalletPlan } from "@/lib/mobileWallet";

interface Props {
  plan: WalletPlan;
  priceLabel: string;
  className?: string;
}

export default function WalletCheckout({ plan, priceLabel, className }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState<Wallet | null>(null);

  const pay = async (wallet: Wallet) => {
    if (!user) {
      toast.error("Please sign in first — your plan is tied to your account.");
      return;
    }
    setBusy(wallet);
    const res = await startWalletCheckout(wallet, plan);
    if (!res.ok) {
      setBusy(null);
      toast.error(res.error ?? "Payment could not start.");
    }
    // On success the browser navigates (web) or the in-app browser opens
    // (iOS/Android), so the spinner intentionally stays until then.
  };

  return (
    <div className={className}>
      <p className="flex items-center gap-1.5 text-micro text-muted-foreground">
        <Smartphone className="h-3.5 w-3.5" aria-hidden />
        Pay {priceLabel} with your mobile wallet
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {WALLETS.map((w) => (
          <Button
            key={w.id}
            type="button"
            variant="outline"
            className="min-h-[44px] justify-center gap-2"
            disabled={busy !== null}
            onClick={() => pay(w.id)}
            aria-label={`Pay ${priceLabel} with ${w.label}`}
          >
            {busy === w.id ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <span className="font-semibold">{w.native}</span>
            )}
            <span className="text-micro text-muted-foreground">{w.label}</span>
          </Button>
        ))}
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-micro text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        Charged in BDT by bKash/Nagad. No card, no conversion fee. Your plan activates only after the
        wallet confirms the payment.
      </p>
    </div>
  );
}
