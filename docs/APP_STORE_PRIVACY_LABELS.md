# App Store — Privacy "nutrition label" answer sheet

Enter in **App Store Connect → App Privacy**. Mirrors the shipping build and
`ios/App/App/PrivacyInfo.xcprivacy` (template: `docs/privacy-info.xcprivacy`).
The two must agree or review flags the discrepancy.

**Tracking:** Heartify does **not** track users across apps or websites.
Answer "No" to tracking, and declare **no** tracking domains. No ATT prompt is
required and none is shown.

## Data collected

| Data type | Collected | Linked to user | Used for tracking | Purposes |
| --- | --- | --- | --- | --- |
| Email address | Yes | Yes | No | App Functionality (account) |
| User ID | Yes | Yes | No | App Functionality, Personalization |
| Product interaction | Yes | Yes | No | App Functionality, Analytics, Personalization |
| Crash data | Yes | No | No | App Functionality (diagnostics) |
| Performance data | Yes | No | No | App Functionality (diagnostics) |
| Coarse location | No | — | — | Prayer times/Qibla are computed on device; coordinates are not stored server-side |
| Purchase history | Yes | Yes | No | App Functionality (membership entitlement) |
| Contacts, photos, audio, health, financial info, sensitive info, browsing history, search history, advertising data | No | — | — | Not collected |

## Other App Privacy answers

| Question | Answer |
| --- | --- |
| Privacy policy URL | https://www.heartifyapp.com/privacy |
| Account deletion available in app | Yes — Settings → Account → Delete account |
| Data used to build advertising profiles | No |
| Data brokers / third-party ad networks | None |
| Third-party SDKs collecting data | Backend (auth, database, analytics) operated on our behalf as a processor |
| Encryption export compliance (`ITSAppUsesNonExemptEncryption`) | `false` — only standard HTTPS/OS crypto |
| Age rating | 12+ (infrequent/mild references in historical educational content); no objectionable content |
| Kids Category | Not selected |

## Reviewer notes to paste into "App Review Information"

> Heartify is a halal-only educational video platform. All content passes a
> multi-stage moderation pipeline before it can be served; there is no
> unfiltered feed, no advertising, and no cross-app tracking. Location is used
> only on-device for prayer times and Qibla. Membership (Heartify Plus) unlocks
> extra learning tools; all core content is free. Test credentials and steps
> for creator/admin surfaces are in the notes field below.

## Only the account holder can do these

- Apple Developer Program enrollment, identity/business verification.
- Banking and tax agreements (required before paid membership can go live).
- Signing certificates, provisioning profiles, App Store Connect submission.
- Copyright/trademark ownership attestations.
