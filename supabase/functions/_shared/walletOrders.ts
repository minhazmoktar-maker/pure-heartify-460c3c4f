/**
 * Shared order plumbing for Bangladesh mobile-wallet checkout (bKash + Nagad).
 *
 * Both rails follow the same three-phase shape:
 *   create  → an order row + a gateway-hosted URL the member is sent to
 *   execute → the gateway calls back / the app returns; we verify server-side
 *   grant   → only a *gateway-verified* success grants an entitlement
 *
 * The invariant that matters: an entitlement is NEVER granted from a client
 * callback payload. The client only tells us "come back and check"; the amount,
 * currency and status are always re-read from the gateway with merchant
 * credentials before `grant_plan_entitlement` runs.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export type PlanId = "plus" | "family" | "lifetime";
export type Wallet = "bkash" | "nagad";
export type Platform = "ios" | "android" | "web";

/**
 * Server-side price list in BDT. Client-supplied amounts are never trusted —
 * the plan id is the only thing the client chooses, the price comes from here.
 * Mirrors `src/lib/pricing.ts` → PRICING_REGIONS.bd.
 */
export const BDT_PRICES: Record<PlanId, number> = {
  plus: 249,
  family: 449,
  lifetime: 6900,
};

/** Billing period granted per plan, in months. `lifetime` never expires. */
export const PLAN_MONTHS: Record<PlanId, number> = {
  plus: 1,
  family: 1,
  lifetime: 0,
};

export function isPlan(v: unknown): v is PlanId {
  return v === "plus" || v === "family" || v === "lifetime";
}

export function isPlatform(v: unknown): v is Platform {
  return v === "ios" || v === "android" || v === "web";
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Resolve the caller from a Bearer token. Returns null for anonymous callers. */
export async function callerId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
    headers: {
      apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      Authorization: auth,
    },
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  return user?.id ?? null;
}

/**
 * Merchant invoice number. bKash caps this at 255 chars and requires it unique
 * per payment; Nagad uses it as the order id and allows [A-Za-z0-9] only.
 */
export function newInvoice(wallet: Wallet): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `HF${wallet === "bkash" ? "B" : "N"}${stamp}${rand}`;
}

/**
 * Grant the plan for a verified-completed order, exactly once.
 *
 * Idempotency is the order row itself: the update is conditional on the row not
 * already being `completed`, so a duplicated callback (very common on mobile —
 * app return *and* gateway server callback both fire) can never double-grant.
 */
export async function completeOrder(
  admin: SupabaseClient,
  invoice: string,
  patch: Record<string, unknown>,
): Promise<{ granted: boolean; plan?: PlanId; error?: string }> {
  const { data: order } = await admin
    .from("mobile_payments")
    .select("id, user_id, plan, status")
    .eq("merchant_invoice", invoice)
    .maybeSingle();
  if (!order) return { granted: false, error: "order_not_found" };
  if (order.status === "completed") return { granted: false, plan: order.plan as PlanId };

  const { data: claimed, error } = await admin
    .from("mobile_payments")
    .update({ ...patch, status: "completed", completed_at: new Date().toISOString() })
    .eq("id", order.id)
    .neq("status", "completed")
    .select("id, user_id, plan")
    .maybeSingle();
  if (error) return { granted: false, error: error.message };
  if (!claimed) return { granted: false, plan: order.plan as PlanId }; // lost the race — already granted

  if (claimed.user_id) {
    const plan = claimed.plan as PlanId;
    const { error: grantErr } = await admin.rpc("grant_plan_entitlement", {
      p_user_id: claimed.user_id,
      p_plan: plan,
      p_months: PLAN_MONTHS[plan] || 1,
    });
    if (grantErr) return { granted: false, plan, error: grantErr.message };
    return { granted: true, plan };
  }
  return { granted: false, plan: claimed.plan as PlanId, error: "order_has_no_user" };
}

export async function failOrder(
  admin: SupabaseClient,
  invoice: string,
  status: "failed" | "cancelled",
  reason: string,
  raw: unknown = {},
) {
  await admin
    .from("mobile_payments")
    .update({ status, failure_reason: reason.slice(0, 500), raw: raw as never })
    .eq("merchant_invoice", invoice)
    .neq("status", "completed");
}
