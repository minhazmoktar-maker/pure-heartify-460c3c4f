/**
 * Whitelisted in-app destinations the support assistant is allowed to
 * suggest as a follow-up action.
 *
 * The model NEVER emits free-form URLs: it picks an `action_id` from this
 * list, and the server resolves it to a route. That makes open-redirect and
 * phishing-link injection structurally impossible.
 *
 * Mirrored client-side in `src/lib/support/actions.ts` — parity is enforced
 * by `src/lib/support/__tests__/action-parity.test.ts`.
 */
export interface SupportAction {
  id: string;
  label: string;
  route: string;
  /** Requires a signed-in session to be useful. */
  authOnly?: boolean;
}

export const SUPPORT_ACTIONS: readonly SupportAction[] = [
  { id: "open_home", label: "Go to Home", route: "/" },
  { id: "open_search", label: "Search Heartify", route: "/search" },
  { id: "open_listen", label: "Open Listen", route: "/listen" },
  { id: "open_prayer", label: "Prayer & Qibla", route: "/prayer" },
  { id: "open_qibla", label: "Qibla compass", route: "/qibla" },
  { id: "open_quran", label: "Open Qur'an", route: "/quran" },
  { id: "open_profile", label: "Your profile", route: "/profile", authOnly: true },
  { id: "open_notification_settings", label: "Notification settings", route: "/settings/notifications", authOnly: true },
  { id: "open_language_settings", label: "Language preferences", route: "/settings/languages" },
  { id: "open_login", label: "Sign in", route: "/login" },
  { id: "open_signup", label: "Create an account", route: "/signup" },
  { id: "open_forgot_password", label: "Reset your password", route: "/forgot-password" },
  { id: "open_mfa", label: "Two-factor security", route: "/security/mfa", authOnly: true },
  { id: "open_trust", label: "Trust & moderation", route: "/trust" },
  { id: "open_privacy_policy", label: "Privacy Policy", route: "/privacy" },
  { id: "open_terms", label: "Terms of Service", route: "/terms" },
  { id: "open_contact", label: "Contact the team", route: "/contact" },
  { id: "open_status", label: "Service status", route: "/status" },
  { id: "open_creator_dashboard", label: "Creator dashboard", route: "/creators/dashboard", authOnly: true },
  { id: "open_help", label: "Help centre", route: "/help" },
] as const;

const BY_ID = new Map(SUPPORT_ACTIONS.map((a) => [a.id, a]));

/** Resolve model-proposed action ids to real, whitelisted actions. */
export function resolveActions(ids: unknown, opts: { signedIn: boolean }): SupportAction[] {
  if (!Array.isArray(ids)) return [];
  const out: SupportAction[] = [];
  for (const raw of ids.slice(0, 8)) {
    if (typeof raw !== "string") continue;
    const action = BY_ID.get(raw.trim());
    if (!action) continue;
    if (action.authOnly && !opts.signedIn) continue;
    if (out.some((a) => a.id === action.id)) continue;
    out.push(action);
    if (out.length >= 3) break;
  }
  return out;
}

/** Compact catalogue string for the system prompt. */
export function actionCatalogue(signedIn: boolean): string {
  return SUPPORT_ACTIONS.filter((a) => signedIn || !a.authOnly)
    .map((a) => `${a.id} — ${a.label}`)
    .join("\n");
}
