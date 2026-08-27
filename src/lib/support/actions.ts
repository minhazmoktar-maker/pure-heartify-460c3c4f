/**
 * Client mirror of the support assistant's whitelisted follow-up actions.
 *
 * Defence in depth: the edge function already resolves action ids to routes,
 * but the UI refuses to render any action whose route is not in this list, so
 * a compromised or buggy server response can never turn into an off-app link.
 *
 * Parity with `supabase/functions/_shared/support/routes.ts` is enforced by
 * `src/lib/support/__tests__/action-parity.test.ts`.
 */
export interface SupportAction {
  id: string;
  label: string;
  route: string;
  authOnly?: boolean;
}

export const SUPPORT_ACTIONS: readonly SupportAction[] = [
  { id: "open_home", label: "Go to Home", route: "/" },
  { id: "open_search", label: "Search Heartify", route: "/search" },
  { id: "open_listen", label: "Open Listen", route: "/listen" },
  { id: "open_prayer_times", label: "Prayer times", route: "/prayer-times" },
  { id: "open_qibla", label: "Qibla compass", route: "/qibla" },
  { id: "open_quran", label: "Open Qur'an", route: "/quran" },
  { id: "open_profile", label: "Your profile", route: "/profile", authOnly: true },
  { id: "open_settings", label: "Settings", route: "/settings", authOnly: true },
  { id: "open_notification_settings", label: "Notification settings", route: "/settings/notifications", authOnly: true },
  { id: "open_privacy_settings", label: "Privacy settings", route: "/settings/privacy", authOnly: true },
  { id: "open_accessibility_settings", label: "Accessibility settings", route: "/settings/accessibility", authOnly: true },
  { id: "open_login", label: "Sign in", route: "/login" },
  { id: "open_signup", label: "Create an account", route: "/signup" },
  { id: "open_forgot_password", label: "Reset your password", route: "/forgot-password" },
  { id: "open_mfa", label: "Two-factor security", route: "/security/mfa", authOnly: true },
  { id: "open_trust", label: "Trust & moderation", route: "/trust" },
  { id: "open_privacy_policy", label: "Privacy Policy", route: "/privacy" },
  { id: "open_terms", label: "Terms of Service", route: "/terms" },
  { id: "open_contact", label: "Contact the team", route: "/contact" },
  { id: "open_status", label: "Service status", route: "/status" },
  { id: "open_creator_studio", label: "Creator Studio", route: "/creator", authOnly: true },
  { id: "open_appeals", label: "Appeal a decision", route: "/trust#appeals", authOnly: true },
  { id: "open_downloads", label: "Downloads", route: "/downloads", authOnly: true },
  { id: "open_favorites", label: "Favorites", route: "/profile?tab=favorites", authOnly: true },
  { id: "open_history", label: "Watch history", route: "/profile?tab=history", authOnly: true },
] as const;

const ALLOWED_ROUTES = new Set(SUPPORT_ACTIONS.map((a) => a.route));

/** Drop anything the client does not recognise as a safe in-app destination. */
export function sanitizeActions(raw: unknown): SupportAction[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: SupportAction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { id, label, route } = item as Record<string, unknown>;
    if (typeof id !== "string" || typeof label !== "string" || typeof route !== "string") continue;
    if (!ALLOWED_ROUTES.has(route) || seen.has(route)) continue;
    seen.add(route);
    out.push({ id, label, route });
    if (out.length >= 3) break;
  }
  return out;
}
