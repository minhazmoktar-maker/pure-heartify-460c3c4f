# Heartify Habit Loop — "Since you were away"

## Why this loop
Heartify already had the *investment* side (watch history, favourites, follows,
interests, learning paths) and the *action* side (Today-first home, surfaces v2
rails, personalised feed). The missing link in the Hook Model was a credible
**return trigger + variable reward**: a returning user had no evidence that the
library had changed in their favour since their last visit.

The chosen mechanism is deliberately *not* a streak/points/XP mechanic (those
already exist for worship habits and must not be turned into pressure). Instead:

```
TRIGGER    "did anything worthwhile appear since I was last here?"
ACTION     one tap on a reason-labelled card (resume / new upload / hidden gem)
REWARD     variable but always real — the content is genuinely new to the user
INVESTMENT the watch, save or follow that follows feeds existing personalisation
```

The reward is variable because its *composition* varies (an unfinished lesson, a
new upload from a followed scholar, an overlooked high-trust video in the user's
language) — never because content was randomised.

## Anti-manipulation guarantees
- The card renders **only** when the RPC returns at least one real item. If
  nothing changed, nothing is shown — no manufactured activity.
- No counters, no red dots, no countdowns, no urgency copy.
- Dismissible; the dismissal is keyed to the user's `last_seen` stamp, so it
  stays dismissed until something genuinely new appears.
- No new notifications were added; existing push caps/quiet hours are untouched.

## Architecture
- **`public.return_digest(p_limit int)`** — `SECURITY DEFINER`, `STABLE`,
  `search_path = public`. `EXECUTE` granted to `authenticated` and
  `service_role` only (revoked from `PUBLIC`/`anon`). It scopes everything to
  `auth.uid()`; a caller cannot read another user's digest.
  - `last_seen` = `max(watch_history.watched_at)` for the user (no new table,
    no extra write path). Users with no watch history get an empty digest, so
    cold-start users are never shown a fake "since you were away".
  - Three independent pools, deduped by `video_id`, ordered
    resume → follow upload → fresh gem:
    - **resume** — unfinished (`completed = false`, `progress_seconds > 30`,
      below 90% of duration), max 2.
    - **follow_upload** — videos from followed `approved_channels` ingested
      after `last_seen` and not already watched, max 3.
    - **fresh_gem** — trusted-channel videos ingested after `last_seen`,
      `halal_score >= 85`, filtered to the user's `content_languages`, ordered
      by lowest `view_count` (genuinely overlooked), max 3.
  - Halal invariants preserved on every pool: `is_hidden = false`,
    `is_archived = false`, `embeddable IS NOT false`,
    `moderation_state IN ('approved','auto_approved')`, no premium-only leakage.
- **`src/hooks/useReturnDigest.ts`** — React Query wrapper, `enabled` only when
  signed in, 5 min `staleTime` (one RPC call per session in practice).
- **`src/components/ReturnDigestCard.tsx`** — horizontally scrollable strip,
  44px dismiss target, `SmartImage` lazy thumbnails, reason chip per item.
  `resume` items deep-link with `?t=<progress-5>` (already supported by
  `Watch.tsx`).
- Mounted in `src/pages/Index.tsx` in the signed-in banner stack, above the
  rails and below `TodayHero`.

## Analytics
Registered in `public.event_schemas` (validated by `validate_analytics_event`):

| Event | Required properties |
| --- | --- |
| `return.digest_viewed` | `item_count`, `away_hours` |
| `return.digest_clicked` | `video_id`, `kind`, `position` |
| `return.digest_dismissed` | `item_count` |

Funnel: `return.digest_viewed` → `return.digest_clicked` → existing
`video_play` / `video_complete` / `favorites.added` → next-visit digest.
Health metric: click-through per view, plus share of clicks by `kind` (tells you
whether follows, freshness, or resume drives return value).

## Rollback
Drop the UI mount (one line in `src/pages/Index.tsx`) — the RPC is read-only and
side-effect free, so it can be left in place. Full rollback:
`DROP FUNCTION public.return_digest(integer);` and delete the three
`event_schemas` rows.

## Known limitations
- `last_seen` is derived from watch history, not app opens, so a user who opened
  the app but watched nothing will see the same digest again (intentional: the
  items are still unseen).
- `follow_upload` depends on `curated_videos.channel_id` coverage (~97%).
- No server-side impression dedup between the digest and the rails; overlap is
  possible but small because the digest is watch-history-aware.

## Next highest-leverage step
Feed `return.digest_clicked.kind` into the personalisation weights so the pool
that actually earns returns for each user is expanded on the next visit.
