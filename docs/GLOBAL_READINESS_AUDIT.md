# Heartify — 150+ Country Readiness Audit

Scope: what is shipped today vs. what is **missing** to safely operate in 150+
countries. Complements `docs/GLOBALIZATION.md` (architecture) and
`docs/SCALING_ROADMAP.md` (infra). Every gap below is actionable.

Legend: ✅ shipped · 🟡 partial · ❌ missing

---

## 1. Localization (i18n)

| Area | Status | Gap |
|---|---|---|
| React i18n context (`LocaleCtx`) | ✅ | — |
| `user_locale_preferences` table | ✅ | — |
| String catalogue coverage | 🟡 | Only EN, AR, UR, ID, TR, FR complete. **Missing: BN, MS, HI, FA, RU, ES, PT-BR, SW, HA, DE, IT, NL, PL, TH, VI, ZH-Hant, JA, KO** (~85% of remaining reach). |
| Pluralization rules | ❌ | Using naive `count === 1` ternaries; need ICU MessageFormat (`intl-messageformat`) for AR (6 plural forms), RU (3), PL (3). |
| Gendered strings | ❌ | AR/HE/ES/FR verbs assume masculine. Add `{gender}` selector + `profiles.gender_form` (opt-in, non-PII). |
| Number/date/list formatting | 🟡 | `toLocaleString()` used ad-hoc. Centralize in `src/lib/intl.ts` with `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.ListFormat`, `Intl.RelativeTimeFormat`. |
| Hijri calendar | 🟡 | Displayed on home only. Missing on streaks, weekly recap, khatm history. Use `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')`. |
| Translator workflow | ❌ | No Crowdin/Lokalise pipeline. Strings live in `src/i18n/*.json` — no review, no fallback QA. |
| Missing-key telemetry | ❌ | Add `logMissingKey(locale, key)` → `analytics_events` for gap discovery. |
| Font subsets | ❌ | Arabic/Bengali/Thai/Devanagari glyphs not preloaded; FOUT on first paint. Add per-locale `<link rel="preload">`. |
| Locale-aware share text | ❌ | `NavigatorShare` copy is EN-only. |

---

## 2. RTL

| Area | Status | Gap |
|---|---|---|
| `dir="rtl"` on `<html>` for AR/UR/FA/HE | ✅ | — |
| Logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) | 🟡 | ~60% of components migrated. **Audit remaining**: `AudioSection`, `PlayerBar`, `Navbar`, all admin pages, `HeartifyPlus`, khatm UI. Run `rg "\b(ml-|mr-|pl-|pr-|left-|right-)"  src/` — 340+ hits. |
| Icon mirroring | ❌ | Chevrons, back arrows, progress bars don't flip. Add `.rtl\:-scale-x-100` utility and apply to directional icons. |
| Bidi text (mixed AR + numerals) | 🟡 | Add `unicode-bidi: plaintext` on user-generated content (dhikr circle names, dua bodies). |
| Slider/scrubber direction | ❌ | Audio scrubber increases left→right in RTL. |
| Toast/Sheet slide-in origin | ❌ | Radix Sheet still slides from right in RTL. |
| Form validation icons | ❌ | Error `!` renders on wrong side. |

---

## 3. Currencies & Payments

| Area | Status | Gap |
|---|---|---|
| Stripe (USD only) | 🟡 | Live but single-currency. |
| Multi-currency price table | ❌ | Need `plus_prices(country, currency, amount_minor, tax_inclusive, psp_price_id)` with **PPP-adjusted tiers** for IN, PK, BD, ID, NG, EG, TR, BR, MX, PH, VN (typically 40-60% of USD price). |
| Local payment methods | ❌ | No support for: **UPI (IN), JazzCash/Easypaisa (PK), bKash/Nagad (BD), GoPay/OVO (ID), M-Pesa (KE/TZ), Fawry (EG), iDEAL (NL), Pix (BR), Boleto (BR), OXXO (MX), Alipay/WeChatPay (CN diaspora), Klarna (EU), MADA (SA), Mada+ApplePay (GCC)**. Recommend Stripe + **Adyen or Paddle MoR** for tax handling. |
| Currency display | ❌ | `$4.99` hardcoded in `HeartifyPlus.tsx`. Use `Intl.NumberFormat(locale, { style: 'currency', currency })`. |
| Tax / VAT / GST | ❌ | No VAT ID capture (EU B2B), no GST for IN/AU/NZ/SG, no US sales-tax nexus tracking. Switch to Merchant of Record (Paddle/Lemon Squeezy) to offload. |
| Refund / chargeback locale rules | ❌ | EU 14-day cooling-off, KSA 7-day, BR CDC — need country-aware refund policy page. |
| Invoicing | ❌ | Required in BR, MX, IT, ES, TR for B2B. |
| FX rounding & psychological pricing | ❌ | Round to local anchors: ₹399, R$19,90, £3.99. |
| Sanctioned countries | ❌ | Block payment attempts from OFAC list (IR, KP, SY, CU, RU-occupied UA regions). Stripe blocks issuer, but self-serve upgrade UI still shown. |

---

## 4. Time zones

| Area | Status | Gap |
|---|---|---|
| Server times in UTC | ✅ | — |
| Client renders in local TZ via `Intl` | 🟡 | Weekly recap uses `America/New_York` for cutoff — should be user TZ. |
| Salah times | ✅ | Uses `Adhan.js` per coordinates. |
| Streak day boundary | ❌ | Fixed at UTC midnight → users in UTC+12/-12 lose streaks. Store `streaks.timezone` and compute boundary in user TZ (Fajr-based option). |
| Adhan push scheduling | ❌ | Server cron sends in UTC; must be per-user cron via `user_locale_preferences.timezone`. |
| DST transitions | ❌ | Twice-yearly duplicate/missing notifications; use IANA TZ IDs, never fixed offsets. |
| Leaderboard windows | ❌ | "Weekly" defined as UTC Mon-Sun; regionalize (Fri-Thu in MENA cultures). |
| Ramadan/Eid dates | ❌ | Hard-coded per year. Pull from `hijri-date` lib per country (SA vs. moon-sighting differences). |

---

## 5. Languages (content, not UI)

| Area | Status | Gap |
|---|---|---|
| Reciter metadata language tags | 🟡 | `reciters.language` populated for AR/EN/UR only. **Missing tagging for**: ID, TR, FR, BN, HA, SW, ML, TA, FA, RU. |
| Translated subtitles / captions | ❌ | Zero. Need `video_captions(video_id, lang, format, storage_path)` + Whisper-based auto-caption pipeline gated on reciter permission. |
| Translated Qur'an verses | 🟡 | 12 translations wired; missing: **Somali, Hausa, Swahili, Tamil, Malayalam, Uzbek, Kazakh, Pashto, Kurdish, Albanian, Bosnian**. |
| Tafsir per language | ❌ | EN + AR only. |
| Dua translations | 🟡 | 6 languages. |
| Search language detection | 🟡 | `franc-min` used; misclassifies short queries. Add fallback to user's `preferred_language`. |
| Transliteration search | ❌ | "Fatiha" vs "Al-Fātiḥah" vs "الفاتحة" not unified. Build `search_synonyms` seed for Latin transliterations across 20 languages. |

---

## 6. Content availability & geo-rights

| Area | Status | Gap |
|---|---|---|
| Country field on user | ❌ | Not captured. Infer from Cloudflare `CF-IPCountry` (edge) + allow override in profile. |
| Per-video geo-restrictions | ❌ | `curated_videos` has no `allowed_countries` / `blocked_countries` array. YouTube already blocks some; we must mirror to avoid dead embeds. |
| Reciter licensing region | ❌ | Some reciters licensed only for MENA. Add `reciters.rights_regions text[]`. |
| Content shelves per country | 🟡 | `regional_language_mix` exists; not used to reorder shelves. Wire into `recommendations` edge fn as a country-weighted booster. |
| Country-specific homepage hero | ❌ | Ramadan/Hajj/national milestones (e.g., Malaysia Merdeka, Turkey Republic Day). |
| Offline availability in low-bandwidth regions | 🟡 | Downloads exist for Plus; add **Lite mode** (audio-only, 64kbps) auto-triggered on `NetworkInformation.effectiveType === '2g'`. |
| CDN PoPs | ✅ | Cloudflare global. |
| App store availability | ❌ | Track per-country store status; not all 175 App Store countries approve religious apps (CN, VN require special review). |

---

## 7. Regional moderation

| Area | Status | Gap |
|---|---|---|
| Central moderation pipeline | ✅ | — |
| Regional madhab tolerance | ❌ | Content acceptable in Deobandi contexts may be rejected in Salafi contexts (and vice versa). Add `moderation_thresholds.region` + `region_madhab_map`. |
| Local law-based takedowns | ❌ | No workflow for gov requests (India IT Rules 2021, Turkey Law 5651, Germany NetzDG, EU DSA notice-and-action). Need `legal_takedowns` table + 24h SLA queue. |
| Regional profanity/sensitivity lexicons | ❌ | Currently English + Arabic only. Add per-language wordlists for UR, ID, TR, FR, BN, HI, RU. |
| Sect-tag transparency | ❌ | Users can't set "hide content flagged Salafi/Sufi/Shia-only". Add opt-in `user_preferences_v2.sect_filter`. |
| Human moderator coverage windows | ❌ | Currently 09:00-23:00 UTC. Follow-the-sun rota needed (Jakarta, Istanbul, London, Toronto shifts). |
| Age-appropriateness by region | ❌ | KSA/UAE 12+, EU GDPR-K 16, US COPPA 13, KR 14. Store `country_min_age` and adjust signup. |

---

## 8. Legal / regulatory requirements

| Requirement | Status | Gap |
|---|---|---|
| GDPR (EU/EEA/UK) | 🟡 | Cookie banner shipped; **missing**: DPA link, data-export tool, right-to-erasure edge fn, DPO contact, EU rep (Art. 27). |
| CCPA / CPRA (California) | ❌ | "Do Not Sell/Share" link, GPC honoring. |
| LGPD (Brazil) | ❌ | Portuguese privacy notice, DPO. |
| PIPL (China diaspora) | ❌ | Cross-border transfer disclosure if serving CN users. |
| DPDP Act (India, 2023) | ❌ | Consent artifact, Indian grievance officer. |
| PDPA (Singapore, Malaysia, Thailand) | ❌ | Similar consent + DPO. |
| KVKK (Turkey) | ❌ | Data localization ambiguity; register with VERBIS. |
| POPIA (South Africa) | ❌ | Info officer. |
| KSA PDPL | ❌ | Data localization for sensitive religious data — evaluate. |
| DSA (EU, Feb 2024) | ❌ | Statement of Reasons per moderation action, transparency report, trusted flaggers. |
| DMA (EU) | N/A | Not a gatekeeper. |
| Apple/Google religious content policies | 🟡 | Compliant, but need country-specific age ratings refresh. |
| Accessibility legal (EAA Jun 2025, ADA, AODA) | 🟡 | WCAG 2.2 AA target — see §11. |
| Export controls / sanctions | ❌ | Geoblock IR, KP, SY, CU, RU-occupied territories at Cloudflare edge. |
| Consumer contract laws | ❌ | Auto-renew disclosure (CA SB-313, DE BGB §309), 1-click cancel (FTC ROSCA). |
| Marketing consent | ❌ | CAN-SPAM (US), CASL (CA), PECR (UK), TCPA (US SMS) — no per-country checkbox logic. |
| Records of Processing (Art. 30 GDPR) | ❌ | |
| Sub-processor list page | ❌ | Public URL required. |
| Terms/Privacy translations | ❌ | English only — unenforceable in many jurisdictions (FR, QC, DE require local). |

---

## 9. Search quality (regional)

| Area | Status | Gap |
|---|---|---|
| Semantic recall (pgvector) | ✅ | — |
| Multilingual embeddings | 🟡 | Using `text-embedding-3-small`; decent multilingual but weak on BN/UR/HA/SW. Evaluate `text-embedding-3-large` or `Cohere embed-multilingual-v3` for those locales. |
| Query language detection | 🟡 | See §5. |
| Diacritic / hamza folding | ❌ | "Quran" vs "Qurʾān" vs "قرآن" — normalize via `unicode-normalize` + custom Arabic stemmer (`arabic-persian-reshaper` + `snowball-ar`). |
| Transliteration index | ❌ | Store `search_index.translit` per doc. |
| Regional recency boost | ❌ | Boost KSA-produced content for KSA users during Hajj. |
| Zero-result recovery per locale | ❌ | Suggestions only in EN. |
| Voice search | ❌ | No Whisper-backed multilingual voice input. |
| Autocomplete | 🟡 | Latin-only. Enable IME composition events for CJK/Arabic. |
| Query analytics per country | ❌ | `search_queries` lacks `country`. |

---

## 10. Regional recommendations

| Area | Status | Gap |
|---|---|---|
| Locale signal in scorer | ✅ | Wired via `regional_language_mix`. |
| Country signal | ❌ | Not passed to recommender. |
| Reciter affinity by country | ❌ | Egyptians → Egyptian reciters; Turks → Turkish qaris. Precompute `country_reciter_affinity` nightly. |
| Ramadan / Eid / Hajj boosts | ❌ | Currently uniform globally. Boost thematic content in the 30d window per country's moon-sighting. |
| Regional trending shelf | ❌ | Only global "Trending". Add `trending_by_country` mat-view. |
| Cold-start onboarding by country | 🟡 | Interest picker shows same categories worldwide. Reorder by country priors. |
| Cross-locale bleed | ❌ | AR speakers in France see Arabic content but recs still push FR. Weight by `user_locale_preferences.audio_lang` separately from UI lang. |
| Explore vs. exploit balance | 🟡 | Fixed ε=0.1; countries with smaller catalog need higher ε to avoid staleness. |

---

## 11. Cross-cutting gaps

- **Country capture pipeline**: add `profiles.country_code` (ISO-3166-1 alpha-2) populated from CF header on first request, editable in settings. Blocks §3, §6, §7, §8, §9, §10.
- **Locale QA harness**: Playwright matrix across 12 top locales × RTL/LTR × dark mode.
- **Right-to-be-forgotten worker**: user-triggered edge fn that purges from every table + storage + analytics within 30d.
- **Regional status page**: uptime per PoP (KSA, IN, ID, TR).
- **Support in local languages**: help center + email templates currently EN only.
- **Timezone-aware batch jobs**: `pg_cron` UTC only; refactor to enqueue per-TZ digests.
- **Accessibility**: audit for RTL + high-contrast + screen-reader parity (WCAG 2.2 AA / EAA).
- **Onboarding disclosure**: consent screen must be localized before we can serve EU/BR/IN traffic.

---

## Recommended shipping order

1. **Country capture + geo edge middleware** (unblocks 8 gaps).
2. **Multi-currency + Merchant-of-Record** (revenue-critical).
3. **Timezone-aware streaks + adhan** (retention-critical).
4. **RTL polish sweep + font preloads** (perception-critical for MENA/SA).
5. **Legal: GDPR data export, DSA statements, translated ToS** (EU/UK unblock).
6. **Regional recommendations (country signal + Ramadan boost)** (engagement).
7. **Search: diacritic folding + transliteration + multilingual embeddings for BN/UR/HA/SW**.
8. **Translation pipeline (Crowdin) + missing 18 UI locales**.
9. **Regional moderation (madhab tolerance + legal takedown queue + follow-the-sun)**.
10. **Local payment methods per revenue tier (UPI → Pix → GoPay → M-Pesa → JazzCash)**.
