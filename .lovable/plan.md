# Retention & Growth Build Plan

Ship the checklist in 4 waves, highest-ROI first. Each wave is independently shippable and measurable.

## Wave R1 — Retention Core (this turn + next)
**Goal: lift D2/D7 retention.**

1. **Streak Freeze** — 1 free freeze/week, auto-consumed on missed day.
   - Table: `streak_freezes` already exists. Add `auto_consume_streak_freeze()` DB function + weekly grant cron.
   - UI: freeze badge on `/profile?tab=streak` + "Freeze available" chip.
2. **Personalized quiet-time push** — replace generic push with per-user scheduled push using `notification_preferences.quiet_hours` + top personalized pick.
   - Edge fn `personalized-push` already exists → extend with per-user timezone scheduling + streak status + 1 video thumbnail.
   - Cron every 15min, fires when user's local quiet-time window opens.
3. **`useNeverEmpty()` guarantee** — every rail falls back to editor's picks if personalized <3 items.
4. **"Welcome back" flow** — if `last_seen > 7 days`, show one-time modal: "Your streak is safe if you watch today" + one-tap resume.

## Wave R2 — Growth Loops
5. **Weekly recap → auto-share card** — Friday cron generates PNG via existing `shareImage.ts`, pushes with WhatsApp share intent.
6. **Referral instrumentation** — track `share_events → referral_clicks → install → activation`; reward both sides with badge (schema exists).
7. **Programmatic SEO expansion** — auto-generate 200+ `/halal/:slug` pages from top search queries + scholars + surahs.

## Wave R3 — Habit Formation
8. **Notification budget UI** — `/profile?tab=notifications` slider: 1/day, 3/week, Jumu'ah only.
9. **Continue Watching rail** above the fold on `/` for signed-in users (uses `watch_history`).
10. **Ritual bundles** — "Morning" one-tap combo (Adhkar + ayah + 5-min video) on Today screen.
11. **Prayer-time contextual content** — post-Fajr / post-Isha rails driven by user's `salah_log` + locale.

## Wave R4 — Trust Moat & Instrumentation
12. **Retention analytics dashboard** — `/admin/retention` D1/D7/D30 by source, streak length p50/p90, push CTR, empty-rail impressions (0 target).
13. **Report → response SLA badge** — public `/trust` shows median review time.
14. **A/B test framework wired to onboarding** — use existing `experiments` infra to test 3-step vs 9-step first-run.

## Technical notes
- No new tables needed for Wave R1 — reuse `streak_freezes`, `notification_preferences`, `web_push_subscriptions`, `user_taste_profiles`.
- All crons via `pg_cron` + `pg_net` (already enabled).
- Edge fns use existing `X-Cron-Secret` gate pattern.
- All UI additions honor mobile-first + existing design tokens.

## Sequencing
Start with **Wave R1** in this turn: Streak Freeze end-to-end (biggest single retention lever, ~1 day of work, immediately visible on the screen you're on). Then Personalized Push. Waves R2-R4 follow in subsequent turns after verifying R1 lifts metrics.

## Success metrics per wave
- R1: D2 retention +10-20%, streak break rate -30%
- R2: viral coefficient measurable, +20% organic traffic
- R3: sessions/week 3→4+
- R4: full observability, data-driven iteration
