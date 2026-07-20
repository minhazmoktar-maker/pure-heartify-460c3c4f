# Heartify — Notification Policy

_Last updated: 2026-07-20_

Heartify is a **calm, halal-first** platform. Notifications exist to serve the
user's spiritual and learning goals — not to maximize watch time. Every
notification we send must satisfy this policy.

---

## 1. Guiding principles

1. **Consent, always.** No push, email, or system notification is ever sent
   without an explicit user opt-in.
2. **Contextual asks only.** We never prompt for OS notification permission on
   first load or during onboarding. Prompts appear **after** a meaningful
   user gesture (e.g. bookmarking a video, enabling a prayer reminder).
3. **Cap over volume.** The user's inbox is sacred: hard cap of **3 push
   notifications per user per rolling 7 days**, enforced server-side.
4. **Preference-first.** Users can silence any category from
   `Settings → Notifications` — server functions honor
   `notification_preferences.push_enabled = false` before dispatch.
5. **In-app fallback.** If the push cap is exceeded (or the user has no push
   surface), high-signal events still surface in the in-app bell.
6. **No dark patterns.** No "you're missing out" language, no scary red
   badges, no "1000+" counts, no re-prompting once denied.

---

## 2. Contextual permission flow

We do **not** call `Notification.requestPermission()` on page load,
navigation, or during onboarding.

The OS permission prompt fires only after:

| Trigger                                  | Reason surfaced        |
| ---------------------------------------- | ---------------------- |
| Signed-in user bookmarks a video         | `favorite`             |
| User enables a prayer/adhān reminder     | `prayer`               |
| User starts a streak recovery flow       | `streak`               |
| User clicks "Enable" in Notif. settings  | `generic`              |

Mechanism: `requestContextualPush(reason)` in
`src/components/PushPermissionPrompt.tsx` dispatches a soft in-app sheet.
The OS-level `Notification.requestPermission()` call is bound to the user's
confirming click **inside that sheet**, satisfying browser user-gesture
requirements.

**Back-off rules**

- If the user taps "Not now" → suppress the sheet for **14 days**.
- If the OS returns `denied` → **never** re-prompt in-app. Direct users to
  browser settings via `Settings → Notifications`.
- If the OS returns `granted` → subscribe to Web Push and stop asking.

---

## 3. Server-side cap (3 / 7 days)

Enforced by `supabase/functions/_shared/pushCap.ts` and called by every
push-sending Edge Function.

### Counting rule

```
COUNT(*) FROM user_notifications
WHERE user_id = :uid
  AND data->>'channel' = 'push'
  AND created_at >= now() - interval '7 days'
```

- Rows with `data->>'channel' = 'in_app'` (or absent) **do not** count.
- Admin-originated pushes count — the cap protects the user, not the sender.
- The check runs **before** dispatch. If `count >= 3`, the push is skipped
  and (where applicable) an in-app notification is written instead.

### Enforced by

| Function                              | Behavior on cap hit                            |
| ------------------------------------- | ---------------------------------------------- |
| `send-push`                           | Returns `429 push_cap_exceeded`, no FCM call.  |
| `notify-favorites`                    | Falls back to `queued`, no FCM call.           |
| `notify-streak-risk`                  | In-app-only row inserted, `data.channel='in_app'`. |

### Recording sends

After a successful FCM dispatch, callers **must** insert a
`user_notifications` row with `data.channel = 'push'` (use
`recordPushSend()`), so the cap counts consistently across surfaces.

### Failure mode

If the cap query fails, the helper returns `ok: false` (**fail closed**) —
we would rather miss a push than exceed the user's cap.

---

## 4. Channels & categories

| Kind             | Default push | Default email | Default in-app | Cap-eligible |
| ---------------- | ------------ | ------------- | -------------- | ------------ |
| `daily_dose`     | ✅           | ❌            | ✅             | ✅           |
| `streak_risk`    | ✅           | ❌            | ✅             | ✅           |
| `prayer_time`    | ✅           | ❌            | ✅             | ✅ (see 4.1) |
| `favorites_digest` | ❌         | ❌            | ✅             | ✅           |
| `khatm`          | ❌           | ❌            | ✅             | ✅           |
| `dua_ameen`      | ❌           | ❌            | ✅             | ✅           |
| `social`         | ❌           | ❌            | ✅             | ✅           |
| `weekly_recap`   | ❌           | ✅            | ✅             | ✅           |

### 4.1 Prayer times

Prayer alerts are **local** (client-scheduled via the OS/Capacitor local
notifications API) and therefore **not** counted against the 3/7d server
cap. They are still governed by the user's `prayer_time` preference and
by the OS-level notification permission.

---

## 5. What we will never do

- Send a push to a user who has not granted OS permission.
- Show a native permission dialog on page load or during onboarding.
- Send more than 3 pushes / 7 days regardless of urgency.
- Retry a permission prompt after the OS reports `denied`.
- Include tracking pixels or read-receipts in email notifications beyond
  standard delivery telemetry.
- Send marketing, upsell, or fundraising pushes.
- Wake a user's device outside their configured quiet hours (roadmap:
  add per-user quiet-hours in `notification_preferences`).

---

## 6. Admin & compliance

- All privileged sends (admin → user push) are logged in
  `privileged_actions_log`.
- Users may request full deletion of their notification history via the
  existing data-export/deletion flow (see `docs/RETENTION_PURGE.md`).
- This policy is versioned in-repo. Any change must ship with an updated
  `Last updated` date and a note in `docs/CHANGELOG.md` if it exists.
