/**
 * Attribution & UTM capture.
 *
 * On every page load we record the visitor's first-touch context:
 *   - ?ref=CODE  → referral code (also handled by ReferralBridge)
 *   - ?utm_source, utm_medium, utm_campaign, utm_term, utm_content
 *   - landing URL + document.referrer + user agent
 *
 * The row is keyed by a client-generated session id (stable in
 * sessionStorage). When the user later signs in, we backfill user_id so
 * marketing can join attribution to conversions.
 *
 * All writes are best-effort — never throw, never block the UI.
 */
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "heartify-session-id";
const CAPTURED_KEY = "heartify-attr-captured";

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function s(v: string | null): string | null {
  if (!v) return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > 200 ? t.slice(0, 200) : t;
}

export interface AttributionSnapshot {
  session_id: string;
  ref_code: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_url: string | null;
  referrer: string | null;
  user_agent: string | null;
}

export function readAttributionFromUrl(): AttributionSnapshot | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const p = url.searchParams;
  const snapshot: AttributionSnapshot = {
    session_id: getSessionId(),
    ref_code: s(p.get("ref"))?.toUpperCase().slice(0, 32) ?? null,
    utm_source: s(p.get("utm_source")),
    utm_medium: s(p.get("utm_medium")),
    utm_campaign: s(p.get("utm_campaign")),
    utm_term: s(p.get("utm_term")),
    utm_content: s(p.get("utm_content")),
    landing_url: url.pathname + url.search,
    referrer: s(document.referrer),
    user_agent: s(navigator.userAgent),
  };
  const hasSignal =
    snapshot.ref_code ||
    snapshot.utm_source ||
    snapshot.utm_medium ||
    snapshot.utm_campaign ||
    snapshot.utm_term ||
    snapshot.utm_content ||
    snapshot.referrer;
  return hasSignal ? snapshot : null;
}

/** Insert a first-touch attribution row exactly once per session. */
export async function captureAttributionOnce(): Promise<void> {
  try {
    if (sessionStorage.getItem(CAPTURED_KEY)) return;
    const snapshot = readAttributionFromUrl();
    if (!snapshot) return;
    sessionStorage.setItem(CAPTURED_KEY, "1");
    await supabase
      .from("attributions")
      .upsert(snapshot, { onConflict: "session_id", ignoreDuplicates: true });
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[attribution] capture failed", err);
  }
}

/** Backfill user_id on the session's attribution row after sign-in. */
export async function linkAttributionToUser(userId: string): Promise<void> {
  try {
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) return;
    await supabase
      .from("attributions")
      .update({ user_id: userId })
      .eq("session_id", sessionId)
      .is("user_id", null);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[attribution] link failed", err);
  }
}
