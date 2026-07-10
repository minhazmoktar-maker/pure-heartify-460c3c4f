import { supabase } from "@/integrations/supabase/client";

/**
 * Best-effort client-side hash so we can dedupe referral clicks per device
 * without ever sending raw IPs (we don't have them client-side anyway).
 * Fingerprint is a coarse device signature — not PII, not identifying.
 */
async function shortHash(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const LOG_KEY = "heartify.ref.click.logged";

export async function logReferralClickOnce(code: string) {
  try {
    if (!code) return;
    const already = sessionStorage.getItem(LOG_KEY + ":" + code);
    if (already) return;
    sessionStorage.setItem(LOG_KEY + ":" + code, "1");

    const fp = await shortHash(
      [
        navigator.userAgent,
        navigator.language,
        screen.width + "x" + screen.height,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      ].join("|"),
    );
    const uaHash = await shortHash(navigator.userAgent);
    await supabase.from("referral_clicks").insert({
      code: code.toUpperCase(),
      fingerprint: fp,
      ua_hash: uaHash,
      referrer: document.referrer || null,
    });
  } catch {
    /* noop */
  }
}
