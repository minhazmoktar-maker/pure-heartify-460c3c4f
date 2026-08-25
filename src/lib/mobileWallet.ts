/**
 * Bangladesh mobile-wallet checkout client (bKash + Nagad).
 *
 * One code path serves all three surfaces:
 *  - iOS / Android (Capacitor): the gateway page opens in the system in-app
 *    browser (SFSafariViewController / Chrome Custom Tab). The wallet app takes
 *    over via its own URL scheme when installed, then returns to
 *    `heartify://checkout/return`, which the deep-link handler routes to
 *    `/checkout/return`.
 *  - Web: a same-tab redirect to the gateway, returning to
 *    `https://<origin>/checkout/return`.
 *
 * The client never sends an amount — the plan id is all it chooses, the price is
 * resolved server-side. Nothing here can grant an entitlement; the return leg
 * only asks the backend to verify with the gateway.
 */
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "@/lib/pricing";

export type Wallet = "bkash" | "nagad";

export const WALLETS: { id: Wallet; label: string; native: string; hint: string }[] = [
  { id: "bkash", label: "bKash", native: "বিকাশ", hint: "Pay from your bKash wallet" },
  { id: "nagad", label: "Nagad", native: "নগদ", hint: "Pay from your Nagad wallet" },
];

/** Only these plans are sold on the wallet rails (BDT price list). */
export type WalletPlan = Extract<PlanId, "plus" | "family" | "lifetime">;

const FN: Record<Wallet, string> = {
  bkash: "bkash-payment",
  nagad: "nagad-payment",
};

const PENDING_KEY = "heartify.wallet_pending";

export interface PendingOrder {
  wallet: Wallet;
  invoice: string;
  plan: WalletPlan;
  paymentId?: string;
  startedAt: number;
}

export function readPendingOrder(): PendingOrder | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingOrder;
    // Abandoned attempts expire after an hour so a stale invoice never blocks a
    // fresh purchase.
    if (Date.now() - parsed.startedAt > 60 * 60 * 1000) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingOrder() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

function platform(): "ios" | "android" | "web" {
  if (!Capacitor.isNativePlatform()) return "web";
  return Capacitor.getPlatform() === "ios" ? "ios" : "android";
}

function returnUrl(): string {
  // Native builds return through the same https URL — the app's universal /
  // app links config claims it, so control comes back inside the app while the
  // web fallback still works if the link opens in a browser.
  return `${window.location.origin}/checkout/return`;
}

export interface StartResult {
  ok: boolean;
  error?: string;
  invoice?: string;
}

/** Create an order and hand the member to the wallet's hosted page. */
export async function startWalletCheckout(
  wallet: Wallet,
  plan: WalletPlan,
): Promise<StartResult> {
  const { data, error } = await supabase.functions.invoke(FN[wallet], {
    body: { action: "create", plan, platform: platform(), return_url: returnUrl() },
  });

  if (error) {
    return { ok: false, error: humanError(error.message) };
  }
  const res = data as { redirect_url?: string; invoice?: string; payment_id?: string; error?: string };
  if (res?.error || !res?.redirect_url || !res?.invoice) {
    return { ok: false, error: humanError(res?.error) };
  }

  const pending: PendingOrder = {
    wallet,
    invoice: res.invoice,
    plan,
    paymentId: res.payment_id,
    startedAt: Date.now(),
  };
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* storage blocked — the return leg falls back to the URL invoice param */
  }

  if (Capacitor.isNativePlatform()) {
    // Dynamic import keeps the native plugin out of the web bundle's critical path.
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: res.redirect_url, presentationStyle: "fullscreen" });
  } else {
    window.location.assign(res.redirect_url);
  }
  return { ok: true, invoice: res.invoice };
}

export type VerifyStatus = "completed" | "pending" | "failed" | "cancelled";

export interface VerifyResult {
  status: VerifyStatus;
  plan?: WalletPlan;
  granted?: boolean;
  trxId?: string | null;
  error?: string;
}

/**
 * Ask the backend to verify an order with the gateway. Safe to call repeatedly —
 * completion is idempotent server-side.
 */
export async function verifyWalletOrder(
  wallet: Wallet,
  invoice: string,
  paymentId?: string,
): Promise<VerifyResult> {
  // bKash needs `execute` on the first return (that is what captures the money);
  // afterwards, and for Nagad, a verify/status query is authoritative.
  const body =
    wallet === "bkash" && paymentId
      ? { action: "execute", payment_id: paymentId }
      : { action: wallet === "bkash" ? "status" : "verify", invoice };

  const { data, error } = await supabase.functions.invoke(FN[wallet], { body });
  if (error) return { status: "pending", error: humanError(error.message) };

  const res = data as {
    status?: string;
    plan?: WalletPlan;
    granted?: boolean;
    trx_id?: string | null;
    error?: string;
  };
  if (res?.error) return { status: "failed", error: humanError(res.error) };

  const raw = (res?.status ?? "").toLowerCase();
  const status: VerifyStatus =
    raw === "completed" || raw === "success"
      ? "completed"
      : raw === "cancelled" || raw === "aborted"
        ? "cancelled"
        : raw === "failed"
          ? "failed"
          : "pending";

  return { status, plan: res?.plan, granted: res?.granted, trxId: res?.trx_id ?? null };
}

function humanError(code?: string): string {
  switch (code) {
    case "bkash_not_configured":
    case "nagad_not_configured":
      return "Mobile wallet payments are not live yet. Please try again shortly.";
    case "unauthorized":
      return "Please sign in before paying.";
    case "amount_mismatch":
      return "The amount collected did not match the plan price. Nothing was charged to your plan — contact support.";
    case "bkash_unavailable":
    case "nagad_unavailable":
      return "The wallet gateway is not responding. Please try again in a moment.";
    default:
      return code ? `Payment could not start (${code}).` : "Payment could not start. Please try again.";
  }
}
