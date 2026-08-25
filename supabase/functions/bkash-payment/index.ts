/**
 * bKash Tokenized Checkout (PGW) — create / execute / status.
 *
 * Flow (identical on iOS, Android and web):
 *   1. POST { action: "create", plan, platform, return_url }
 *      → grants a merchant id_token, creates the payment, stores the order and
 *        returns `bkashURL`. The app opens that URL (in-app browser on native,
 *        same-tab redirect on web).
 *   2. bKash redirects back to `return_url?paymentID=…&status=success`.
 *      The app calls POST { action: "execute", payment_id }.
 *      We execute the payment server-side, re-verify amount + currency +
 *      transactionStatus against our own price list, and only then grant.
 *   3. POST { action: "status", invoice } — idempotent re-check for a member who
 *      closed the browser mid-flow (or for a support/ops replay).
 *
 * The client never supplies an amount, and no client field can grant an
 * entitlement — see `_shared/walletOrders.ts`.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { observed } from "../_shared/observe.ts";
import {
  BDT_PRICES,
  adminClient,
  callerId,
  completeOrder,
  failOrder,
  isPlan,
  isPlatform,
  newInvoice,
} from "../_shared/walletOrders.ts";

const BASE = (Deno.env.get("BKASH_BASE_URL") ?? "").replace(/\/+$/, "");
const APP_KEY = Deno.env.get("BKASH_APP_KEY") ?? "";
const APP_SECRET = Deno.env.get("BKASH_APP_SECRET") ?? "";
const USERNAME = Deno.env.get("BKASH_USERNAME") ?? "";
const PASSWORD = Deno.env.get("BKASH_PASSWORD") ?? "";

const configured = Boolean(BASE && APP_KEY && APP_SECRET && USERNAME && PASSWORD);

/** Cached merchant token — bKash id_tokens live ~1h; refresh at 50 minutes. */
let tokenCache: { token: string; expires: number } | null = null;

async function grantToken(): Promise<string> {
  if (tokenCache && tokenCache.expires > Date.now()) return tokenCache.token;
  const res = await fetch(`${BASE}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: USERNAME,
      password: PASSWORD,
    },
    body: JSON.stringify({ app_key: APP_KEY, app_secret: APP_SECRET }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id_token) {
    throw new Error(`bkash token grant failed: ${data?.statusMessage ?? res.status}`);
  }
  tokenCache = { token: data.id_token as string, expires: Date.now() + 50 * 60 * 1000 };
  return tokenCache.token;
}

async function bkash(path: string, body: unknown): Promise<Record<string, unknown>> {
  const token = await grantToken();
  const res = await fetch(`${BASE}/tokenized/checkout/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-APP-Key": APP_KEY,
    },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!configured) {
    return json(
      { error: "bkash_not_configured", message: "bKash merchant credentials are not set." },
      503,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const admin = adminClient();
  const action = body.action;

  // ---------------------------------------------------------------- create --
  if (action === "create") {
    const uid = await callerId(req);
    if (!uid) return json({ error: "unauthorized" }, 401);
    if (!isPlan(body.plan)) return json({ error: "invalid_plan" }, 400);
    const platform = isPlatform(body.platform) ? body.platform : "web";
    const returnUrl = typeof body.return_url === "string" && /^https?:\/\//.test(body.return_url)
      ? body.return_url
      : null;
    if (!returnUrl) return json({ error: "invalid_return_url" }, 400);

    const plan = body.plan;
    const amount = BDT_PRICES[plan];
    const invoice = newInvoice("bkash");

    const { error: insErr } = await admin.from("mobile_payments").insert({
      user_id: uid,
      wallet: "bkash",
      plan,
      amount,
      currency: "BDT",
      platform,
      status: "created",
      merchant_invoice: invoice,
    });
    if (insErr) return json({ error: insErr.message }, 500);

    const callbackURL = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}wallet=bkash&invoice=${invoice}`;
    let created: Record<string, unknown>;
    try {
      created = await bkash("create", {
        mode: "0011",
        payerReference: invoice,
        callbackURL,
        amount: amount.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: invoice,
      });
    } catch (e) {
      await failOrder(admin, invoice, "failed", (e as Error).message);
      return json({ error: "bkash_unavailable" }, 502);
    }

    const paymentID = created.paymentID as string | undefined;
    const bkashURL = created.bkashURL as string | undefined;
    if (!paymentID || !bkashURL) {
      await failOrder(admin, invoice, "failed", String(created.statusMessage ?? "create_failed"), created);
      return json({ error: "bkash_create_failed", detail: created.statusMessage ?? null }, 502);
    }

    await admin
      .from("mobile_payments")
      .update({
        status: "initiated",
        gateway_payment_id: paymentID,
        redirect_url: bkashURL,
        raw: created as never,
      })
      .eq("merchant_invoice", invoice);

    return json({ invoice, payment_id: paymentID, redirect_url: bkashURL, amount, currency: "BDT" });
  }

  // --------------------------------------------------------------- execute --
  if (action === "execute") {
    const paymentId = typeof body.payment_id === "string" ? body.payment_id : null;
    if (!paymentId) return json({ error: "missing_payment_id" }, 400);

    const { data: order } = await admin
      .from("mobile_payments")
      .select("merchant_invoice, plan, amount, status")
      .eq("gateway_payment_id", paymentId)
      .maybeSingle();
    if (!order) return json({ error: "order_not_found" }, 404);
    if (order.status === "completed") {
      return json({ status: "completed", invoice: order.merchant_invoice, plan: order.plan });
    }

    let executed = await bkash("execute", { paymentID: paymentId });
    // bKash returns 2029/2062 while a payment is still settling — fall back to
    // the authoritative status query rather than failing a good payment.
    if (!executed.transactionStatus) {
      executed = await bkash("payment/status", { paymentID: paymentId });
    }

    const status = String(executed.transactionStatus ?? "");
    const paid = Number(executed.amount ?? 0);
    const currency = String(executed.currency ?? "BDT");

    if (status !== "Completed") {
      await failOrder(
        admin,
        order.merchant_invoice as string,
        status === "Cancelled" ? "cancelled" : "failed",
        String(executed.statusMessage ?? status ?? "not_completed"),
        executed,
      );
      return json({ status: status || "failed", detail: executed.statusMessage ?? null }, 200);
    }
    // Server-side amount verification: the gateway must have collected exactly
    // what our own price list says, in BDT.
    if (currency !== "BDT" || Math.abs(paid - Number(order.amount)) > 0.01) {
      await failOrder(
        admin,
        order.merchant_invoice as string,
        "failed",
        `amount_mismatch expected ${order.amount} BDT got ${paid} ${currency}`,
        executed,
      );
      return json({ status: "failed", error: "amount_mismatch" }, 409);
    }

    const result = await completeOrder(admin, order.merchant_invoice as string, {
      gateway_trx_id: executed.trxID ?? null,
      gateway_status: status,
      raw: executed as never,
    });
    return json({
      status: "completed",
      invoice: order.merchant_invoice,
      plan: result.plan ?? order.plan,
      granted: result.granted,
      trx_id: executed.trxID ?? null,
    });
  }

  // ---------------------------------------------------------------- status --
  if (action === "status") {
    const invoice = typeof body.invoice === "string" ? body.invoice : null;
    if (!invoice) return json({ error: "missing_invoice" }, 400);
    const { data: order } = await admin
      .from("mobile_payments")
      .select("merchant_invoice, plan, status, gateway_payment_id, gateway_trx_id")
      .eq("merchant_invoice", invoice)
      .maybeSingle();
    if (!order) return json({ error: "order_not_found" }, 404);
    if (order.status === "completed" || !order.gateway_payment_id) {
      return json({ status: order.status, plan: order.plan, trx_id: order.gateway_trx_id });
    }
    const queried = await bkash("payment/status", { paymentID: order.gateway_payment_id });
    if (String(queried.transactionStatus ?? "") === "Completed") {
      const result = await completeOrder(admin, invoice, {
        gateway_trx_id: queried.trxID ?? null,
        gateway_status: "Completed",
        raw: queried as never,
      });
      return json({ status: "completed", plan: result.plan ?? order.plan, granted: result.granted });
    }
    return json({ status: order.status, gateway_status: queried.transactionStatus ?? null });
  }

  return json({ error: "unknown_action" }, 400);
}

Deno.serve(observed("bkash-payment", handler));
