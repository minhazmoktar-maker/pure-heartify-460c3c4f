# Security Hardening Report

_Last review: 2026-07-08_

Full audit of the Heartify / HalalTube platform: frontend, edge functions,
database, and auth. Lists every finding, its severity, and the mitigation
that ships in the codebase versus what still requires operator action
(Supabase Auth dashboard, hosting layer, or paid infra).

## 1. Executive summary

- **Dependency scan:** ✅ `npm audit` — no high/critical vulnerabilities.
- **Database linter:** 66 WARN findings, all one class (`SECURITY DEFINER`
  RPCs callable by anon/authenticated). Every flagged function is an
  intentional public API (search, autocomplete, trending, `has_role`,
  `is_owner`) or has an internal admin gate (`_analytics_assert_admin`).
  Recorded in `security-memory` as accepted risk.
- **Authorization:** three-layer model — UI (`usePermissions`), edge
  (`_shared/authz.ts`), Postgres RLS. Default-deny. Owner protected from
  deletion / demotion by DB triggers.
- **Audit trail:** `privileged_actions_log` written server-side via
  `log-privileged-action` so IP / UA / session cannot be spoofed.
- **HTTP hardening:** CSP, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy` shipped in `index.html`. HSTS / `X-Frame-Options`
  must be applied at the CDN/hosting layer.

## 2. Findings and mitigations

| # | Area | Finding | Severity | Mitigation |
|---|------|---------|----------|------------|
| 1 | Headers | No CSP / MIME / referrer / permissions headers | High | Added in `index.html`. HSTS + `X-Frame-Options` deferred to CDN. |
| 2 | Auth | No MFA on privileged accounts | High | **Operator action** — enable TOTP/WebAuthn in Cloud → Users → Auth Settings, then gate `access_admin_dashboard` / `access_owner_dashboard` on `user.factors.length > 0`. |
| 3 | Auth | Leaked-password (HIBP) check disabled | Medium | Toggle via `configure_auth({password_hibp_enabled:true})`. |
| 4 | Auth | No user-visible session / device list | Medium | Surface `auth.sessions` on Profile page (feature ticket). |
| 5 | RLS | 66 `SECURITY DEFINER` RPCs anon/authenticated-callable | Info (design) | Each function performs its own auth gate or is deliberately public. Documented in security memory. |
| 6 | Edge | Not every endpoint has `zod` body validation | Medium | `authorize()` gates auth; new endpoints must validate bodies with `zod` and return 400 on failure. |
| 7 | Edge | No rate limiting | Medium | **Infra gap** — Lovable Cloud has no rate-limit primitive. Add Cloudflare rate-limit rules on `/functions/v1/*`. |
| 8 | XSS | `dangerouslySetInnerHTML` usage | ✅ None | Verified via grep. |
| 9 | CSRF | Bearer-token auth (not cookies) | ✅ | Classic CSRF not applicable. |
| 10 | Secrets | Service role key exposure | ✅ None | Server-only. `.env` holds only publishable/anon key. |
| 11 | Secrets | Long-lived API keys | Info | Rotate periodically via `update_secret` / `rotate_lovable_api_key`. |
| 12 | Deps | `npm audit` high/critical | ✅ None | Re-scan monthly. |
| 13 | Errors | Some edge functions echo raw upstream error text | Low | Truncate and generic-ify; keep detail in server logs. |
| 14 | Logging | Privileged actions | ✅ | `log-privileged-action` captures IP/UA server-side. |
| 15 | Owner | Owner protection | ✅ | `protect_platform_owners`, `protect_owner_role`, `prevent_last_owner_removal` triggers. |
| 16 | Grants | Missing GRANTs on public tables | ✅ None | Every `CREATE TABLE` migration includes explicit GRANTs. |

## 3. Enforced controls (in code today)

### Authorization
- Single-source matrix in `src/lib/permissions.ts`; mirror in
  `supabase/functions/_shared/authz.ts`.
- Postgres RLS on every user-facing table
  (`profiles`, `favorites`, `watch_history`, `user_roles`,
  `moderation_*`, `channel_trust_*`, `analytics_events`, …).
- `user_roles` cannot be self-written; owner status protected by triggers
  and `is_owner()` security-definer function.

### Audit trail
- `privileged_actions_log` — actor, action, target, before/after, IP, UA,
  session, success + failure reason.
- Server-observed request headers via `log-privileged-action` edge fn.
- Append-only moderation + channel-trust event tables with dedicated
  audit UIs (`/admin/audit`, `/admin/channel-trust`).

### HTTP hardening (`index.html`)
- `Content-Security-Policy`: `default-src 'self'`, YouTube frames
  allow-listed, Supabase + Lovable AI Gateway allow-listed on
  `connect-src`, `frame-ancestors 'none'`, `object-src 'none'`,
  `upgrade-insecure-requests`.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()`

Set at CDN (cannot be delivered via `<meta>`):
`Strict-Transport-Security`, `X-Frame-Options: DENY`,
`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`.

### Input handling
- `zod` validation at form and edge boundaries.
- No `dangerouslySetInnerHTML` anywhere in the client.
- Search text is normalized server-side before Postgres full-text.

### Secrets
- `.env` holds only publishable Supabase values (public by design; RLS is
  the gate).
- Service role key, provider keys, cron tokens live in edge-function
  secrets and never enter the client bundle.

## 4. Residual work / operator actions

1. **Enable MFA (TOTP / WebAuthn)** in Cloud → Users → Auth Settings, then
   enforce for admin/owner in-app.
2. **Enable HIBP leaked-password check** via `configure_auth`.
3. **HSTS + X-Frame-Options** at the CDN.
4. **Rate limit `/functions/v1/*`** at the CDN — no in-app primitive.
5. **Rotate long-lived secrets** on a schedule.
6. **Suspicious-login detection** — feed Supabase auth logs to a sink
   (Logflare, Datadog) and alert on impossible-travel / repeat-fail.

## 5. Principle of least privilege

- [x] Anon key can only read data RLS explicitly permits.
- [x] Authenticated users can only mutate their own rows.
- [x] Admin surface is moderation-only; role/platform management is
      owner-only.
- [x] Service role key never leaves the server.
- [x] Every privileged edge fn goes through `authorize(req, permission)`.
- [x] Owner cannot be demoted or removed (DB trigger).
- [x] Every public table has RLS enabled and explicit GRANTs.

## 6. Re-running the review

```
# Deps
bunx npm audit --production
# DB linter and scanner findings run via Lovable tools:
#   supabase--linter, security--get_scan_results
# End-to-end RLS proof
bunx playwright test tests/e2e/rls-cross-user.spec.ts
```

Findings accepted as by-design are recorded in `security-memory` with
rationale so future scans do not re-open resolved risk.
