/**
 * Return leg for bKash / Nagad checkout.
 *
 * Reached from the wallet's hosted page — via a same-tab redirect on web, or via
 * the in-app browser / app link on iOS and Android. This screen never decides
 * anything: it asks the backend to verify the order with the gateway and reports
 * whatever the gateway says. It polls briefly, because wallet settlement can lag
 * the redirect by a few seconds.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { celebrateUpgrade } from "@/lib/celebrate";
import {
  clearPendingOrder,
  readPendingOrder,
  verifyWalletOrder,
  type VerifyStatus,
  type Wallet,
} from "@/lib/mobileWallet";

const PLAN_LABEL: Record<string, string> = {
  plus: "Heartify+",
  family: "Heartify+ Family",
  lifetime: "Heartify+ Lifetime",
};

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<VerifyStatus>("pending");
  const [plan, setPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const celebrated = useRef(false);

  useEffect(() => {
    const pending = readPendingOrder();
    const wallet = ((params.get("wallet") as Wallet | null) ?? pending?.wallet ?? null) as Wallet | null;
    const invoice = params.get("invoice") ?? pending?.invoice ?? null;
    const paymentId = params.get("paymentID") ?? pending?.paymentId ?? undefined;
    // bKash appends its own status on cancel/failure — honour it immediately.
    const gatewayStatus = (params.get("status") ?? "").toLowerCase();

    if (!wallet || !invoice) {
      setStatus("failed");
      setMessage("We could not find this payment. If you were charged, contact support with your wallet receipt.");
      return;
    }
    if (gatewayStatus === "cancel" || gatewayStatus === "cancelled") {
      setStatus("cancelled");
      clearPendingOrder();
      return;
    }

    let cancelled = false;
    let attempt = 0;

    const tick = async () => {
      attempt++;
      const res = await verifyWalletOrder(wallet, invoice, paymentId);
      if (cancelled) return;
      if (res.plan) setPlan(res.plan);
      if (res.status === "completed") {
        setStatus("completed");
        clearPendingOrder();
        if (!celebrated.current) {
          celebrated.current = true;
          celebrateUpgrade();
        }
        return;
      }
      if (res.status === "failed" || res.status === "cancelled") {
        setStatus(res.status);
        setMessage(res.error ?? null);
        clearPendingOrder();
        return;
      }
      // Still settling — back off, then give up gracefully after ~30s.
      if (attempt < 8) {
        window.setTimeout(tick, 1500 + attempt * 500);
      } else {
        setStatus("pending");
        setMessage(
          "Your wallet has not confirmed yet. This can take a few minutes — your plan activates automatically once it does.",
        );
      }
    };
    void tick();

    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Payment status — Heartify+"
        description="Confirming your bKash or Nagad payment for Heartify+."
        path="/checkout/return"
        noBreadcrumbs
      />
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
        {status === "pending" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <h1 className="mt-6 font-heading text-title font-bold text-foreground">
              Confirming your payment
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {message ?? "Please keep this screen open — we are checking with your wallet."}
            </p>
          </>
        )}

        {status === "completed" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden />
            <h1 className="mt-6 font-heading text-title font-bold text-foreground">
              {PLAN_LABEL[plan ?? "plus"]} is active
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Jazāk Allāhu khayran. Your membership is live on every device you sign in to.
            </p>
            <Button asChild className="mt-6 min-h-[44px] w-full">
              <Link to="/">Start watching</Link>
            </Button>
          </>
        )}

        {(status === "failed" || status === "cancelled") && (
          <>
            <XCircle className="h-12 w-12 text-destructive" aria-hidden />
            <h1 className="mt-6 font-heading text-title font-bold text-foreground">
              {status === "cancelled" ? "Payment cancelled" : "Payment did not go through"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {message ?? "Nothing was charged. You can try again with either wallet."}
            </p>
            <Button asChild className="mt-6 min-h-[44px] w-full">
              <Link to="/plus#tiers">Back to plans</Link>
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
