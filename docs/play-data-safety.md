# Heartify — Google Play Data Safety Answers

Copy-paste sheet for the Play Console **Data safety** form. Every answer here
matches the app's actual runtime behavior as of 2026-07-26. Keep this doc in
sync with `docs/ios-info-plist-additions.xml` and the App Store Connect
Privacy Nutrition Label.

---

## 1. Data collection & security overview

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS / TLS everywhere; no cleartext hosts) |
| Do you provide a way for users to request that their data be deleted? | **Yes** — in-app: Profile → Export & Delete My Data; also `/legal/delete-account` |

---

## 2. Data types — declare each row below

For every row: **Collected? = Yes**, **Shared? = No** (Heartify does not sell
or share personal data with third parties for advertising). "Processing" =
"Collected." Mark each as **Required** unless noted **Optional**.

### Personal info
| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Name | Yes | Account management, personalization | Optional |
| Email address | Yes | Account management | Required |
| User IDs | Yes | Account management, analytics, fraud prevention | Required |

### Location
| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Approximate location | Yes | App functionality (prayer times, Qibla) | Optional |
| Precise location | **No** | — | — |

### Financial info
None collected. All payments handled by Google Play Billing / Apple IAP; Heartify never sees card data.

### Health & fitness
None.

### Messages
| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Other in-app messages (comments) | Yes | App functionality (community discussion) | Optional |

### Photos and videos
| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Photos | Yes | App functionality (profile picture only) | Optional |

### Audio files
| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Voice or sound recordings | **No** | — | — |

### Files and docs
None.

### Calendar
None.

### Contacts
None.

### App activity
| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| App interactions | Yes | Analytics, personalization, app functionality | Required |
| In-app search history | Yes | App functionality (recent searches) | Optional |
| Installed apps | **No** | — | — |
| Other user-generated content (playlists, favorites, dhikr counts, streaks) | Yes | App functionality, personalization | Required |
| Other actions (video watch history) | Yes | Personalization, app functionality | Required |

### Web browsing
None.

### App info and performance
| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Crash logs | Yes | Analytics, app functionality (via Sentry) | Required |
| Diagnostics | Yes | Analytics, app functionality | Required |
| Other app performance data | Yes | Analytics | Required |

### Device or other IDs
| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Device or other IDs | Yes | Analytics, fraud prevention | Required |

---

## 3. Security practices

- [x] Data is encrypted in transit (TLS 1.2+).
- [x] Users can request that their data be deleted (in-app + `/legal/delete-account`).
- [x] Committed to follow the Play Families Policy (if the app targets children — currently Kids Mode is a scoped mode, not the primary audience; mark **No** for "primarily directed to children").
- [x] Independent security review: **No** (self-attested). Set to Yes only after a third-party audit is filed.

---

## 4. Ads

- Contains ads: **No**
- Uses advertising ID: **No**

---

## 5. Data-deletion URL (required for account-based apps)

```
https://pure-heartify.lovable.app/legal/delete-account
```

(Replace with custom domain URL once live.)

---

## 6. Privacy policy URL

```
https://pure-heartify.lovable.app/legal/privacy
```

---

## 7. Target audience & content

- Target age groups: **13+** (Rated for Teen). Do NOT tick "Also target children"
  unless you complete Play Families Policy compliance.
- Ads: No
- Contains: User-generated content (comments, playlists) — moderated pre-publish.

---

## 8. App access

- All app functionality available without special access? **No** (account required for streaks, favorites, playlists).
- Provide test account credentials to Play review team via Play Console → App content → App access. Suggested:
  - Email: `play-review@heartify.app`
  - Password: (generate a strong one, rotate after approval)
  - Instructions: "Sign in on the welcome screen. No SMS/OTP required."

---

## 9. Content rating questionnaire — quick answers

- Violence: None
- Sexual content: None
- Profanity: None
- Controlled substances: None
- Gambling: None
- User-generated content: **Yes** — moderated (see `/verify` public attestation)
- Users can interact: **Yes** (comments, follows)
- Shares user location: **No**
- Shares personal info: **No**

Expected rating: **Teen / PEGI 12** (due to UGC + interaction, not content).
