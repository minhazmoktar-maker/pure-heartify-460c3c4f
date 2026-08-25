/**
 * Nagad Payment Gateway (DFS check-out) — initialize / complete / verify.
 *
 * Nagad's API is signature-based rather than token-based:
 *   1. initialize/{merchantId}/{orderId} — send RSA-encrypted `sensitiveData`
 *      plus an RSA-SHA1 `signature`. Nagad answers with its own encrypted blob
 *      containing `paymentReferenceId` and a `challenge`.
 *   2. complete/{paymentReferenceId} — echo the challenge, the amount and the
 *      merchant callback URL. Nagad answers with `callBackUrl` — the hosted
 *      page the member is sent to (in-app browser on iOS/Android, redirect on
 *      web).
 *   3. verify/payment/{paymentReferenceId} — the ONLY source of truth for
 *      success. The app's return leg triggers this; the amount and status are
 *      re-checked against our own price list before any entitlement is granted.
 *
 * Crypto note: Nagad mandates RSA/ECB/PKCS1Padding and SHA1withRSA, neither of
 * which Deno's WebCrypto exposes — so this uses `node:crypto`, which the Edge
 * runtime supports.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  createSign,
  privateDecrypt,
  publicEncrypt,
  constants as cryptoConstants,
} from "node:crypto";
import { Buffer } from "node:buffer";
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

const BASE = (Deno.env.get("NAGAD_BASE_URL") ?? "").replace(/\/+$/, "");
const MERCHANT_ID = Deno.env.get("NAGAD_MERCHANT_ID") ?? "";
const MERCHANT_PRIVATE_KEY = Deno.env.get("NAGAD_MERCHANT_PRIVATE_KEY") ?? "";
const PG_PUBLIC_KEY = Deno.env.get("NAGAD_PG_PUBLIC_KEY") ?? "";

const configured = Boolean(BASE && MERCHANT_ID && MERCHANT_PRIVATE_KEY && PG_PUBLIC_KEY);

/** Wrap a bare base64 key body in the PEM envelope node:crypto expects. */
function pem(body: string, kind: "PRIVATE" | "PUBLIC"): string {
  const clean = body.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const wrapped = clean.match(/.{1,64}/g)?.join("\n") ?? clean;
  return `-----BEGIN ${kind} KEY-----\n${wrapped}\n-----END ${kind} KEY-----\n`;
}

function encryptForNagad(plain: string): string {
  return publicEncrypt(
    { key: pem(PG_PUBLIC_KEY, "PUBLIC"), padding: cryptoConstants.RSA_PKCS1_PADDING },
    Buffer.from(plain, "utf8"),
  ).toString("base64");
}

function decryptFromNagad(cipher: string): string {
  return privateDecrypt(
    { key: pem(MERCHANT_PRIVATE_KEY, "PRIVATE"), padding: cryptoConstants.RSA_PKCS1_PADDING },
    Buffer.from(cipher, "base64"),
  ).toString("utf8");
}

function sign(plain: string): string {
  const signer = createSign("RSA-SHA1");
  signer.update(plain);
  return signer.sign(pem(MERCHANT_PRIVATE_KEY, "PRIVATE"), "base64");
}

/** Nagad requires `yyyyMMddHHmmss` in Asia/Dhaka local time. */
function dhakaTimestamp(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
}

function nagadHeaders(clientIp: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-KM-IP-V4": clientIp,
    "X-KM-Client-Type": "PC_WEB",
    "X-KM-Api-Version": "v-0.2.0",
  };
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
      { error: "nagad_not_configured", message: "Nagad merchant credentials are not set." },
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
  const clientIp = (req.headers.get("x-forwarded-for") ?? "0.0.0.0").split(",")[0].trim();
  const action = body.action;

  // ------------------------------------------------------------ initialize --
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
    const invoice = newInvoice("nagad");

    const { error: insErr } = await admin.from("mobile_payments").insert({
      user_id: uid,
      wallet: "nagad",
      plan,
      amount,
      currency: "BDT",
      platform,
      status: "created",
      merchant_invoice: invoice,
    });
    if (insErr) return json({ error: insErr.message }, 500);

    const datetime = dhakaTimestamp();
    const sensitive = JSON.stringify({
      merchantId: MERCHANT_ID,
      datetime,
      orderId: invoice,
      challenge: crypto.randomUUID().replace(/-/g, "").slice(0, 20),
    });

    let initRes: Response;
    try {
      initRes = await fetch(`${BASE}/check-out/initialize/${MERCHANT_ID}/${invoice}`, {
        method: "POST",
        headers: nagadHeaders(clientIp),
        body: JSON.stringify({
          accountNumber: MERCHANT_ID,
          dateTime: datetime,
          sensitiveData: encryptForNagad(sensitive),
          signature: sign(sensitive),
        }),
      });
    } catch (e) {
      await failOrder(admin, invoice, "failed", (e as Error).message);
      return json({ error: "nagad_unavailable" }, 502);
    }

    const initBody = (await initRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (!initBody.sensitiveData || !initBody.signature) {
      await failOrder(admin, invoice, "failed", String(initBody.message ?? "initialize_failed"), initBody);
      return json({ error: "nagad_initialize_failed", detail: initBody.message ?? null }, 502);
    }

    const decoded = JSON.parse(decryptFromNagad(initBody.sensitiveData as string)) as {
      paymentReferenceId: string;
      challenge: string;
    };

    const orderSensitive = JSON.stringify({
      merchantId: MERCHANT_ID,
      orderId: invoice,
      currencyCode: "050", // BDT
      amount: amount.toFixed(2),
      challenge: decoded.challenge,
    });

    const completeRes = await fetch(`${BASE}/check-out/complete/${decoded.paymentReferenceId}`, {
      method: "POST",
      headers: nagadHeaders(clientIp),
      body: JSON.stringify({
        sensitiveData: encryptForNagad(orderSensitive),
        signature: sign(orderSensitive),
        merchantCallbackURL: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}wallet=nagad&invoice=${invoice}`,
        additionalMerchantInfo: { plan, platform },
      }),
    });
    const completeBody = (await completeRes.json().catch(() => ({}))) as Record<string, unknown>;
    const callbackUrl = completeBody.callBackUrl as string | undefined;
    if (!callbackUrl) {
      await failOrder(admin, invoice, "failed", String(completeBody.message ?? "complete_failed"), completeBody);
      return json({ error: "nagad_complete_failed", detail: completeBody.message ?? null }, 502);
    }

    await admin
      .from("mobile_payments")
      .update({
        status: "initiated",
        gateway_payment_id: decoded.paymentReferenceId,
        redirect_url: callbackUrl,
        raw: completeBody as never,
      })
      .eq("merchant_invoice", invoice);

    return json({
      invoice,
      payment_id: decoded.paymentReferenceId,
      redirect_url: callbackUrl,
      amount,
      currency: "BDT",
    });
  }

  // ---------------------------------------------------------------- verify --
  if (action === "verify" || action === "status") {
    const invoice = typeof body.invoice === "string" ? body.invoice : null;
    if (!invoice) return json({ error: "missing_invoice" }, 400);

    const { data: order } = await admin
      .from("mobile_payments")
      .select("merchant_invoice, plan, amount, status, gateway_payment_id, gateway_trx_id")
      .eq("merchant_invoice", invoice)
      .maybeSingle();
    if (!order) return json({ error: "order_not_found" }, 404);
    if (order.status === "completed") {
      return json({ status: "completed", plan: order.plan, trx_id: order.gateway_trx_id });
    }
    if (!order.gateway_payment_id) return json({ status: order.status }, 200);

    const verifyRes = await fetch(`${BASE}/verify/payment/${order.gateway_payment_id}`, {
      headers: nagadHeaders(clientIp),
    });
    const v = (await verifyRes.json().catch(() => ({}))) as Record<string, unknown>;
    const status = String(v.status ?? "");
    const paid = Number(v.amount ?? 0);

    if (status !== "Success") {
      if (status === "Aborted" || status === "Cancelled") {
        await failOrder(admin, invoice, "cancelled", status, v);
      } else if (status === "Failed") {
        await failOrder(admin, invoice, "failed", String(v.statusMessage ?? status), v);
      }
      return json({ status: status || order.status, detail: v.statusMessage ?? null });
    }
    if (Math.abs(paid - Number(order.amount)) > 0.01) {
      await failOrder(admin, invoice, "failed", `amount_mismatch expected ${order.amount} got ${paid}`, v);
      return json({ status: "failed", error: "amount_mismatch" }, 409);
    }

    const result = await completeOrder(admin, invoice, {
      gateway_trx_id: (v.issuerPaymentRefNo ?? v.paymentRefId ?? null) as string | null,
      gateway_status: status,
      raw: v as never,
    });
    return json({
      status: "completed",
      plan: result.plan ?? order.plan,
      granted: result.granted,
      trx_id: v.issuerPaymentRefNo ?? null,
    });
  }

  return json({ error: "unknown_action" }, 400);
}

Deno.serve(observed("nagad-payment", handler));
