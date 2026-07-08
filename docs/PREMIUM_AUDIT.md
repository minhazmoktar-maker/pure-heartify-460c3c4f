# Premium Features Audit

_Last updated: 2026-07-08_

This document classifies every advertised or implied "Premium" capability
in the app against its current implementation state. The goal is a
truthful picture of what a paying user gets today, and a ranked roadmap
for closing the gap.

**Legend**
- ✅ **Functional** — end-to-end wired, gated correctly, persisted for real users.
- 🟡 **Partial** — works locally / for the current session but not fully persisted,
  or gating is client-only.
- 🟠 **Placeholder** — UI exists but no backend or effect behind it.
- 🔴 **Missing** — advertised (or implied by copy / marketing) but not implemented.

---

## 1. Feature matrix

| # | Feature | Status | Evidence | Notes |
|---|---------|--------|----------|-------|
| 1 | Premium audio tracks (locked/unlocked playback) | 🟡 Partial | `data/audio.ts` flags `isPremium`; `PlayerContext.playableFrom` and `TrackRow` respect it | Gating uses `isPremiumUser` **local React state only** — not `entitlements` table |
| 2 | Premium playlists (badge + lock overlay) | 🟡 Partial | `PlaylistCard.tsx` shows Crown + Lock when `!isPremiumUser` | Same local-state issue |
| 3 | Premium toggle button (dev/marketing switch) | 🟠 Placeholder | `PlayerContext.togglePremium`; called from `AudioSection.tsx` line 197, 221 | Grants premium instantly to anyone — no payment, no persistence |
| 4 | Entitlements storage in DB | ✅ Functional | `public.entitlements` table exists with RLS "Users read own" | Nothing writes to it; read path not wired into `PlayerContext` |
| 5 | Premium badge in mini-player | ✅ Functional | `AudioPlayer.tsx` line 67 | Cosmetic — depends on (1) |
| 6 | "Premium unlocked ✨" toast | ✅ Functional | `PlayerContext.togglePremium` | Correct copy, wrong trigger |
| 7 | Terms of Service premium clause | ✅ Functional | `pages/Terms.tsx` §7 | Legal text present |
| 8 | Payment / checkout flow | 🔴 Missing | — | No Paddle/Stripe integration, no pricing page, no purchase button |
| 9 | Subscription lifecycle (renew, cancel, refund, grace period) | 🔴 Missing | — | Nothing exists |
| 10 | Restore purchases (mobile) | 🔴 Missing | — | Not implemented in Capacitor bridge |
| 11 | Server-side entitlement enforcement (edge functions reject premium content for free users) | 🔴 Missing | `feed`, `recommendations`, `search` do not check entitlements | Any user hitting the API directly bypasses premium locks |
| 12 | Ad-free / higher-quality streams (implied by "Premium" framing) | 🔴 Missing | — | No ads to remove; no quality tiers exist |
| 13 | Downloads / offline playback | 🔴 Missing | — | Not implemented |
| 14 | Premium-only Daily Dose or exclusive reciters | 🔴 Missing | — | `daily_dose` has no premium column |
| 15 | Family / multi-seat plan | 🔴 Missing | — | — |
| 16 | Referral rewards that grant premium days | 🟠 Placeholder | `referrals` table + `redeem-referral` fn exist | Redemption does not touch `entitlements` |
| 17 | Push notifications for premium releases | 🟠 Placeholder | `device_tokens` table exists; `notify-favorites` fn | No premium-specific segmentation |

---

## 2. Scores (0–100)

| Area | Score | Reasoning |
|------|-------|-----------|
| **Advertised feature coverage** | **25** | Only cosmetic gating exists; 10+ implied features are missing |
| **Payment infrastructure** | **0** | No provider enabled, no checkout, no webhook |
| **Backend enforcement** | **10** | Table exists but is not read, and API endpoints do not check it |
| **Client gating** | **55** | Works for the current session but trivially bypassable (React state) |
| **Lifecycle & billing UX** | **0** | No restore, cancel, receipts, or grace-period handling |
| **Legal & compliance** | **60** | Terms mention premium; no refund policy, no per-jurisdiction tax note |
| **Overall Premium Readiness** | **22 / 100** | Not launch-ready as a paid tier |

---

## 3. Ranked recommendations

Ordered by **impact × urgency**. Effort is a rough T-shirt size
(S ≈ ½ day, M ≈ 1–2 days, L ≈ 3–5 days, XL ≈ >1 week).

### Must implement before charging money

| # | Recommendation | Impact | Effort |
|---|----------------|--------|--------|
| P0-1 | Enable a payments provider (recommend **Paddle** for a global digital catalog — merchant of record, no filing burden). | Critical | M |
| P0-2 | Build a `/premium` pricing page with a single Monthly plan and clear feature list matching what actually ships. | Critical | S |
| P0-3 | Webhook writes to `public.entitlements` (`tier`, `status`, `expires_at`, `provider_customer_id`, `provider_subscription_id`). | Critical | M |
| P0-4 | Replace `PlayerContext.togglePremium` with a real `useEntitlement()` hook that reads `entitlements` and subscribes to realtime updates. Remove the dev toggle from production builds (keep behind a `__DEV__` flag only). | Critical | M |
| P0-5 | Server-side enforcement: `feed`, `search`, `recommendations`, and any track-URL surface must strip or 402 premium content for users without an active entitlement. Client gating is UX, not security. | Critical | M |
| P0-6 | Restore purchases + subscription management page (view plan, next renewal, cancel link to provider portal). | High | M |
| P0-7 | Refund & cancellation policy in `/terms` and a dedicated `/refunds` page — required by both Paddle and app stores. | High | S |

### Recommended in the first 3 months

| # | Recommendation | Impact | Effort |
|---|----------------|--------|--------|
| P1-1 | Actually deliver at least one premium-only value pillar (curated premium playlist series, offline downloads, or ad-free — pick one and ship it deeply rather than three shallowly). | High | L |
| P1-2 | Referral → 14 days premium: wire `redeem-referral` to insert/extend `entitlements` server-side. | High | S |
| P1-3 | Annual plan (~2 months free) — measurable LTV lift with almost no engineering cost after P0-1. | High | S |
| P1-4 | Grace period (7 days) on failed payment before revoking access; dunning email via existing transactional email infra. | Medium | M |
| P1-5 | Premium-only Daily Dose variant (`daily_dose.is_premium`) so retention has a daily reason to re-open. | Medium | M |
| P1-6 | Analytics events: `premium.view_pricing`, `premium.start_checkout`, `premium.subscribe`, `premium.cancel`, `premium.churn` — plug into existing `growth.*` helpers. | High | S |
| P1-7 | Trial (7 days free, card required) once the funnel has ≥100 checkouts/mo of data. | Medium | S |

### Long-term improvements

| # | Recommendation | Impact | Effort |
|---|----------------|--------|--------|
| P2-1 | Family plan (up to 5 seats) once single-seat retention crosses the ~35 % @ M3 benchmark. | Medium | L |
| P2-2 | Mobile in-app purchase parity (Apple / Google) — required if the app is ever pushed hard through the stores; Paddle handles web + Android via Play alternative billing in supported regions. | Medium | XL |
| P2-3 | Gifting / one-year gift codes. | Low | M |
| P2-4 | Regional pricing (PPP-adjusted tiers for MENA / SEA / South Asia — the app's core audience). | Medium | M |
| P2-5 | Downloads with DRM-lite (encrypted local cache + entitlement check on decrypt). | Medium | XL |

---

## 4. Anti-recommendations (do **not** build)

- **A second free-vs-premium toggle in settings.** Users don't want a
  switch; they want a subscribe button.
- **Feature-count inflation** ("Premium gets 12 exclusive things!") when
  none of them are deep. Ship one thing users love.
- **Server-side "premium tier" enum with 4+ tiers.** Start with `free`
  and `premium`. Add tiers only when the data demands it.
- **Custom in-house billing.** Never. Use Paddle or Stripe.

---

## 5. Suggested next action

Approve **Phase D** to begin executing P0-1 through P0-5 in order:

1. Provider enablement + eligibility check (Paddle recommended).
2. Pricing page + one product.
3. Webhook → `entitlements`.
4. `useEntitlement()` + removal of `togglePremium` from production.
5. Server-side enforcement in `feed`, `search`, `recommendations`.

Everything above is measurable — we will re-score this doc after Phase D
lands and expect Premium Readiness to move from **22 → ~70**.
