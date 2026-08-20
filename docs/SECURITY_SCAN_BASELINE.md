# Security scan baseline

Rolling record of full-scan results so each new scan can be diffed against the
previous one. Append a new section per scan; never delete history.

---

## 2026-08-20 — post JWT-hardening scan

**Totals:** 7 findings — 1 error, 6 warn.
**Actionable regressions vs. previous baseline: 0.**

### Previously fixed findings — confirmed gone

| Finding | Status |
| --- | --- |
| `jwt_sub_spoof_entitlements` | Gone. `getCallerUserId` now verifies the signature via `auth.getClaims` before trusting `sub`. Verified live by `tests/e2e/forged-token.spec.ts` (21 cases). |
| `attestations_public_channel_data` | Gone. `anon`/`authenticated` hold **no** SELECT privilege on `public.attestations` (`has_table_privilege` = false for both). Public verification goes through `get_public_attestation`. |
| `channel_follows_owner_key_type_mismatch` | Gone. The dead `owner_key = auth.uid()::text` branch was removed; reads are self/admin only. |
| `khatm_groups_owner_id_public` | Accepted as intentional (opaque host identifier needed for attribution). |

### Current findings

| # | internal_id | Level | State | Assessment |
| --- | --- | --- | --- | --- |
| 1 | `attestations_claims_payload_public_exposure` | error | not_persisted | **Not exploitable.** The scanner reads the RLS policy text only. Table- and column-level SELECT for `anon`/`authenticated` is fully revoked, so PostgREST cannot reach any column, including `claims`/`payload`. Re-verified this scan. |
| 2 | `has_active_entitlement_fail_open_missing_columns` | warn | not_persisted | **Matches documented design.** `entitlements` has no `status`/`is_active` columns, so the final OR branch intentionally reduces the check to `plan <> 'free' AND (expires_at IS NULL OR expires_at > now())` — the rule specified in `docs/ENTITLEMENTS.md`. Writes are restricted to `grant_entitlement`/`revoke_entitlement` (admin/owner only, audited). No client write path exists. Revisit if a `status` column is ever added. |
| 3 | `SUPA_anon_security_definer_function_executable` | warn | ignored_by_user | Previously reviewed and accepted. |
| 4 | `SUPA_authenticated_security_definer_function_executable` | warn | ignored_by_user | Previously reviewed and accepted. |
| 5 | `channels_state_no_public_policy_but_check` | warn | ignored_by_user | Scanner self-reports "no actionable issue". |
| 6 | `video_comments_anon_select_status_only` | warn | ignored_by_user | Intentional: `status = 'visible'` comments are public content. Guarded by `tests/e2e/anon-comments.spec.ts`. |
| 7 | `channel_video_samples_admin_only_ok` | warn | ignored_by_user | Scanner self-reports "not a finding". |

### Diff summary

- **New actionable findings:** none.
- **Newly restated (no code change needed):** #1 (grant-level proof recorded above), #2 (design-documented).
- **Regressions:** none. Every finding fixed in the previous pass stays fixed.

### Verification evidence in CI

| Guarantee | Test |
| --- | --- |
| Forged / tampered / `alg:none` / expired bearer tokens cannot impersonate a user across PostgREST, GoTrue, entitlement RPCs, and all identity-aware edge functions | `tests/e2e/forged-token.spec.ts` |
| Signed-out visitors can read visible comments; hidden/removed comments and inserts stay blocked | `tests/e2e/anon-comments.spec.ts` |
| `visual-safety-sweep` writes partial verdicts instead of 504-ing on slow AI responses | `src/test/visual-safety-sweep.test.ts` |
| `sweep-embeddable` stops cleanly on YouTube quota exhaustion and leaves no video half-processed | `src/test/sweep-embeddable.test.ts` |

All four run on every push via `.github/workflows/security-regression.yml`.
