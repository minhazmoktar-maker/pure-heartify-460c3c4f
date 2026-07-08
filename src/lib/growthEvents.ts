/**
 * Typed growth-event helpers on top of src/lib/analytics.ts::track.
 *
 * Grouped by funnel stage so instrumentation stays consistent across the app.
 * All calls are fire-and-forget and never throw.
 *
 * Naming convention: <stage>.<action>
 *   e.g. "activation.first_video_played", "search.result_clicked"
 */
import { track } from "./analytics";

// ---------- Acquisition ----------
export const growth = {
  visited: (path: string, ref?: string | null) =>
    track("acquisition.visited", { path, ref: ref ?? null }),

  signedUp: (method: "email" | "google" | "apple") =>
    track("acquisition.signed_up", { method }),

  // ---------- Activation ----------
  onboardingStarted: () => track("activation.onboarding_started"),
  onboardingCompleted: (interests: string[]) =>
    track("activation.onboarding_completed", { interest_count: interests.length }),
  firstVideoPlayed: (videoId: string) =>
    track("activation.first_video_played", { video_id: videoId }),
  firstFavorite: (videoId: string) =>
    track("activation.first_favorite", { video_id: videoId }),

  // ---------- Search success ----------
  searchIssued: (query: string, resultCount: number) =>
    track("search.issued", { query_len: query.length, result_count: resultCount }),
  searchNoResults: (query: string) =>
    track("search.no_results", { query_len: query.length }),
  searchResultClicked: (query: string, videoId: string, position: number) =>
    track("search.result_clicked", { query_len: query.length, video_id: videoId, position }),

  // ---------- Recommendations ----------
  recommendationImpression: (videoId: string, source: string) =>
    track("recommendation.impression", { video_id: videoId, source }),
  recommendationClicked: (videoId: string, source: string, position: number) =>
    track("recommendation.clicked", { video_id: videoId, source, position }),
  recommendationDismissed: (videoId: string, source: string) =>
    track("recommendation.dismissed", { video_id: videoId, source }),

  // ---------- Favorites ----------
  favoriteAdded: (videoId: string) =>
    track("favorites.added", { video_id: videoId }),
  favoriteRemoved: (videoId: string) =>
    track("favorites.removed", { video_id: videoId }),

  // ---------- Premium conversion ----------
  premiumSurfaceViewed: (surface: string) =>
    track("premium.surface_viewed", { surface }),
  premiumUpgradeClicked: (surface: string) =>
    track("premium.upgrade_clicked", { surface }),
  premiumPurchased: (plan: string, amount_usd: number) =>
    track("premium.purchased", { plan, amount_usd }),

  // ---------- Referral ----------
  referralLinkCopied: (channel: "copy" | "share" | "qr") =>
    track("referral.link_copied", { channel }),
  referralInvited: (channel: string) =>
    track("referral.invited", { channel }),
  referralRedeemed: (code: string) =>
    track("referral.redeemed", { code_len: code.length }),

  // ---------- Retention ----------
  dailyDoseCompleted: (day_offset: number) =>
    track("retention.daily_dose_completed", { day_offset }),
  streakExtended: (length: number) =>
    track("retention.streak_extended", { length }),
};
