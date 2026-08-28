/**
 * Maps an in-app notification (`public.user_notifications`) to the screen the
 * user needs in order to ACT on it. Notification rows only carry `kind` +
 * `data`, so without this map a connection request was a dead-end toast.
 *
 * Used by the notifications bell (in-app), the web-push payload builder, and
 * the native push tap handler so all three land on the same screen.
 */
export function notificationTarget(
  kind: string,
  data: Record<string, unknown> | null | undefined,
): string {
  const d = data ?? {};
  const explicit = (d.cta_url as string) || (d.url as string) || "";
  if (explicit) return explicit;

  switch (kind) {
    case "connection_request":
      return "/connections?tab=requests";
    case "connection_accepted":
    case "connection_declined":
      return "/connections?tab=circle";
    case "nudge":
      return "/connections?tab=circle";
    case "challenge_invite":
    case "challenge_started":
    case "challenge_completed":
      return "/connections?tab=challenges";
    case "badge_earned":
    case "achievement":
      return "/achievements";
    case "streak_risk":
    case "streak_milestone":
      return "/profile?tab=streak";
    case "khatm_invite":
    case "khatm_progress":
      return "/khatm";
    case "referral_reward":
      return "/profile?tab=referrals";
    case "weekly_recap":
      return "/recap";
    case "followed_scholar":
      return "/channels";
    case "next_salah":
      return "/prayer";
    case "creator_upload_reviewed":
      return "/studio";
    case "report_resolved":
      return d.video_id ? `/watch/${String(d.video_id)}` : "/profile";
    default:
      return "/notifications-settings" in d ? "/settings/notifications" : "/";
  }
}

/** Human label for the notification's primary action. */
export function notificationCta(kind: string, data?: Record<string, unknown> | null): string {
  const explicit = (data?.cta_label as string) || "";
  if (explicit) return explicit;
  switch (kind) {
    case "connection_request":
      return "Review request";
    case "challenge_invite":
      return "View challenge";
    case "badge_earned":
      return "See badge";
    default:
      return "Open";
  }
}
