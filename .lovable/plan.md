# Heartify — One Spine, One Identity

**Identity:** *The safest, best place to discover and watch halal, beneficial content.*
**Split:** 80% video/discovery/trust · 20% supporting Islamic tools that reinforce the video habit.
**Rule for every feature:** does it strengthen video, trust, retention, or the journey? If not → More, merged, or cut.

---

## 1. Information architecture

Four spines in the bottom tab bar. Everything else lives inside them or under Profile → More.

```text
Bottom tab bar (4 tabs)
├─ Home        For You feed = the front door. Video-first.
├─ Explore     Search · Categories · Series · Reciters · Scholars · Trending · Editor picks
├─ Library     Subscriptions · Continue · History · Playlists · Downloads · Saved
└─ Profile     You · Streak · Trust · Settings · More
```

**Profile → More (supporting tools, still one tap deep):**
Today's Dose · Qur'an · Prayer times · Dhikr · Khatm · Wird · Du'a wall · Journal · Zakat · Salah log · Weekly recap · Kids mode

Nothing is deleted — everything is reachable — but only video-adjacent surfaces get spine real estate.

## 2. Home (video-first front door)

Above the fold, in order:

1. **Streak chip** — top-right of every screen, always visible.
2. **Continue watching** rail (if any).
3. **Daily Dose slim card** — one 3-min pick, one tap to play. Replaces Today-first hero.
4. **For You** infinite grid — session-diverse, trust-pill on every card.
5. **Editorial rails:** Named-editor picks · New series episodes · From channels you follow · Trending in your language · Because you watched X.
6. **Prayer-aware nudge** (supporting, not blocking): a subtle "Fajr in 42 min — 3-min pre-Fajr pick" chip that opens a curated short video. Prayer strengthens video, not the other way around.
7. **Rolling trust counter** in the footer: *"3,412 videos reviewed this week · 218 removed."*

One default action per session: *tap the top card to watch.*

## 3. Explore

Full-screen search sheet (Instagram/YouTube pattern) with recent, trending, voice, per-language. Below the search: tabbed rows for Categories, Series, Reciters, Scholars, Editor collections, Trending. Listen (audio) lives here as a chip, not as its own tab.

## 4. Library

Single home for the user's investment: Subscriptions, Continue Watching, History, Playlists, Downloads (offline audio), Saved videos, Bookmarked ayahs. Consolidation unlocks the habit-loop "investment" leg.

## 5. Profile

Identity + streak + trust badge + settings + **More** grid of supporting tools. Creator Hub reachable from here for approved creators. Admin tools gated behind role.

## 6. Onboarding (redesigned, video-first)

Five steps, ≤60 seconds:

1. **Language & region** (drives locale-aware feed).
2. **Identity, not topics** — "I'm a new Muslim / student / parent / lifelong learner / revert." (Beats topic-checkboxes for personalization.)
3. **Pick 3 interests** — visual chips (Qur'an, tafsir, sīrah, history, science, family, productivity, language, du'a, kids). Feeds the taste profile.
4. **Follow 5 suggested channels** — pre-populates the feed so session #1 doesn't feel empty.
5. **Turn on the streak** — one push permission ask, framed as "we'll protect your streak, not spam you." Prayer / adhan push is offered later inside More, not at onboarding.

Onboarding never asks about Zakat, Journal, Wird, or Khatm. Those are earned discoveries.

## 7. Notifications (product > religious)

Cap 3/week stays. Copy shifts to product triggers:
- "New episode from *Stories of the Prophets*."
- "*Ustadh X* just posted a 9-min lecture."
- "Your streak is at 6 days — one video keeps it alive."
Adhan / Fajr / Wird pushes stay available but opt-in in More.

## 8. Trust surfacing (the underleveraged moat)

- **Trust pill on every card** — tier badge + reviewer + reviewed-at.
- **Watch page** shows the moderation decision reason (expandable).
- **Home footer counter** (rolling weekly).
- **Trust page** linked from Profile.

## 9. Watch experience polish

- Series auto-queue + "Continue series" surface.
- Optimistic UI on like / save / follow / not-interested.
- One-tap "share as image" on every video, ayah, dhikr (wire existing `shareImage.ts`).
- Post-Daily-Dose completion moment: small celebratory sheet, streak +1, "watch one more" CTA.

## 10. Creator loop

Creator Hub earns its keep by showing creators their **impressions, watch minutes, follower delta** — weekly email + dashboard. Named-editor bylines appear on editorial rails.

## 11. Roadmap (three waves)

**Wave 1 — IA & spine (this sprint)**
1. New 4-tab bottom bar; Prayer & Dhikr leave the spine.
2. Home rebuilt: Continue → Daily Dose slim → For You grid → editorial rails → trust counter.
3. Profile → More grid housing Today, Qur'an, Prayer, Dhikr, Khatm, Wird, Journal, Du'a, Zakat, Salah, Recaps, Kids.
4. Menu sheet trimmed **32 → 8**.
5. Global **streak chip** in header on every screen.
6. Full-screen search sheet.
7. Onboarding rewritten (5 steps, identity + interests + 5-channel warm-up).

**Wave 2 — watch polish & trust**
8. Trust pill on every card + watch-page decision reason.
9. Series auto-queue + Continue Series rail.
10. Optimistic UI on primary taps.
11. Share-as-image on video / ayah / dhikr.
12. Post-Daily-Dose completion moment.
13. Rolling public "reviewed this week" counter on Home.
14. Notification copy rewritten to product triggers.

**Wave 3 — growth, creators, SEO**
15. Creator dashboard: impressions + watch minutes + follower delta.
16. Named-editor curated rails.
17. Public **/surah/[name]** and **/scholar/[slug]** SEO landings.
18. axe-core in CI + real-device perf lab (mid-range Android 3G).
19. Native-reviewer pass per locale.
20. Route audit — hide ≥6 dead routes from nav (keep code for SEO / direct links).

Everything outside these three waves is frozen until Wave 3 ships.

## 12. What we are *not* doing

- Not making Today the front door.
- Not building isolated Islamic utilities that don't feed the video habit.
- Not chasing DAU vanity — **north-star is beneficial-minutes watched per WAU**; secondary is 7-day streak %.
- Not deleting supporting tools — they live in More and reinforce, not compete.

---

## Technical notes

- Nav config in `src/config/nav.ts` — one edit + `BottomTabBar.tsx` update handles the 5→4 change.
- `Index.tsx` swaps `TodayHero` for a slim `DailyDoseCard`; existing `useDailyDose` hook is reused unchanged.
- **Streak chip** = new tiny component reading `streaks`, dropped into `AppShell.tsx` header. Global across every route.
- **More grid** = new `src/components/profile/MoreGrid.tsx` with route links to existing pages — zero page-level rewrites, zero data-migration risk.
- **Full-screen search** = promote `SearchAutocomplete` to a route-level sheet triggered by the header magnifier.
- **Trust pill** = extend `YouTubeVideoCard` with a small badge reading `moderation_state` + `trust_tier` from `channel_trust_profiles` (already joined server-side).
- **Onboarding** rewrite lives in existing `src/pages/Onboarding.tsx` — 5 steps instead of 9.
- No DB migrations required for Wave 1. Wave 3 creator metrics reuse `feed_impressions` + `watch_history` (already indexed).

---

**Approve this plan and I'll ship Wave 1 in the next turn.** If you want a specific tab set beyond Home/Explore/Library/Profile, or a different onboarding order, say so now — that cascades everything.
