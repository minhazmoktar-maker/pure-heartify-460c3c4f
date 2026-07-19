# Corpus Audit & Discovery Strategy — July 2026

Complete measurement of Heartify's approved content ecosystem, gap analysis, and a scalable discovery roadmap to reach 10k–25k channels / 500k–2M videos while preserving halal-first moderation.

All numbers below come from live production SQL, not estimates. Re-run the queries in `scripts/audit-corpus.sql` (or the psql block at the bottom of this doc) to reproduce.

---

## 1. Corpus at a glance

| Metric | Current | 12-month goal | Gap |
|---|---:|---:|---:|
| Approved videos | **31,821** | 500k–2M | **16×–63×** |
| Distinct approved channels (from videos) | **169** | 10k–25k | **60×–150×** |
| `approved_channels` table entries | (see section 4) | 10k–25k | — |
| Candidate pipeline — pending | 1,379 | rolling ~5k | 3.6× throughput |
| Candidate pipeline — approved | 199 | — | pipeline underused |
| Trusted institutions catalog | **6** | 500+ | 83× |
| Verified scholars catalog | **0** | 2,000+ | ∞ |
| Videos published in last 7 days | **100** (0.31%) | 5–10% | 15×–30× |
| Videos published in last 30 days | 413 (1.30%) | 15–20% | 12×–15× |

Freshness is a symptom, not the disease: the ingestion cron is healthy — the *channel base* is too narrow, so there simply aren't enough recent uploads to draw from.

---

## 2. Creator concentration — critical

Herfindahl-Hirschman Index (HHI × 10,000): **699**
(A market with HHI > 250 is "concentrated" by DoJ standards; > 1,500 is "highly concentrated". Ours sits mid-range only because we have 169 channels total — with a healthy 10k+ base the same top-channel volume would push HHI below 50.)

### Top 10 channels dominate 78% of the corpus

| Rank | Channel | Videos | Share |
|---:|---|---:|---:|
| 1 | Yufid.TV | 3,841 | **12.07%** |
| 2 | Ustadz Abdul Somad Official | 3,622 | 11.38% |
| 3 | Dr Zakir Naik | 3,167 | 9.95% |
| 4 | Muslim Central | 2,483 | 7.80% |
| 5 | Adi Hidayat Official | 2,435 | 7.65% |
| 6 | Khan Academy | 2,171 | 6.82% |
| 7 | Yaqeen Institute | 2,131 | 6.70% |
| 8 | TED | 2,123 | 6.67% |
| 9 | আলোর পথ | 1,739 | 5.47% |
| 10 | İhsan Şenocak | 1,143 | 3.59% |
| — | **All others (159 channels)** | 6,966 | **21.9%** |

**Consequence:** every non-personalized surface (Home fresh, trending, category rows) statistically must show the same 10 creators to any user. The runtime `perChannelCap` (2 per section) mitigates the symptom, but the underlying pool cannot deliver diversity that isn't in it.

---

## 3. Category concentration — critical

| Category | Videos | Share | Health |
|---|---:|---:|---|
| Islamic | 8,444 | 26.54% | ✓ |
| Education | 6,738 | 21.17% | ✓ |
| Quran | 6,441 | 20.24% | ✓ |
| Business | 5,054 | 15.88% | ✓ |
| Spirituality | 2,021 | 6.35% | ✓ |
| Lectures | 936 | 2.94% | ⚠ thin |
| Adhan | 698 | 2.19% | ⚠ thin |
| Dawah | 623 | 1.96% | ⚠ thin |
| Kids & Family | 278 | 0.87% | ✗ starved |
| Self-Improvement | 170 | 0.53% | ✗ starved |
| Fiqh | 156 | 0.49% | ✗ starved |
| Podcasts | 142 | 0.45% | ✗ starved |
| Nasheeds | 45 | 0.14% | ✗ starved |
| Health & Fitness | 42 | 0.13% | ✗ starved |
| Lifestyle | 33 | 0.10% | ✗ starved |

Top 4 categories carry **84%** of the corpus. Ten of fifteen categories cannot fill a single scrollable row without repeating the same 2–5 channels.

### Section-level coverage (visible on Home)

| Section | Video count |
|---|---:|
| islamic-knowledge | 20,519 |
| intellectual | 4,991 |
| science-documentaries | 2,609 |
| top-100 | 2,149 |
| dawah | 559 |
| academic-fiqh | 253 |
| technology-ai | 237 |
| family-kids | 217 |
| community-podcasts | 163 |
| podcasts | 47 |
| elite-recitation | 30 |
| news-current-affairs | 22 |
| islamic-history | 19 |
| daily-picks / live-streams / advanced-learning / study-focus / revert-stories | ≤ 2 |

**Empty sections** (0 rows via direct `section_id`; fed only by category-alias fallback): `quran-recitations`, `recitation-tranquility`, `nasheeds`, `business-money`, `halal-finance`, `lectures-scholars`, `halal-lifestyle`, `health-fitness`, `intellectual-podcasts`, `hidden-gems`, `revert-stories`.

---

## 4. Language & geography — critical gaps

| Language | Videos | Share | Muslim pop. proxy | Assessment |
|---|---:|---:|---|---|
| English | 15,936 | 50.08% | — | over-indexed |
| Indonesian | 9,847 | 30.94% | 240M | over-indexed |
| (null / undetected) | 2,340 | 7.35% | — | backfill needed |
| Bengali | 2,271 | 7.14% | 165M | roughly appropriate |
| Turkish | 1,144 | 3.60% | 80M | under-served |
| Arabic | 272 | 0.85% | 420M native + all salah | **catastrophically under-served** |
| Russian | 10 | 0.03% | 20M | absent |
| Tamil | 1 | 0.00% | 6M | absent |

### Languages with **zero** coverage

Urdu (230M), Malay (30M), French (10M), Spanish (2M+ reverts / LatAm), Farsi (110M), Pashto (60M), Hausa (60M), Swahili (70M), German (5M+), Chinese, Korean, Japanese, Portuguese.

The i18n dictionaries added in Phase 6 support 18 UI languages, but the content pool serves only 7 languages, and only 4 with meaningful depth. **A Pakistani, Iranian, Malaysian, Nigerian, or Francophone user opening Heartify today receives a feed that is effectively empty in their language.**

---

## 5. Institutional & scholar graph — nearly absent

* `trusted_institutions`: **6 rows**. Should hold a curated registry of universities (Al-Azhar, Madinah, Umm al-Qura, Zaytuna, Cambridge Muslim College, IIUM, Darul Uloom Deoband, Nadwatul Ulama, ISNA, AlMaghrib, Bayyinah, etc.) — hundreds of legitimate entities.
* `verified_scholars`: **0 rows**. Table exists, has never been populated. This is what powers author-level trust boosts, scholar-page routing, and the "Verified" badge in the UI. **Non-functional today.**

---

## 6. Educational-field coverage — audit summary

Compared against the intended taxonomy (Aqidah, Fiqh, Usul al-Fiqh, Tafsir, Hadith, Sirah, Islamic history, Arabic language, Tajwid, Qira'at, Islamic finance, Islamic ethics, comparative religion, Muslim family, parenting, Muslim mental health, Islamic economics, dawah methodology, contemporary issues, science & faith, entrepreneurship, productivity, language learning, math, coding, medicine …):

* **Well covered:** general Islamic lectures, general dawah, secular STEM (via Khan/MIT/TED), Quran recitation (Indonesian & English dominant).
* **Under-covered:** Tafsir, Hadith science, Usul al-Fiqh, Sirah in depth, Tajwid instruction, Qira'at variants, Islamic finance beyond Business bucket, Muslim mental health, parenting, marriage, revert onboarding, women's fiqh (from qualified female scholars), Islamic history by region, contemporary fatwa, halal science content, Muslim scientists.
* **Missing entirely:** Arabic language instruction, Islamic art & calligraphy, halal cooking, Muslim travel/hajj-umrah education, adhkar tutorials, khutbah archives from major mosques, scholarly debate/munazara, tazkiyah (spiritual purification) course-style content.

---

## 7. Discovery pipeline — current throughput

* Candidates in `channel_candidates`: **4,352** total (1,379 pending, 199 approved, 2,767 rejected, 7 sampling).
* Approval rate: 199 / (199+2,767) = **6.7%** of decided candidates.
* The `trust_tier` column referenced in earlier phases does **not exist** on `channel_candidates` — the column is `tier` (nullable). Tier-based promotion logic across `discover-channels`, `channel-pipeline`, and `/admin/channel-pipeline` is silently degrading to null-tier behavior.
* `discovery_seeds`, `discovery_topic_queries`, and `discovery_quota_ledger` exist and are wired, but only one crawler (`ingest-videos-discovery-1h`) actively feeds them.

---

## 8. Scalable discovery strategy

To reach **10k–25k channels / 500k–2M videos** without diluting halal-first standards, we need **seven parallel discovery lanes**, each with its own quota, confidence model, and audit trail. All lanes write to the same `channel_candidates` funnel and inherit the confidence-tiered moderation pipeline (A/B/C/D).

### Lane 1 — Trusted-source discovery (highest signal)

**Input:** curated seed list of ~500 institutions and ~2,000 verified scholars.
**Method:** for each institution/scholar, resolve its official YouTube channel via handle, official website `<link>` tags, or Wikidata cross-reference. Auto-promote to Tier A on match. Insert into `trusted_institutions` / `verified_scholars` with citation URL and approving admin id.
**Expected yield:** 2,000–3,000 A-tier channels within 60 days.
**Safeguard:** every insert requires a citation URL and reviewer id — never a lone LLM output.

### Lane 2 — Institutional graph expansion

**Input:** each Tier A institution's own affiliate list (staff, alumni scholars, department channels, campus lecture series, translated-content channels).
**Method:** scrape the institution's official directory (Firecrawl `map` + targeted `scrape`), match names against verified scholars, seed related channels.
**Expected yield:** 3–8 downstream candidates per institution → 4,000–8,000 channels.
**Safeguard:** graph depth capped at 2 hops from a Tier A seed; every hop logged in `channel_audit_log`.

### Lane 3 — Multilingual expansion (the biggest single gap)

**Input:** one seed list per target language (Urdu, Malay, French, Spanish, Farsi, Pashto, Hausa, Swahili, German, Portuguese, Chinese, Russian, Tamil) — each seed is a short list of universally-recognized channels in that language plus known scholar names.
**Method:** per-language topic queries fed into `discovery_topic_queries` with locale-specific YouTube API `regionCode` and `relevanceLanguage`. Store detected language on both the candidate and — after promotion — every ingested video (fixing today's 7.35% null rate).
**Quota:** dedicated daily quota slice per language (see Lane 7).
**Expected yield:** 500–2,000 channels per major language over 6 months.
**Safeguard:** language-specific reviewers required for Tier C. Never auto-approve non-English content until we have ≥ 3 native-speaking reviewers on staff.

### Lane 4 — Topic/niche expansion

**Input:** the educational-field gaps in section 6, expressed as ~300 canonical topic queries per language (Tafsir Ibn Kathir, Sahih al-Bukhari sharh, Tajwid basics, Islamic finance ETFs, marriage counselling halal, parenting Islam, Arabic grammar basics, revert stories, hajj step-by-step, halal cooking, Muslim entrepreneurship …).
**Method:** each query stored in `discovery_topic_queries` with expected category and language. Crawl paginated results, dedupe via `channel_candidates.duplicate_risk`, tier per confidence.
**Expected yield:** 5–15 net-new channels per query → 5,000–15,000 candidates.
**Safeguard:** every query has an owner (admin id) and a rationale field — auditable, reversible by rejecting the query.

### Lane 5 — Related-channel graph crawl

**Input:** every Tier A/B channel already in the pool.
**Method:** for each seed channel, pull "featured channels" / "channels this creator recommends" (public YouTube data) → surface as candidates with a `source_channel_id` reference so we can trace provenance. Weight the candidate's initial `confidence` by the seed's own trust tier.
**Expected yield:** 3–10 candidates per seed × 10k seeds = 30k–100k raw candidates (most will dedupe or downgrade).
**Safeguard:** never auto-promote from graph crawl alone. Requires either an independent Lane 1/2 confirmation or reviewer approval.

### Lane 6 — User-signal discovery (long-tail)

**Input:** anonymized user searches that return zero results, plus channel names appearing in user comments (once comments are volume-safe).
**Method:** aggregate weekly, submit as candidates with `source='user_signal'`. Never expose the requesting user.
**Expected yield:** 100–500 channels/month, high long-tail quality because it reflects real demand.
**Safeguard:** all user-signal candidates start at Tier D (manual review only). No auto-approval regardless of confidence.

### Lane 7 — Automatic discovery orchestrator

The daily YouTube API quota is finite. Allocate it explicitly:

| Lane | Daily quota share | Rationale |
|---|---:|---|
| Trusted-source (L1) | 15% | Highest ROI per unit |
| Institutional graph (L2) | 15% | Compounding value |
| Multilingual (L3) | 30% | Largest gap, hardest to backfill |
| Topic expansion (L4) | 20% | Fills educational fields |
| Graph crawl (L5) | 10% | Broad but noisy |
| User-signal (L6) | 5% | Small volume, high specificity |
| Reserve (freshness re-check on existing channels) | 5% | Freshness lifeline |

Store allocations in `discovery_quota_allocations` (table exists). `discovery_quota_ledger` tracks daily spend. When a lane exhausts its share, it pauses until the next cron tick — protects the whole system from any one lane starving the others.

---

## 9. Moderation guardrails (non-negotiable)

Every lane above funnels into the same tiered pipeline. **No changes to halal standards.** The only difference is *scale*:

* **Tier A (98–100 confidence):** auto-approve, but only when confidence is derived from ≥ 2 independent signals (e.g., trusted-source match + institutional graph). Never from a single crawler score.
* **Tier B (90–97):** auto-approve up to N videos (`clean_samples ≥ required_samples`), then reviewer confirms channel.
* **Tier C (70–89):** always reviewer-decided. No auto action.
* **Tier D (< 70) / user-signal / graph-only:** reviewer-decided, additional cluster check via `moderation_clusters` to spot coordinated spam.
* **Uncertain / language reviewer unavailable / cluster hit:** escalate to `pending`, never auto-approve.

Every decision — approval, rejection, tier change, seed insertion — writes to `channel_audit_log` and `channel_moderation_decisions` with actor id, timestamp, and reversal metadata. **Everything is auditable and reversible.**

---

## 10. 90-day execution plan

| Week | Deliverable | Owner |
|---|---|---|
| 1 | Restore `trust_tier` column on `channel_candidates` (currently missing, breaking tier logic). Backfill from `tier`. Migration + backfill in the same PR. | Platform |
| 1–2 | Seed `verified_scholars` with the top 500 globally recognized scholars (citation-required). Seed `trusted_institutions` up to 200. | Content ops |
| 2–4 | Build Lane 1 crawler (`discover-trusted-sources`) and Lane 2 crawler (`discover-institutional-graph`). Ship behind `moderation_state='pending'` so nothing goes live without review. | Platform + moderation |
| 3–6 | Ship Lane 3 multilingual crawler; onboard 3 native-speaker reviewers (Urdu, Arabic, Malay). | Ops |
| 4–8 | Ship Lane 4 topic expansion; author the initial 300-query catalog per language. | Content ops |
| 6–10 | Ship Lane 5 graph crawler with Lane 1/2 corroboration requirement. | Platform |
| 8–12 | Ship Lane 6 user-signal aggregator + Lane 7 quota orchestrator (`orchestrate-discovery-daily` cron). | Platform |
| Ongoing | Weekly re-run of this audit, appended to `docs/PRODUCTION_AUDIT.md` under "Corpus health". | Everyone |

### Success metrics (measure weekly)

* Approved channels: **169 → 2,000 (day 90) → 10,000 (day 365)**
* HHI × 10,000: **699 → < 200** by day 90
* Top-10 share: **78% → < 40%** by day 90, **< 20%** by day 365
* Non-English/Indonesian share: **18% → 40%** by day 180
* Languages with ≥ 500 videos: **4 → 10** by day 180
* Verified scholars: **0 → 2,000** by day 365
* Weekly reviewer decisions: baseline TBD → ≥ 500

---

## Appendix — reproduce this audit

```sql
-- Totals
SELECT
  count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved') AND is_hidden=false AND is_archived=false) AS approved_videos,
  count(DISTINCT channel_id) FILTER (WHERE moderation_state IN ('approved','auto_approved') AND is_hidden=false AND is_archived=false) AS distinct_channels
FROM curated_videos;

-- Creator concentration + HHI
WITH s AS (
  SELECT channel_title, count(*)::float / sum(count(*)) OVER () AS share
  FROM curated_videos
  WHERE moderation_state IN ('approved','auto_approved') AND is_hidden=false AND is_archived=false
  GROUP BY channel_title
) SELECT round((sum(share*share)*10000)::numeric, 2) AS hhi, count(*) AS channels FROM s;

-- Category & language distributions
SELECT category, count(*) FROM curated_videos WHERE moderation_state IN ('approved','auto_approved') AND is_hidden=false AND is_archived=false GROUP BY 1 ORDER BY 2 DESC;
SELECT content_language, count(*) FROM curated_videos WHERE moderation_state IN ('approved','auto_approved') AND is_hidden=false AND is_archived=false GROUP BY 1 ORDER BY 2 DESC;
```
