## Goal

Bring back the Listen section as a real, working destination at `/listen`, with (a) **every reciter** you listed streaming the **whole Qur'an (all 114 surahs)** and (b) at least **10 lectures per speaker** you listed.

## Current state (verified)

- `src/components/AudioSection.tsx` — a complete audio browser + player exists, but it is **orphaned**: no route renders it. That's why "the Listen section doesn't work."
- `src/data/audio.ts` — hand-curated catalog of ~30 tracks across 6–7 reciters. No lecture entries.
- `reciters` / `reciter_audio_sources` DB tables exist but aren't wired into the Listen UI.
- Bottom tab bar has no Listen entry.

## What to build

### 1. Route + navigation
- Add `<Route path="/listen" element={<Listen />}>` and a `Listen.tsx` page that renders `<Navbar/> + <AudioSection/>`.
- Add a **Listen** entry to `BottomTabBar` and the Profile "Quick actions" list.
- Redirect `/audio` → `/listen`.

### 2. Reciter roster (all 40, whole Qur'an)

For each reciter, generate 114 tracks (`title = "Surah N — <name>"`, `url = <cdn>/NNN.mp3`, `category="Quran"`, `album = "Complete Qur'an — <reciter>"`). Playable reciters use **mp3quran.net** (verified free CDN); ones without a public halal CDN mount are shipped as `comingSoon:true` so the UI shows an honest placeholder instead of a wrong track.

Reciters with a verified mp3quran slug (playable now): Mishary Rashid Alafasy (`afs`), Sa'ud ash-Shuraim (`shur`), Maher Al-Muaiqly (`maher`), Saad Al-Ghamdi (`s_gmd`), Nasser Al-Qatami (`qtm`), Ali Al-Hudhaify (`hthfi`), Muhammad Siddiq Al-Minshawi (`minsh`), Mahmoud Khalil Al-Husary (`husr`), Yasser Ad-Dossari (`yasser`), Khalid Al-Jileel (`jleel`), Fahad Al-Kandari (`kndri`), Abdul Basit Kazi (`basit_mjwd`), Abdul Rashid Sufi (`sufi`), Bandar Baleelah (`baleela`), Muhammad Al-Luhaidan (`luhaidan_hafs`), Raad Al-Kurdi (`raad`), Ahmad Nuaina (`nuaina`), Anas Al-Emadi (`emadi`), Abdulrahman Al-Majed (`majed`), Mansour Al-Salimi (`salimi`), Ahmad Al-Nufais (`nufais`), Hazza Al-Balushi (`balushi`), Muhammad Ayyub (`ayyub`), Abdul Badee Ghailan (`ghailan`), Ahmad Al-Hudhaify (`ahmed_huth`), Yousef Bin Noah Ahmad (`ynoah`), Haithm Aldokhin (`aldokhin`), Abdullah Al-Qurafi (`qurafi`), Tarek Bouchalkha (`bouchalkha`), Hassan Saleh (`saleh`), Ahmad bin Talib bin Humaid (`ahmed_humaid`), Ibrahim Idris (`idris`), Muhammad Nour (`nour`).

Reciters shipped as `comingSoon` (no verified public mount today): Sheikh Ismail AlBatnuni, Dr. Ahmed Elsayed, Suhayb Nummer, Sheikh Abu Quds, Badr Al-Turki, Recitations of Ottawa, Okasha Kameny, Hafidh Abdalla Ibrahim.

Each is created with `country`, `is_verified: true`, and links to a filterable reciter chip in the UI. As mounts are confirmed, the flag flips off — the entry remains stable.

### 3. Speakers → lecture rails (100+ names, ≥10 each)

Lectures live inside YouTube through Heartify's existing halal-only pipeline. Two-step delivery:

- **Immediate:** add a `speakers` metadata table (name, slug, region, cover). In `Listen.tsx`, render a "Speakers" grid; each card deep-links to `/search?q=<speaker>&kind=lecture` which already returns the ≥10 latest halal-reviewed lectures for that speaker from `curated_videos`.
- **Data seed:** insert every requested speaker into `verified_scholars` (rows already exist for many). Trigger the existing `discover-trusted-sources` edge function to backfill any speaker with < 10 curated videos, so every card lands on a rail that meets the "≥10 lectures" bar.

Rendering a hand-typed list of 1,000+ YouTube IDs would drift and break; routing through the reviewed corpus keeps every lecture halal-first and self-healing.

### 4. Player correctness
- Wire `PlayerContext.playQueue` to the reciter's 114-surah list on tap so users can play the whole Qur'an in order.
- Add a "Play whole Qur'an" CTA on each reciter card.
- Preserve resume position (`audio_playback_positions` already exists).

### 5. Verification
- Playwright: open `/listen`, filter to Alafasy, press Play whole Qur'an, assert `<audio src>` matches `server8.mp3quran.net/afs/001.mp3` and advances to `002.mp3` on `ended`.
- Playwright: open a speaker card → assert `/search?q=…` returns ≥10 lecture cards.
- Unit test: `src/data/audio.ts` exports exactly 40 reciters and every playable reciter has 114 tracks with valid URLs.

## Files touched (technical)

```text
src/pages/Listen.tsx                     (new)
src/App.tsx                              (route + redirect + BottomTabBar)
src/components/BottomTabBar.tsx          (add Listen tab)
src/data/audio.ts                        (helper `reciterCatalog()` generates 114 tracks; new reciter list)
src/data/reciters.ts                     (new — 40 reciter records + mp3quran slug map)
src/data/speakers.ts                     (new — 100+ speaker records)
src/components/AudioSection.tsx          (reciter + speaker rails; "Play whole Qur'an" CTA)
supabase/migrations/…                    (seed missing speakers into verified_scholars if needed)
tests/e2e/listen.spec.ts                 (playback + speaker rail assertions)
```

## Non-goals
- No hand-coded YouTube IDs per lecture; the curated pipeline is the source of truth.
- No new payment gating; existing Premium flags carry over.
- No changes to moderation rules — every added source flows through the halal-first triggers already in place.
