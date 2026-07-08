# Global Personalization, Localization & Cross-Platform Strategy

This document defines Heartify's architecture for serving users worldwide with a
consistent halal-first experience across every supported surface.

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Client (Web / Native)                        │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │ LocaleCtx  │→ │ i18n dictionary │  │ Language settings UI     │   │
│  │ (React)    │  │ (lazy-loaded)   │  │ (Profile → Language)     │   │
│  └─────┬──────┘  └─────────────────┘  └──────────────────────────┘   │
│        │ detects: navigator.language, timezone, saved prefs           │
│        │ overrides: user selection (persisted to Cloud when signed-in)│
└────────┼──────────────────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────────────┐
│                            Lovable Cloud                              │
│  ┌───────────────────────────┐   ┌──────────────────────────────┐    │
│  │ user_locale_preferences   │   │ regional_language_mix        │    │
│  │ (per-user, RLS)           │   │ (country → language ratios)  │    │
│  └─────────────┬─────────────┘   └───────────────┬──────────────┘    │
│                │                                  │                    │
│         ┌──────▼──────────────────────────────────▼─────┐             │
│         │  gatherSignals() — recommendations edge fn    │             │
│         │  adds `locale` signal to hybrid scorer         │             │
│         └────────────────────────────────────────────────┘             │
└───────────────────────────────────────────────────────────────────────┘
```

Design principles:
- **Explicit over inferred.** Detection provides defaults only; user choice always wins.
- **No GPS.** Country is derived from timezone, `Accept-Language`, and optional user selection.
- **Modular.** i18n, locale detection, regional mix, and rec-engine locale scoring are independent.
- **Privacy-first.** Detected values are stored alongside user overrides so users see and can clear them.

## 2. Database Changes (migration `2026070809*`)

| Table                        | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `user_locale_preferences`    | per-user UI language, content languages, country, RTL, diversity |
| `regional_language_mix`      | country → JSONB language ratios, publicly readable defaults    |
| `curated_videos.content_language` | new column so ranking can boost matching languages         |

RLS:
- `user_locale_preferences`: user reads/writes own row only.
- `regional_language_mix`: anyone reads active rows; admins/owners write.

## 3. Frontend Changes

New modules under `src/i18n/`:
- `dictionaries/` — one JSON per language (en, ar, tr, bn, id, fr, de + extensible).
- `index.ts` — `t(key, fallback?, vars?)` translator + `RTL_LANGUAGES` set.
- `detect.ts` — heuristics using `navigator.language`, `Intl.DateTimeFormat().resolvedOptions().timeZone`.

New context: `src/contexts/LocaleContext.tsx`
- Detects on first load, hydrates from Cloud when authenticated.
- Applies `dir="rtl"` and `lang` on `<html>`.
- Exposes `{ locale, setLocale, preferences, updatePreferences, t }`.

New component: `src/components/LanguageSettings.tsx`
- Language picker, country picker, content-language multi-select.
- Toggle: "Auto-personalize by region".
- Diversity slider: how often to surface content outside primary language.
- Mount inside Profile page.

## 4. Backend Changes

`supabase/functions/_shared/recommendations/signals.ts`
- Reads `user_locale_preferences` and merges into the signals object as
  `contentLanguages: string[]`, `diversityLevel: number`.

`supabase/functions/_shared/recommendations/hybridRules.ts`
- New reason `language_match` (+0.10 default) fires when
  `curated_videos.content_language` ∈ `contentLanguages`.
- `diversityLevel` scales the per-language cap in the MMR re-rank so users
  keep discovering content outside their primary language.

All weights remain env-overridable (`REC_W_LANGUAGE_MATCH`).

## 5. Cross-Platform Roadmap

| Platform          | Status              | Approach                                             | Notable adaptations                                  |
| ----------------- | ------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Web (desktop)     | ✅ Live             | React 18 + Vite + Tailwind                           | —                                                    |
| Web (mobile)      | ✅ Live             | Responsive Tailwind, PWA-installable                 | Touch targets ≥44px, condensed nav                   |
| Android phone     | 🟡 Capacitor ready  | `npx cap add android`                                | Remove `server.url` for store build; splash + icon    |
| iPhone            | 🟡 Capacitor ready  | `npx cap add ios`                                    | Sign in with Apple, notification entitlements        |
| iPad              | 🟡 Capacitor ready  | Universal binary                                     | Layout ≥768px, split-view friendly, keyboard hooks   |
| Android tablet    | 🟡 Capacitor ready  | Same build as phone                                  | Two-pane layouts on ≥600dp                           |
| Apple Watch       | 🔴 Future           | Native SwiftUI companion via App Group + Watch Connectivity | Reminders, streaks, Daily Dose summary, quick audio controls — no video browsing |
| Wear OS           | 🔴 Future           | Native Kotlin/Compose Wear companion                 | Same feature scope as Apple Watch                    |
| Android TV        | 🔴 Future           | Native Leanback UI reusing catalog APIs              | 10-ft UI, D-pad nav, focus-first components          |
| Apple TV          | 🔴 Future           | tvOS SwiftUI reusing catalog APIs                    | Focus engine, top shelf, Siri Remote gestures        |

**Companion-first for wearables**: The Apple Watch / Wear OS apps are
lightweight surfaces (notifications, streaks, quick playback controls, Daily
Dose glance). They do NOT try to render the full catalog.

**TV as read-only surface**: Android TV & tvOS re-use the recommendation and
catalog APIs, add a focus-friendly grid and full-screen player. No login
required to browse; sign-in via short code + web fallback.

## 6. App Store Considerations

- **Sign in with Apple**: required if any social sign-in is offered on iOS.
- **Kids category**: separate build/target or age-gated onboarding.
- **In-app account deletion**: required by Apple; already tracked on the launch punch list.
- **Data safety / privacy nutrition label**: enumerate every collected signal (locale detection included).
- **Content moderation transparency**: link to `docs/MODERATION_PIPELINE.md`.

## 7. Scalability Considerations

- Dictionaries lazy-loaded per language — initial bundle unaffected.
- `regional_language_mix` is a tiny, cacheable table (`Cache-Control: 1h`).
- `curated_videos.content_language` is indexed for fast filtering.
- Recommendation locale signal is O(1) per candidate — no extra DB round-trips.
- Future: move dictionaries to CDN + hash-based cache-busting.

## 8. Estimated Effort

| Workstream                                | Effort |
| ----------------------------------------- | ------ |
| i18n framework + first 7 languages        | ~3 d   |
| Locale context + settings UI              | ~2 d   |
| Recommendation locale signal + eval       | ~2 d   |
| Content-language backfill (existing catalog) | ~3 d |
| Apple Watch companion (MVP)               | ~10 d  |
| Wear OS companion (MVP)                   | ~10 d  |
| Android TV app (MVP)                      | ~15 d  |
| Apple TV app (MVP)                        | ~15 d  |

## 9. Rollout Plan

1. **Ship now** (this PR): DB schema, i18n framework, LocaleContext, language settings UI, recommendation locale signal.
2. **Next sprint**: translate onboarding, notifications, categories to top 7 languages; backfill `content_language`.
3. **Beta**: Turkey + Bangladesh + Indonesia + France + Germany cohorts, A/B test regional mix.
4. **Post-launch**: Apple Watch companion → Wear OS → Android TV → Apple TV.
5. **Continuous**: adjust regional mix ratios from actual watch behavior.

## 10. Privacy

- Users can disable auto-personalization with one toggle.
- Detected language / country stored in the user's own row, visible to them.
- No third-party geo-IP calls; detection is client-side.
- Language preferences editable at any time from Profile.
- Recommendation reasons include `language_match` so users see *why* content ranked.
