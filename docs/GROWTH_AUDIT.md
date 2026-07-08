# Heartify — Growth & Marketing Readiness Audit

_Last updated: July 8, 2026_

This audit evaluates Heartify's readiness to grow **organically** with a
solo founder and minimal ad budget. It ranks concrete, low-maintenance
improvements — no vanity features, no growth-hacking gimmicks that would
compromise the halal-first, distraction-free identity.

---

## 1. Scores (0–100)

| Dimension | Score | Notes |
| --- | ---: | --- |
| **Growth Readiness (overall)** | **62** | Solid foundation, but attribution + share loops + ASO copy need work before launch. |
| Organic Growth | 55 | Referral primitive exists; sharing surfaces are minimal. |
| SEO | 65 | Sitewide head done; per-route canonical/OG now wired via `<SEO>`; sitemap + robots present. Missing JSON-LD on video pages and blog/collections content. |
| ASO (App Store Optimization) | 60 | Metadata + copy documented in `docs/STORE_LISTING.md`; screenshots + preview video still to produce. |
| Viral Potential | 45 | No shareable playlists, no share-a-Daily-Dose flow, no invite screen. |
| Retention | 72 | Daily Dose + streaks + favorites are strong. Push + email lifecycle still absent. |
| Referral | 68 | Table + edge function + first-touch capture live. Missing in-product UI, QR, and reward messaging. |
| Creator Ecosystem | 30 | No creator profiles, no application flow. Only channel candidates via admin. |
| Marketing Infrastructure | 70 | Attribution + UTM now captured; share links + release notes + banners still needed. |
| International Expansion | 65 | 7 dictionaries + LocaleProvider live; regional content mix table exists but is under-populated. |

---

## 2. Recommendations, ranked by impact × effort

Effort scale: **XS** ≤ 1h · **S** ≤ 4h · **M** ≤ 1d · **L** > 1d.

### Must implement BEFORE launch

| # | Recommendation | Effort | Why |
| --- | --- | --- | --- |
| 1 | **Attribution capture (UTM + ref)** — first-touch persisted to `attributions`, linked on sign-in. | S | ✅ Shipped this turn. Anything else is guessing where users came from. |
| 2 | **Per-route SEO tags** via `<SEO>` on Watch, SearchResults, Channels, Privacy, Terms. | S | ✅ Component shipped; wire it into the 5 pages next turn. |
| 3 | **sitemap.xml + robots.txt sitemap directive**. | XS | ✅ Shipped. |
| 4 | **ASO metadata frozen** — title (≤30), subtitle (≤30), keywords (100 char comma list), short + long description. | S | Locks store listing before submission; see `docs/STORE_LISTING.md` §11. |
| 5 | **Share-a-video button** with `?ref=USERCODE&utm_source=user_share&utm_medium=video&utm_campaign=share` baked in. | S | Cheapest viral loop. Every existing user becomes a distribution channel. |
| 6 | **In-app review prompt** gated by delight moments (see `src/lib/inAppReview.ts`). | XS | ✅ Helper shipped; call `triggerIfDelightful()` from Daily Dose completion + streak extension. |
| 7 | **App Store screenshots + preview video** — 6.7"/6.5" iPhone + 12.9" iPad + Android phone/tablet. Use copy from `STORE_LISTING.md` §12. | M | Store submission blocker. |
| 8 | **Referral CTA in Profile** with copyable link + native share + QR. | S | Referral function already deployed; users can't act on it without UI. |

### Recommended during the first 3 months

| # | Recommendation | Effort | Why |
| --- | --- | --- | --- |
| 9 | **Share a Daily Dose** (image card + deep link) | M | Highly shareable — one screen per day of Islamic content. |
| 10 | **Playlists (public read, private write)** + share link | L | Enables curation-driven virality; keeps UX clean. |
| 11 | **JSON-LD `VideoObject` on Watch pages** | S | Google Video results = free organic search traffic. |
| 12 | **Email lifecycle** (welcome, day-3 dose reminder, streak-broken, weekly digest) via Resend + edge functions | M | Retention lift without paid ads. |
| 13 | **Push notification templates** (Daily Dose ready, streak reminder, favorite new video) | M | Native mobile retention. |
| 14 | **Announcement/release-notes banner** (dismissible, versioned in code) | S | Users see improvements; unlocks changelog SEO. |
| 15 | **Feedback capture** — 1-tap smiley on Watch page → free-text if 😞 | S | Cheap qualitative signal. |
| 16 | **Trending searches + trending channels shelves** on home | S | RPC functions already exist (`get_trending_searches`, `get_trending_video_ids`). |
| 17 | **Creator application form** + `creators` table with slug pages `/c/:slug` | L | Foundation for creator ecosystem; unlocks partner-driven distribution. |
| 18 | **Localised OG images** (per top language) via a signed image transformer | M | Doubles CTR on shared links in AR/ID/TR markets. |

### Long-term improvements

| # | Recommendation | Effort |
| --- | --- | --- |
| 19 | Verified creator badges + creator dashboard (views, watch time, favorites) | L |
| 20 | Community-suggested channels queue (voting → auto-promote to review) | M |
| 21 | Regional "Featured this week" curated by locale | M |
| 22 | Public collections shareable to WhatsApp / Telegram with rich unfurls | M |
| 23 | Referral tiers (unlock premium month per 5 signups) | S |
| 24 | Blog / library pages for high-intent SEO (`/library/tafsir`, `/library/seerah`) | L |

---

## 3. What NOT to build

To stay lean and true to the product identity:

- **No comment sections.** Trap for moderation cost and adds noise. Reactions only.
- **No follower graph / DMs.** Turns product into a social network.
- **No open sign-ups for creators.** Application-only, one-way promotion queue.
- **No dark patterns** in the review prompt: gated by real delight moments, 90-day cooldown.
- **No aggressive referral rewards** that cheapen the halal-first brand — a
  free month of premium is enough; do not offer cash bounties.

---

## 4. Instrumentation coverage (post-audit)

`src/lib/growthEvents.ts` now provides typed helpers for every funnel
stage. Wire into UI progressively:

- Acquisition — `growth.visited`, `growth.signedUp` (already partial in Login/Signup).
- Activation — `growth.onboardingCompleted`, `growth.firstVideoPlayed`, `growth.firstFavorite`.
- Search — `growth.searchIssued`, `growth.searchNoResults`, `growth.searchResultClicked`.
- Recommendations — `growth.recommendationImpression`, `growth.recommendationClicked`.
- Favorites — `growth.favoriteAdded`, `growth.favoriteRemoved`.
- Premium — `growth.premiumSurfaceViewed`, `growth.premiumUpgradeClicked`, `growth.premiumPurchased`.
- Referral — `growth.referralLinkCopied`, `growth.referralInvited`, `growth.referralRedeemed`.

All events land in `analytics_events` and are queryable via the existing
`analytics_*` RPCs in `docs/ANALYTICS.md`.

---

## 5. Founder-efficiency check

Every "must-implement" item above satisfies:

- ✅ zero ongoing manual work after ship
- ✅ automatable (edge function + cron where relevant)
- ✅ no growth staff or moderation team required
- ✅ preserves the calm, halal-first UX
