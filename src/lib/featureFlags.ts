/**
 * Client-visible feature flags.
 *
 * Backend architecture (entitlements schema, RLS, edge-function checks)
 * always stays enabled — these flags only gate whether marketing-style
 * upgrade CTAs are shown to end users. Flip on once we have a live
 * checkout flow.
 */
export const FEATURE_FLAGS = {
  /** Show "Upgrade to Premium" / mailto CTAs in the UI. */
  PREMIUM_UPGRADE_CTA: false,
} as const;
