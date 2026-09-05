# Localization & Language Relevance

Two separate concerns: **UI translation** and **content language relevance**.

## UI translation

18 locales under `src/locales/`, resolved in `LocaleContext.tsx`. RTL
(Arabic, Urdu) flips via Tailwind logical properties, not mirrored CSS. Manual
selection is pinned in `heartify-locale-pinned` so a location lookup can never
silently overwrite a user's choice.

## Content language relevance

Centralized in `src/lib/languageRelevance.ts` (eligibility + weighting) and
`src/lib/languageBalance.ts` (share allocation). There is no large hard-coded
country→language matrix; region is one contextual signal among several.

Signals, in priority order:

1. **Explicit user language preferences** — always dominant. Selecting
   Indonesian makes Indonesian eligible and well-ranked anywhere.
2. **App/device language.**
3. **Demonstrated behaviour** — languages the user actually watches.
4. **Subtitles/translations/transcripts** — makes otherwise foreign content
   eligible.
5. **Region/country** — contextual prior only (e.g. Bangladesh → Bangla and
   English lean), never a hard filter.
6. **Content-language confidence** — low confidence is downweighted, not
   blocked.
7. **Relevance and quality.**

Languages with no supporting evidence are downranked, never hard-blocked, so
legitimate content stays discoverable. Thin supply in a preferred language
falls back to the next eligible language rather than emptying the feed.

## Tests

`src/test/language-relevance-global.test.ts` and `src/test/language-balance.test.ts` covers Bangladesh, India,
Pakistan, Indonesia, Malaysia, Turkey, Saudi Arabia, UAE, United States and
United Kingdom, with multiple profiles per market (default prefs, explicit
multilingual prefs, cross-language behaviour, subtitled content, low- and
high-confidence detection). Assertions verify: explicit preference beats the
geographic default, irrelevant languages are downranked, multilingual content
remains discoverable, and nothing legitimate is hard-blocked.
