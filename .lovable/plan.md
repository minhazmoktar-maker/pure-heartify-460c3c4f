# World-Class Engagement Roadmap

The 10 concerns cover ~8–12 weeks of work. To ship "top-notch, perfectly," I'll execute in **5 sequenced sprints**, each independently valuable and shippable. Each sprint ends with a working, verified feature — not scaffolding.

## Sprint 1 — The "Why Open It Today?" Loop (highest ROI)
Goal: Every user has a reason to open Heartify tomorrow.

1. **Daily push cron** — `pg_cron` job at 6am local (per user timezone) invokes `personalized-push` with three templates: Daily Dose ready · Streak-at-risk (evening) · Next adhan (10 min before). Respects the existing 3/week cap and per-user notification prefs.
2. **Streak psychology upgrade**
   - Milestone celebrations (7/30/100/365 day) with confetti + shareable card.
   - 1 free "streak freeze" per week auto-granted, visible in Profile.
   - Streak-at-risk banner already exists — wire it to push.
3. **Email lifecycle** (Lovable Emails, needs domain — will prompt user if missing): Welcome (t+0), Rediscover (t+3d if inactive), Streak-broken (t+1d after break), Weekly recap (Fridays).

## Sprint 2 — Anchored Daily Ritual + Session Complete
Goal: One clear thing to do per day, with a satisfying finish.

1. **Daily Dose becomes the hero** — full-width card at top of home for signed-in users, with visible progress ring, "Complete" state, and tomorrow preview after completion.
2. **Session-complete screen** — after Daily Dose or 10+ min of listening: "You listened 12 min · +1 streak · Tomorrow: [preview]" with share button.
3. **Prayer times promoted** — next-salah countdown pinned above Daily Dose on mobile home.

## Sprint 3 — Social Gravity (safe, no DMs, no comments explosion)
1. **Aggregate social proof** — "12,483 Muslims listened this week" chips on video cards (from existing `feed_impressions`).
2. **Du'a Wall trending → home** — top 3 du'as with Ameen counts on home for signed-in users.
3. **Household mode** — Parent can see kids' watch history; Kids Mode already exists, add a Household dashboard in Profile.

## Sprint 4 — Content Depth (Learning Paths + Series)
1. **Learning Paths as first-class**: `learning_paths` table + `/paths` route + progress bars. Seed with 3 paths (Seerah 30-day, Juz Amma tafsir, Arabic 90-day) from existing `learningPaths.ts`.
2. **Series detection** — SQL job groups multi-part videos by title similarity (`Part 1/2/3`, `Ep 01`), exposes "Next episode" on Watch page.
3. **Mood/intent picker** — 4-tap chooser on home ("5 min / 30 min / I'm sad / I want to learn") → dedicated `/mood/:intent` surface.

## Sprint 5 — Growth Loops + Polish
1. **Referral UI** in Profile: copyable link, QR code, WhatsApp/Telegram share templates, "Invite 3 → 1 mo Premium" milestone.
2. **Share-a-Daily-Dose image card** — extends existing `shareImage.ts` with a Daily-Dose template, deep-linked back with `?ref`.
3. **Mobile install banner** — one-time dismissible on `/`.
4. **Delight micro-moments** — Framer Motion: streak-extend confetti, first-favorite heart burst, Khatm-completion sequence.
5. **Public `/trust/scholars-board`** — lists moderating scholars (from `scholars.ts`) with credentials. Massive credibility differentiator.

## What I'll skip (with rationale)
- **Audio waveform / chapter markers** — nice, but low retention lift; deferred.
- **Monetization overhaul** — user hasn't asked to charge yet; premium hooks stay as-is.
- **Real-time incident status page** — infra work, low user impact; deferred.
- **Content appeals visible to submitters** — small creator base; can ship post-launch.

## Verification per sprint
Each sprint ends with: (a) Playwright screenshot of the new surface, (b) TypeScript build clean, (c) at least one automated test where behavior is testable.

## Technical notes
- All new tables ship with GRANTs + RLS in the same migration.
- Push cron uses existing `personalized-push` — no new edge function.
- Email lifecycle will prompt for domain via the email setup dialog if none exists.
- No new dependencies unless a sprint truly needs one (Framer Motion is already in the project).

---

**Approve this plan and I'll start Sprint 1 in the next turn.** Or tell me to re-order — e.g. start with Sprint 4 (Learning Paths) if content depth matters more to you than push.
