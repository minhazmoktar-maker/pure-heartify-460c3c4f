/**
 * FCM HTTP v1 sender routed through the Lovable connector gateway.
 *
 * Google shut down the legacy `fcm.googleapis.com/fcm/send` endpoint, so every
 * native push now goes through the gateway, which exchanges the connected
 * Firebase service account for an access token. No service-account JSON ever
 * lives in app code.
 *
 * Env: LOVABLE_API_KEY + FIREBASE_MESSAGING_API_KEY (set by the connector).
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

export function fcmConfigured(): boolean {
  return !!Deno.env.get("LOVABLE_API_KEY") && !!Deno.env.get("FIREBASE_MESSAGING_API_KEY");
}

export type FcmResult = {
  ok: boolean;
  status: number;
  /** true when the device token is no longer valid and should be deleted */
  stale: boolean;
  error?: string;
};

/** FCM v1 requires every data value to be a string. */
function stringifyData(data: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return out;
}

export async function sendFcm(opts: {
  token: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
}): Promise<FcmResult> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("FIREBASE_MESSAGING_API_KEY");
  if (!lovableKey || !connectionKey) {
    return { ok: false, status: 0, stale: false, error: "fcm_not_configured" };
  }

  const data = stringifyData(opts.data);
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: opts.token,
          notification: { title: opts.title, body: opts.body ?? "" },
          data,
          android: { priority: "HIGH" },
          apns: { headers: { "apns-priority": "10" } },
        },
      }),
    });
  } catch (e) {
    return { ok: false, status: 0, stale: false, error: String(e) };
  }

  if (res.ok) return { ok: true, status: res.status, stale: false };

  const text = await res.text();
  console.error(`FCM send failed [${res.status}]: ${text}`);
  const stale =
    res.status === 404 ||
    (res.status === 400 && /UNREGISTERED|INVALID_ARGUMENT/i.test(text)) ||
    /UNREGISTERED/i.test(text);
  return { ok: false, status: res.status, stale, error: text.slice(0, 500) };
}

/** Removes a device token that FCM reported as unregistered. */
export async function dropStaleToken(admin: {
  from: (t: string) => any;
}, token: string): Promise<void> {
  try {
    await admin.from("device_tokens").delete().eq("token", token);
  } catch (e) {
    console.warn("failed to drop stale token", e);
  }
}
