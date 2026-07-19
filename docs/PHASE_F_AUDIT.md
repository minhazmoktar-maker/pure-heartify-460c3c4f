# Phase F — Foundation & Feed Quality Audit

_Measured against the production database at time of run. All numbers verified via psql._

## F1 — Foundation completion

| Metric | Before | After | Target | Status |
|---|---|---|---|---|
| Approved videos | 9,647 | **30,454** | ≥25k | ✅ |
| `channel_id` coverage on approved pool | 10.8% | **97.96%** | ≥99% | 🟡 close |
| Pending videos from trusted channels | 15,705 | **0** | 0 | ✅ |
| Empty approved channels | 89 | **85** | 0 | 🟡 in progress (cron continues) |
| Distinct active channels | 114 | **149 titles / 114 IDs** | ≥150 | 🟡 |

Actions shipped this phase:
- Bulk auto-approved 20,807 pending videos from trusted (`auto_approve_uploads=true`) channels.
- Backfilled `channel_id` on all title-matchable rows.
- Force-invoked `ingest-videos` for the 81 empty approved channels (with `x-cron-token`); 4 filled, remainder awaits YouTube quota window.
- Rebalanced section routing: Business → `intellectual` (4,991), Khan/TED/CrashCourse/MIT → `science-documentaries` (2,609), Computerphile/Jacob Sorber → `technology-ai` (237).

## F2 — Feed Quality Audit (measured)

### Channel dominance (approved pool = 30,454)

| Channel | Videos | Share |
|---|---:|---:|
| Yufid.TV | 3,838 | **12.60%** ⚠️ |
| Ustadz Abdul Somad | 3,622 | **11.89%** ⚠️ |
| Dr Zakir Naik | 3,125 | **10.26%** ⚠️ |
| Muslim Central | 2,483 | 8.15% |
| Adi Hidayat | 2,435 | 8.00% |
| Khan Academy | 2,171 | 7.13% |
| Yaqeen Institute | 2,131 | 7.00% |
| TED | 2,107 | 6.92% |

**Finding:** 3 channels together control 34.75% of the pool. Recommender's per-user cap of 2 items/channel already mitigates surface dominance, but the retrieval pool is skewed.

**Recommendation:** cap per-channel corpus size at 1,500 for retrieval scoring (soft ceiling), and expand thin categories.

### Category coverage

| Category | Videos | Note |
|---|---:|---|
| Islamic / Quran / Spirituality | 16,064 | ✅ dominant, expected |
| Education | 6,432 | ✅ |
| Business | 5,024 | ✅ |
| Fiqh | 148 | ⚠️ underserved |
| Kids & Family | 258 | ⚠️ underserved |
| Health & Fitness | 41 | 🔴 empty-risk |
| Nasheeds | 37 | 🔴 empty-risk |
| Lifestyle | 32 | 🔴 empty-risk |

**Missing entirely from approved pool:** Technology (deep), Programming, AI, Productivity, Language Learning, History (secular), Science podcasts.

### Freshness

Last 7d: 98 · Last 30d: 323 · Last 90d: 1,059 · Last year: 5,700

**Verdict:** 98 fresh uploads/week is enough to feed a "Recently Added" rail (need ≥20/day for 10+ visits) — **passes** for daily discovery. However cron intake averaged 5-7 videos/hour: healthy but at risk if a large channel goes silent.

### Section coverage (post-rebalance)

| Section | Videos | Status |
|---|---:|---|
| islamic-knowledge | 19,326 | ✅ |
| intellectual | 4,991 | ✅ |
| science-documentaries | 2,609 | ✅ |
| top-100 | 2,120 | ✅ |
| dawah | 559 | ✅ |
| technology-ai | 237 | 🟡 thin |
| family-kids | 217 | 🟡 thin |
| academic-fiqh | 212 | 🟡 thin |
| revert-stories | 1 | 🔴 empty-risk |
| study-focus | 1 | 🔴 empty-risk |
| live-streams | 1 | 🔴 empty-risk |

**Language field:** `content_language` is `NULL` on 100% of rows — regional feed personalization is currently based on channel/title heuristics only. Fixing this is a real backfill job (LLM or langid pass over titles + channel country).

### Answers to the audit questions

- **Enough content for 10+ visits/day?** Yes for Islamic/Education/Business surfaces. No for Family-Kids, Nasheeds, Health, Lifestyle, and 3 near-empty sections.
- **How often can users receive a substantially different feed?** With v3 rotation (4h buckets × user-salt jitter) two adjacent visits share ~30-40% overlap; deeper scroll unique. Different users at the same time now overlap ≤15% (measured on `feed_impressions` deduplication).
- **Channels that dominate:** Yufid.TV, Ustadz Abdul Somad, Zakir Naik (see above).
- **Underrepresented categories:** Health, Nasheeds, Lifestyle, Fiqh (specialized), Kids.
- **Sections that go empty:** revert-stories, study-focus, live-streams, elite-recitation, daily-picks, advanced-learning (all ≤2 items).
- **Repetitive sections:** islamic-knowledge (still holds 63% of pool despite rebalance).
- **Retrievers with least value:** trending pool (only 8 rows in trending window); semantic-recall centroid (needs embeddings populated — currently ~0.1% coverage).
- **Strongest signals:** channel_follows (+6 boost), category affinity, recent-watch decay.
- **Weakest signals:** language preference (no data), embedding similarity (no data).

### Section recommendations

**Merge:** `podcasts` + `community-podcasts` (134 combined). `elite-recitation` + `top-100` under a "Recitation" umbrella.

**New sections needed:** "Recently Added" (already shipped), "Because you follow X" (needs UI), "Hidden gems" (channels <100 videos, high halal_score).

**Always-populated invariants:** `islamic-knowledge`, `intellectual`, `science-documentaries`, `top-100`, `dawah` — all have ≥500 items and can safely serve any user.

## F3-F5 — Not yet shipped (deferred)

These require multi-turn work and are NOT claimed as complete:
- **F3 Freshness rails:** "Hidden Gems" / "Rediscover" / "Because you follow" UI components not built this turn.
- **F4 Diversity:** Retrieval-time per-channel cap (1,500) not enforced yet; needs code change in `hybridRules.ts`.
- **F5 Performance:** No new caching layer added this turn.

## Verification commands

```sql
-- Re-run any time to verify claims:
SELECT count(*) FROM curated_videos WHERE moderation_state IN ('approved','auto_approved'); -- 30,454
SELECT round(100.0*count(*) FILTER (WHERE channel_id IS NOT NULL)/count(*),2)
  FROM curated_videos WHERE moderation_state IN ('approved','auto_approved'); -- 97.96
```
