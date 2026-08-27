/**
 * Account-aware deterministic resolution (Level 0.5).
 *
 * Two of Heartify's highest-volume support intents — "what's my subscription
 * status" and "why can't I sign in" — have factual answers that live in the
 * caller's own rows. Answering them from those facts is free, exact and far
 * better than a model guess.
 *
 * Least privilege by construction:
 *   - Only ever reads rows filtered by the verified `user_id` of the caller.
 *   - Reads a fixed, minimal column list per intent; no `select *`.
 *   - Anonymous callers get no facts at all — they get a sign-in prompt.
 *   - The produced answer is personal, so it is NEVER cached (the caller marks
 *     these turns non-cacheable) and never used to seed the shared cache.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface SubscriptionFacts {
  plan: string;
  expiresAt: string | null;
  /** True when the record exists but has lapsed. */
  expired: boolean;
  /** Household/gift seat rather than a self-purchased plan. */
  viaSeat: boolean;
  lastPaymentStatus: string | null;
  lastPaymentAt: string | null;
}

export interface LoginFacts {
  emailConfirmed: boolean;
  hasPassword: boolean;
  providers: string[];
  lastSignInAt: string | null;
}

export type AccountIntent = "subscription_status" | "login_problem";

const SUBSCRIPTION_INTENT =
  /\b(my|current)\b[^.?!]{0,24}\b(plan|subscription|premium|membership)\b|\b(subscription|premium|membership|plan)\b[^.?!]{0,24}\b(status|expire[sd]?|renew(al|s)?|active|cancelled|canceled|end[s]?)\b|\bam i (on|a) (premium|plus|paid)\b/i;

const LOGIN_INTENT =
  /\b(can'?t|cannot|unable to|trouble)\b[^.?!]{0,20}\b(log ?in|sign ?in|access my account)\b|\b(login|sign ?in)\b[^.?!]{0,20}\b(not working|fails?|failing|error|problem|issue)\b|\block(ed)? out\b/i;

/** Which (if any) account-backed intent this question expresses. */
export function detectAccountIntent(canonicalQuestion: string): AccountIntent | null {
  const q = canonicalQuestion ?? "";
  if (SUBSCRIPTION_INTENT.test(q)) return "subscription_status";
  if (LOGIN_INTENT.test(q)) return "login_problem";
  return null;
}

/** Minimal, user-scoped read for subscription questions. */
export async function loadSubscriptionFacts(
  admin: SupabaseClient,
  userId: string,
): Promise<SubscriptionFacts | null> {
  const [ent, seat, payment] = await Promise.all([
    admin.from("entitlements").select("plan, expires_at").eq("user_id", userId).maybeSingle(),
    admin.from("plus_household_members").select("user_id").eq("user_id", userId).maybeSingle(),
    admin.from("mobile_payments")
      .select("status, created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!ent.data && !seat.data) return null;
  const expiresAt = ent.data?.expires_at ?? null;
  return {
    plan: ent.data?.plan ?? (seat.data ? "plus_seat" : "free"),
    expiresAt,
    expired: !!expiresAt && new Date(expiresAt).getTime() < Date.now(),
    viaSeat: !!seat.data,
    lastPaymentStatus: payment.data?.status ?? null,
    lastPaymentAt: payment.data?.created_at ?? null,
  };
}

/** Minimal, user-scoped read for login questions (auth admin API, own id only). */
export async function loadLoginFacts(
  admin: SupabaseClient,
  userId: string,
): Promise<LoginFacts | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  const u = data?.user;
  if (error || !u) return null;
  const providers = Array.isArray(u.identities)
    ? u.identities.map((i) => i.provider).filter(Boolean)
    : [];
  return {
    emailConfirmed: !!u.email_confirmed_at,
    hasPassword: providers.includes("email"),
    providers: Array.from(new Set(providers)),
    lastSignInAt: u.last_sign_in_at ?? null,
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "an unknown date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "an unknown date";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export interface AccountAnswer {
  answer: string;
  topic: string;
  actionIds: string[];
  /** Personal answers are never cacheable. */
  cacheable: false;
  escalate: boolean;
  confidence: number;
}

/** Deterministic subscription answer built purely from the caller's own facts. */
export function subscriptionAnswer(facts: SubscriptionFacts | null): AccountAnswer {
  if (!facts || (facts.plan === "free" && !facts.viaSeat)) {
    return {
      answer:
        "Your account is currently on the free plan — every core Heartify feature stays available. " +
        "If you expected a membership to be active, check the plan page; a purchase made in the app can take a " +
        "few minutes to appear.",
      topic: "premium",
      actionIds: ["open_premium", "open_profile"],
      cacheable: false,
      escalate: false,
      confidence: 0.95,
    };
  }
  if (facts.viaSeat) {
    return {
      answer:
        "Your access comes from a household seat rather than your own purchase, so it follows the plan of the " +
        "member who invited you. You can see the household details on your profile.",
      topic: "premium",
      actionIds: ["open_profile", "open_premium"],
      cacheable: false,
      escalate: false,
      confidence: 0.9,
    };
  }
  if (facts.expired) {
    return {
      answer:
        `Your ${facts.plan} membership ended on ${formatDate(facts.expiresAt)}, so your account is back on the ` +
        "free plan. Renewing from the plan page restores membership features immediately.",
      topic: "premium",
      actionIds: ["open_premium"],
      cacheable: false,
      escalate: false,
      confidence: 0.95,
    };
  }
  const renew = facts.expiresAt
    ? ` It renews on ${formatDate(facts.expiresAt)}.`
    : " It has no end date recorded.";
  const payment = facts.lastPaymentStatus && facts.lastPaymentStatus !== "succeeded"
    ? ` Your most recent payment is marked "${facts.lastPaymentStatus}" — if that stays unresolved, membership can lapse at the next renewal.`
    : "";
  return {
    answer: `Your ${facts.plan} membership is active.${renew}${payment}`,
    topic: "premium",
    actionIds: ["open_premium", "open_profile"],
    cacheable: false,
    escalate: false,
    confidence: 0.95,
  };
}

/** Deterministic login-problem answer built from the caller's own auth facts. */
export function loginAnswer(facts: LoginFacts | null): AccountAnswer {
  if (!facts) {
    return {
      answer:
        "I couldn't read your sign-in details just now. Try the password reset link on the sign-in screen — " +
        "it works for every account that has an email address — and our team can help if it still fails.",
      topic: "login",
      actionIds: ["open_login", "open_contact"],
      cacheable: false,
      escalate: true,
      confidence: 0.4,
    };
  }
  if (!facts.emailConfirmed) {
    return {
      answer:
        "Your email address hasn't been confirmed yet, which is what blocks sign-in. Open the confirmation link " +
        "in the email we sent (check spam too), then sign in again. You can request a fresh link from the sign-in screen.",
      topic: "email_verification",
      actionIds: ["open_login", "open_contact"],
      cacheable: false,
      escalate: false,
      confidence: 0.95,
    };
  }
  if (!facts.hasPassword && facts.providers.length > 0) {
    return {
      answer:
        "Your account was created with a social sign-in, so it has no Heartify password. Use the same social " +
        "button you originally signed up with on the sign-in screen, and it will let you straight in.",
      topic: "login",
      actionIds: ["open_login"],
      cacheable: false,
      escalate: false,
      confidence: 0.95,
    };
  }
  const seen = facts.lastSignInAt ? ` Your last successful sign-in was on ${formatDate(facts.lastSignInAt)}.` : "";
  return {
    answer:
      "Your account is active and confirmed, so sign-in should work with your email and password." + seen +
      " If it's being rejected, reset the password from the sign-in screen — that clears stale sessions on the device too.",
    topic: "login",
    actionIds: ["open_login", "open_contact"],
    cacheable: false,
    escalate: false,
    confidence: 0.85,
  };
}

/** Prompt shown when an account question arrives from a signed-out visitor. */
export function signedOutAccountAnswer(intent: AccountIntent): AccountAnswer {
  return {
    answer: intent === "subscription_status"
      ? "I can only check membership details for a signed-in account. Sign in and ask me again, and I'll read your current plan."
      : "I can't look at a specific account until you're signed in. If you can't sign in at all, use the password reset link on the sign-in screen, or contact the team and they'll verify you directly.",
    topic: intent === "subscription_status" ? "premium" : "login",
    actionIds: ["open_login", "open_contact"],
    cacheable: false,
    escalate: false,
    confidence: 0.9,
  };
}
