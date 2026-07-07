# Channel & Video Verification System

## Goal
Add a durable moderation pipeline for YouTube channels/videos with an audit trail, YouTube-ID-based duplicate detection, a nightly re-check job, and an admin review page — end-to-end tested.

## Database (one migration)

New tables in `public`:

- **`channel_candidates`** — pending channels awaiting decision
  - `youtube_channel_id` (unique), `handle`, `title`, `description`, `category`, `language`, `country`, `subscriber_count`, `source` (e.g. "gemini"), `submitted_by`, `status` (`pending|approved|rejected|flagged`)
- **`approved_channels`** — canonical whitelist (source of truth for duplicate checks)
  - `youtube_channel_id` (unique), `title`, `handle`, `category`, `owner_key` (normalized creator identity — lowercased handle/title stem — used to catch aliases/backups), `last_rechecked_at`, `consistency_score`
- **`channel_audit_log`** — every decision, immutable
  - `candidate_id`, `channel_id_ref` (nullable FK to approved_channels), `action` (`approved|rejected|flagged|rechecked`), `admin_id`, `confidence` (0-100), `evidence` jsonb (title, description, latest_video_titles[], thumbnail_urls[], category_scores{}, exclusion_hits[]), `reason`, `created_at`
- **`video_candidates`** + **`video_audit_log`** — mirror structure for individual videos

All tables: GRANT to authenticated + service_role, RLS enabled, admin-only write via `has_role(auth.uid(), 'admin')`, authenticated read on audit logs.

`owner_key` computed via a small SQL function that lowercases + strips "official/tv/hd/backup/2/archive" suffixes so `MuftiMenkOfficial` and `MuftiMenkTV` collide.

Duplicate check function `public.check_channel_duplicate(_yt_id, _title, _handle)` returns match reason (`exact_id|owner_key|title_similarity`) using `pg_trgm`.

## Edge functions

- **`verify-channel`** — takes a candidate, fetches YouTube channel via existing `YOUTUBE_API_KEY`, runs exclusion keyword scan on latest 10 uploads, computes confidence score, writes to `channel_candidates` + `channel_audit_log` with full evidence jsonb. Returns approve/reject verdict (auto-approve only if confidence ≥95 and duplicate-risk low).
- **`recheck-approved-channels`** — iterates `approved_channels` ordered by `last_rechecked_at`, re-fetches YouTube data, detects: (a) 404/deleted, (b) title/handle rename, (c) recent uploads failing exclusions. Flags changes into `channel_audit_log` with action `flagged` and status `flagged`. Cron scheduled nightly via `pg_cron` (insert tool, not migration).

## Admin review page (`/admin/review`)

Guarded by `has_role(admin)`. Three tabs:
1. **Pending Candidates** — cards with title, thumbnail, category, evidence preview, Approve/Reject buttons (writes audit log with reason + confidence).
2. **Approved vs Rejected** — split view, filter by category/date, click row → drawer showing full evidence jsonb + reasoning side-by-side.
3. **Flagged for Recheck** — items where nightly job detected drift; approve keep / remove.

Same layout has a Videos tab that mirrors the Channels UI against `video_candidates`.

## E2E tests (Playwright)

- `tests/e2e/channel-verification.spec.ts` — submit candidate → verify → approve → confirm in approved list, audit log entry visible.
- Duplicate detection: submit alias variant, expect rejected with `owner_key` match reason.
- Recheck: seed an approved channel with a title that now fails exclusions, invoke recheck function, assert `flagged` status appears in admin page.
- Admin RBAC: non-admin gets 403 on `/admin/review`.

Run via existing `bunx vitest` for unit slices + `playwright test` for E2E.

## Files

- `supabase/migrations/<ts>_channel_verification.sql`
- `supabase/functions/verify-channel/index.ts`
- `supabase/functions/recheck-approved-channels/index.ts`
- `src/pages/AdminReview.tsx` + route in `src/App.tsx`
- `src/components/admin/CandidateCard.tsx`, `EvidenceDrawer.tsx`
- `src/hooks/useAdminReview.ts`
- `tests/e2e/channel-verification.spec.ts`
- `tests/e2e/recheck-flag.spec.ts`

## Out of scope
- Migrating the existing static `channelCategories.ts` list into `approved_channels` (can seed later on request).
- Automatic un-approval — nightly job only flags; humans decide.

Approve to proceed and I'll ship the migration first, then functions + UI + tests.
