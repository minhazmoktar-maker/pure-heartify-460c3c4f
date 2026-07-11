// Cloudflare Turnstile CAPTCHA verification helper.
//
// Fail-open: if TURNSTILE_SECRET_KEY is not configured, verification is
// skipped so functions keep working while the operator sets it up. Once
// the secret is present, a missing or invalid token becomes a hard failure.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  ok: boolean;
  reason?: string;
}

export async function verifyTurnstile(
  token: string | null | undefined,
  req: Request,
): Promise<TurnstileResult> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return { ok: true, reason: "not_configured" };
  if (!token) return { ok: false, reason: "missing_token" };

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    undefined;

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  try {
    const r = await fetch(VERIFY_URL, { method: "POST", body: form });
    const data = await r.json();
    return data?.success ? { ok: true } : { ok: false, reason: "verification_failed" };
  } catch {
    return { ok: false, reason: "verify_exception" };
  }
}
