# Heartify — First-Principles Company Blueprint (20-Year Internal Strategy)

Status: founding-team document. Supersedes nothing operationally; governs everything strategically.
Companions: `docs/STRATEGY_MOAT.md` (thesis), `docs/ROADMAP_MOAT.md` (waves).

Read this document with one filter applied to every line:

> **Why can't YouTube realistically build this without damaging its own business model, incentives, ecosystem, economics, or brand?**

If a line cannot answer that, it does not belong here.

---

## 0. The single highest-leverage idea

**Own the verified provenance layer for beneficial knowledge — and make every video a claim that can be traced to a named human, a named institution, and a named source text.**

Everything else in this document is downstream of that. Recommendation quality, family safety, creator economics, learning paths, AI reliability, and institutional partnerships are all applications of one asset: a signed, growing, multilingual graph of *who vouched for what, and why*.

YouTube cannot build this. Not "won't" — cannot. Provenance at 20-billion-video scale is economically impossible, and per-video human attestation contradicts the open-upload supply model that makes YouTube worth what it is worth. The moment YouTube attests to a video's benefit, it becomes liable for it. Their entire legal and economic posture is built on *not* doing that.

We are starting from zero, which means we can make attestation a precondition of existence rather than a retrofit.

---

## 1. Mission

### Current mission (implicit)
"A halal alternative to YouTube."

### Why it is wrong
It is defined by an opponent. It caps us at a category. It makes "halal" a filter rather than a product. Filters are commodities — YouTube can ship a filter. Filters do not compound.

### The corrected mission

> **Heartify exists to make the world's beneficial knowledge discoverable, verifiable, and transmissible — so that every minute a person spends here leaves them better than before.**

Three words carry the weight:

- **Beneficial** — the objective function. Not engaging, not halal-as-negative-space. Halal is the floor; benefit is the ceiling.
- **Verifiable** — the moat. Every claim traceable.
- **Transmissible** — the network effect. Knowledge that moves from a scholar to a learner to their child.

This mission is bigger than Muslims and still perfectly serves Muslims first. A mission that only Muslims can care about caps the company at a demographic. A mission where Muslims are the first, deepest, most demanding market — and where the trust infrastructure built for them is exactly what a Japanese parent, a Nigerian medical student, or a German homeschooler also wants — is a trillion-dollar mission.

**Test:** would this mission still be correct if Islam were not in the sentence? Yes — and the Islamic scholarly tradition happens to have invented the exact discipline we are productizing: *isnād*, the chain of transmission. We are not borrowing a Silicon Valley pattern. We are digitizing a 1,300-year-old epistemology that the world's largest information platforms lack.

**Permanent statement:** Heartify is not trying to maximize time spent. It is trying to maximize value received per minute spent.

---

## 2. Product

### If we started today with unlimited ambition

We would not build a video app. We would build **a transmission network for verified beneficial knowledge, whose primary interface today happens to be video.**

The product has four layers. Only the top one is visible.

```text
┌─────────────────────────────────────────────┐
│  L4  Surfaces      watch · learn · listen   │  visible, replaceable
├─────────────────────────────────────────────┤
│  L3  Intelligence  benefit ranking · AI     │  compounding
├─────────────────────────────────────────────┤
│  L2  Graph         topics·scholars·isnād    │  compounding, uncopyable
├─────────────────────────────────────────────┤
│  L1  Provenance    signed attestations      │  bedrock, uncopyable
└─────────────────────────────────────────────┘
```

L1 and L2 are the company. L3 is the product. L4 is fashion.

### What becomes the core
1. **The Attestation Ledger** (L1) — every video, every source, every claim, signed.
2. **The Beneficial Knowledge Graph** (L2) — topics, scholars, institutions, books, courses, skills, languages, prerequisites.
3. **Benefit-first ranking** (L3) — the only ranker in the world whose objective is not watch time.
4. **Learning progression** (L4) — the surface that turns consumption into retained capability.

### What should be removed or never built
- **Any standalone ritual app** (prayer tracker, qibla-as-product, tasbih counter as a destination). Ritual is a *context signal* for discovery, not a spine. Every one of these is a 200-competitor commodity with zero moat.
- **Social feed mechanics** — follower counts as status, public like counts, streak-shaming, notification bait. These import the incentive we exist to reject.
- **Anything that measures success in minutes watched without a benefit denominator.**
- **Generic "AI chat with the app."** A chatbot with no provenance is an unverified opinion machine — the exact thing we exist to eliminate.
- **Duplicate content categories** we cannot moderate to Tier A. Better to have 30k videos we can defend than 3M we cannot.

### What we keep and sharpen
Video-first identity. Strict halal floor. Mobile-first. Multilingual from day one — not as localization, but as *corpus strategy*.

---

## 3. Recommendation Engine — the Benefit Objective

### The core question
Not *"what will this person watch longest?"*
Not *"what should this person watch?"* (paternalistic, users flee)
But:

> **"What is the most beneficial thing this person actually wants to watch right now?"**

Benefit and desire in the same sentence. Drop desire and we become homework. Drop benefit and we become YouTube.

### Objective function

```text
Score = Σ wᵢ · signalᵢ,  optimized against  BENEFIT_REALIZED(t + 90 days)
```

The training label is not the click. **The training label is the user's own assessment of value, collected 90 days later.** This is the single most important engineering decision in the company.

### Signals nobody uses today

Grouped by novelty. Items marked ★ are, to our knowledge, used by no major platform.

**Retrospective value signals**
1. ★ **T+90 regret / gratitude survey** — "Was this worth your time?" asked three months after watching, not three seconds. Trains the ranker on durable value.
2. ★ **Re-watch-for-learning vs. re-watch-for-comfort** — distinguishing study behavior from loop behavior by pause/scrub/note patterns.
3. ★ **Post-video action completion** — did the user do the thing the video taught (log a prayer, save a note, complete a path step, download a worksheet)?
4. ★ **Knowledge retention probe** — an optional 20-second recall question 7 days later. Retention, not attention, becomes the metric.
5. ★ **Teaching-forward signal** — did the user share this to *teach* someone (WhatsApp to a named person) vs. broadcast it?

**Prerequisite & progression signals**
6. ★ **Prerequisite satisfaction** — never recommend a video whose graph prerequisites the user has not met. Nothing on earth does this for video.
7. ★ **Difficulty-gradient fit** — target the user's zone of proximal development, measured by completion of the last three difficulty tiers.
8. ★ **Conceptual gap detection** — the graph knows the 12 concepts in a topic; we know the 9 the user has covered. Recommend the 3 missing ones.
9. ★ **Curriculum debt** — a user three steps into a path who stopped 14 days ago gets a re-entry ramp, not a new topic.

**Context signals**
10. ★ **Time-available inference** — 4 minutes before Zuhr is a different query than 40 minutes on a Saturday.
11. ★ **Prayer-window context** (opt-in) — Qur'an before Zuhr, reflection after Maghrib, wind-down after Isha.
12. ★ **Ramadan / Jumu'ah / last-ten-nights modes** as ranking contexts, not banners.
13. ★ **Co-viewing detection** (opt-in) — family-room context ranks differently than personal headphones.
14. **Device and network class** — do not recommend a 4K 90-minute lecture on a throttled 3G mid-range Android.
15. ★ **Emotional-state opt-in** — "I'm struggling" is a legitimate, user-declared ranking input. Never inferred, always declared.

**Trust and provenance signals**
16. ★ **Attestation tier as a ranking weight**, not just a filter.
17. ★ **Isnād depth** — how short is the chain from this video to a primary source?
18. ★ **Scholarly endorsement graph** — who vouches for this speaker, and who vouches for them.
19. ★ **Cross-madhhab representation balance** — diversity within orthodoxy, enforced at the session level.
20. ★ **Contested-claim flag** — surfaces "scholars differ on this" instead of pretending a single answer.

**Anti-signals (things we actively down-rank)**
21. ★ **Clickbait delta** — gap between title promise and transcript delivery, measured by model.
22. ★ **Emotional-manipulation score** — fear-driven, outrage-driven, or guilt-driven framing.
23. ★ **Parasocial-dependency risk** — a user whose last 40 videos are one speaker gets diversified, not deepened.
24. ★ **Doom-loop detection** — three consecutive videos on the same anxiety-adjacent topic triggers a redirect toward resolution content.
25. ★ **Session-fatigue curve** — value per minute declines after ~35 minutes for most learning sessions. We rank *down* as fatigue rises and offer a close.

**Ecosystem-health signals**
26. ★ **Corpus-coverage debt** — the ranker knows which graph nodes have thin coverage and preferentially surfaces good videos there, which routes attention (and therefore creator revenue) to under-served knowledge.
27. ★ **New-source discovery quota** — a guaranteed slice of every session for sources the user has never seen, chosen by trust rather than popularity.
28. ★ **Language-equity floor** — a Hausa or Bengali speaker gets first-class ranking depth, not English leftovers with subtitles.

### Hard invariants (non-negotiable, enforced in code)
- Top-channel share ≤ 5% per session.
- Repeat rate < 1%.
- Every recommendation carries a machine-generated, human-readable **"Why you're seeing this."**
- No dark patterns, ever. Infinite scroll, autoplay, and push remain available *only* where they measurably raise value-per-minute.

### Why YouTube cannot copy this
Their objective function is priced into an ad marketplace with hundreds of billions of dollars of contracted expectation. Retraining the ranker against a 90-day satisfaction label would reduce watch time in the short term by design. There is no quarter in which a public company can absorb that. Additionally, prerequisite-aware ranking requires a knowledge graph over the corpus — which requires provenance — which requires attestation — which requires accepting liability. Each step is individually impossible for them, and the chain is four steps long.

---

## 4. Trust System

### Design goal
Not "we moderate well." That is a claim. **The goal is that no one has to take our word for anything.**

### The architecture

**Layer 1 — Signed attestation on every video.**
Reviewer identity, timestamp, tier (A/B/C/D), model version, rule hits, and the specific policy clauses applied — cryptographically signed, append-only, immutable.

**Layer 2 — Public verification endpoint.**
`/verify/:content_id` — indexable, cacheable, permanent, no login. Anyone on earth can audit any decision we made. Journalists, parents, competitors, hostile critics. This is the point.

**Layer 3 — Reviewer reputation graph.**
Reviewers are named entities with track records. A reviewer whose decisions are overturned loses weight. Institutions can endorse reviewers. Reviewer reputation is itself public.

**Layer 4 — Institutional co-signature.**
A university, madrasah, or foundation can counter-sign an attestation. Their brand is now on the line with ours. This is the mechanism by which trust scales beyond our own headcount.

**Layer 5 — Adversarial audit program.**
We pay outsiders to break us. Published quarterly, including failures. A trust system that only publishes wins is marketing.

**Layer 6 — Governance board with veto.**
Scholars and parents with a contractual right to block content policy changes. We deliberately give away power we would otherwise have. Nobody with a $200B ad business can do this.

**Layer 7 — Constitutional commitments.**
Written, versioned, publicly diffable. Every change to moderation policy is a public commit. Trust compounds when history is inspectable.

### Why this compounds for decades
Each attestation is permanent. Each reviewer builds a decade-long record. Each institution that co-signs raises the cost for the next institution to *not* participate. After ten years, the ledger is not a feature — it is the definitive public record of what beneficial video is, and no one can construct a competing ten-year record without ten years.

### Why YouTube cannot copy
Attestation creates editorial liability at planetary scale. Section 230-style protections in most jurisdictions depend on *not* being the editor. The moment YouTube signs "this video is beneficial and safe," they own every outcome. Their lawyers will never permit it, and they are right not to.

---

## 5. Knowledge Graph

### What it contains

```text
Concepts ── prerequisite ──▶ Concepts
   │                            │
   ├── taught_by ──▶ Scholars ──┼── affiliated_with ──▶ Institutions
   │                     │      │
   │                     └── isnād ──▶ Scholars (teacher chain)
   │
   ├── sourced_from ──▶ Books / Primary Texts ──▶ Editions ──▶ Translations
   ├── covered_by ──▶ Videos ──▶ Segments ──▶ Timestamps
   ├── expressed_in ──▶ Languages / Dialects / Scripts
   ├── grouped_into ──▶ Courses ──▶ Learning Paths ──▶ Certificates
   ├── develops ──▶ Skills ──▶ Competency levels
   └── contested_by ──▶ Positions ──▶ Madhāhib / Schools of thought
```

### The parts nobody else has

1. **Isnād as a first-class edge.** Teacher-to-student chains, digitized. This exists in scholarly literature and nowhere in software. It is the original provenance graph, and it maps perfectly onto modern verification.
2. **Segment-level topic edges.** Not "this video is about tawḥīd" but "minutes 14:20–19:05 cover this specific concept, at this difficulty, citing this text."
3. **Prerequisite edges over video segments.** Turns a pile of lectures into a curriculum.
4. **Contested-position edges.** We model disagreement explicitly instead of flattening it. This is both intellectually honest and a genuine safety feature.
5. **Cross-lingual concept identity.** The same concept in 18+ languages as one node, so a Bengali learner and a Turkish learner traverse the same curriculum in their own tongue.
6. **Coverage debt as a queryable property.** The graph knows what it does not have, which becomes our content acquisition roadmap and our creator commissioning brief.

### Why it becomes impossible to copy
- It cannot be scraped: the edges are human judgments, not page content.
- It cannot be bought: no one has built it.
- It cannot be LLM-generated: hallucinated isnād is worse than none, and the scholarly community will detect and reject it instantly — permanently destroying the credibility of whoever tries.
- It requires institutional relationships that take years and are exclusive by nature. A university endorses one platform, not five.
- Every year of curation adds edges that require the previous years' edges to be meaningful. It is path-dependent.

---

## 6. Creator Ecosystem

### The question
Why would the world's best beneficial creators — a physician explaining nutrition, a Damascene scholar, a Cambridge historian, a Bengali children's educator — publish here *first*?

### Answers, in order of strength

1. **They earn more per view here than anywhere.** Our revenue is not priced against watch time, so a 40-minute lecture watched by 3,000 serious learners can outearn a viral short. Payout formula: **tier × trust-graph position × finish-rate × coverage-debt bonus** — never raw views.
2. **They reach students, not audiences.** A learner enrolled in a path is worth more to a teacher than 100 drive-by viewers. We can tell a creator: 4,200 people are working through your course, and 61% completed module 3.
3. **Reputation is portable and verifiable.** Their attestation record and endorsement graph is a public, permanent credential — something YouTube's subscriber count is not.
4. **Institutions can employ them here.** A university can commission a course, run a cohort, and issue a certificate on our rails.
5. **We commission against coverage debt.** We pay creators to make the specific thing the graph is missing, in the specific language it is missing in. No platform on earth does content commissioning driven by a knowledge graph.
6. **Sadaqah, waqf, and patronage rails.** Direct support, monthly endowments, institutional grants — revenue types YouTube's ad model structurally cannot host.
7. **No demonetization roulette.** Our policy is public, versioned, and appealable to a human within a published SLA.
8. **They are not competing with entertainment for attention.** On YouTube a scholar loses to a prank channel. Here the whole corpus is beneficial, so quality within category actually decides.

### Why YouTube cannot match this
Their CPM cannot competitively pay a physician or a scholar, because their CPM is set by an auction dominated by mass-market entertainment inventory. Paying beneficial creators above-market would require cross-subsidy from entertainment revenue, which their creator community would correctly read as favoritism, and their advertisers would not fund. Their economics choose their supply. Ours choose ours.

---

## 7. Learning Experience

### What is fundamentally impossible on YouTube

YouTube can host every lecture in the world and still cannot deliver learning, because learning requires four things it structurally lacks:

1. **Sequence** — knowing what must come before what. Requires prerequisites. Requires a graph. Requires provenance.
2. **Assessment** — knowing whether it landed. Requires retention probes, which reduce watch time.
3. **Progression memory** — a decade-long record of what a person has actually understood, not what they clicked.
4. **A teacher who knows you** — human or AI, grounded in *your* history and *verified* sources.

### What we build

- **Paths** authored by scholars and institutions, composed of segments, with explicit prerequisites and difficulty tiers.
- **Retention probes** — brief, optional, spaced-repetition recall over what you watched.
- **A personal knowledge record** — the concepts you have covered, the sources you have studied, the gaps remaining. Exportable, portable, permanent.
- **Cohorts** — learn with 500 others, with a real instructor, ending in an institution-issued certificate.
- **"What I learned this month"** — generated only from your own watched and annotated material, never invented.
- **Year-in-īmān** — a decade later, a user can see the shape of their own intellectual and spiritual growth. Nothing on the internet offers this.

### The killer property
After three years, a Heartify learning record is genuinely irreplaceable. Switching platforms means abandoning a curriculum you walked for years. This is the strongest retention mechanic in software, and it is entirely virtuous — the lock-in *is* the user's own accumulated benefit.

---

## 8. Families

### If a parent could allow only one video platform

They choose Heartify because:

1. **Kids Mode is Tier A only** — human-attested, institutionally whitelisted, not algorithmically filtered.
2. **Every approval is auditable.** The parent can open `/verify/:id` for anything their child watched and read exactly why it was approved and by whom.
3. **Family safety is the default posture of the entire product**, not a separate walled-garden app that a child ages out of into the unsafe one.
4. **Households, not accounts** — up to six seats, roles, PIN-gated child lock, shared library.
5. **Parent audit dashboard** — what, when, and *why approved*.
6. **Priority SLA on child reports** — under 12 hours, published.
7. **No ads.** Ever. There is no version of Heartify where a child is inventory.
8. **Co-viewing as a first-class mode**, with content ranked for families watching together.
9. **Age-appropriate difficulty progression** — a nine-year-old's path is a real curriculum, not a playlist.

### Why YouTube cannot copy
YouTube Kids exists and parents still do not trust it, for a structural reason: it is a filtered view of an unfiltered corpus, and every parent knows it. To match us, YouTube would have to human-review its children's catalog, which is millions of hours, which costs more than the segment earns, in a segment already under regulatory pressure that makes them want *less* exposure, not more.

---

## 9. Digital Minimalism

### The paradox to solve
Our target user is someone who deleted TikTok and put a timer on YouTube. They are *hostile* to apps. Why would they open ours daily?

### The answer: be the app that is proud when you leave

- **Sessions have endings.** We offer a natural close: "That's a good place to stop today."
- **Value-per-minute is displayed to the user**, not minutes spent. We show what you learned, not how long you scrolled.
- **A daily surface with a floor and a ceiling** — one deliberate, high-benefit thing. Finish it and you are done.
- **No infinite feed as the default entry.** Infinite exists for people who choose it, behind a deliberate action.
- **Notifications ≤ 3/week, prayer-time anchored, quiet hours honored.** We treat push budget as a scarce trust resource.
- **No streak guilt.** Streaks celebrate, never shame. Freezes are free and generous.
- **Weekly report includes "time saved"** as well as time spent.

### Why YouTube cannot copy
A public company cannot ship a feature whose success metric is reduced usage. Every quarterly earnings call punishes it. We can, because our revenue comes from support, membership, and institutions — parties who *want* the user to leave satisfied.

---

## 10. AI (assuming 100× capability)

Rules first: **no ungrounded generation, ever.** Every AI output on Heartify cites a verified source in the graph or it does not ship. An AI that can hallucinate about religion is a catastrophic liability, not a feature.

### AI that compounds

1. **Graph construction at scale** — AI proposes concept edges, prerequisites, and segment boundaries; humans attest. AI does the volume, humans own the truth. This is the single largest cost curve we bend.
2. **Multilingual corpus expansion** — transcription, translation, and cross-lingual concept alignment across 40+ languages, opening markets no competitor will serve at our depth.
3. **Segment-level moderation** — visual, audio, and transcript analysis at minute granularity, with confidence tiers routing to human review only where needed.
4. **Grounded tutor** — an AI that answers only from your watched corpus and the verified graph, always citing the video, timestamp, scholar, and text. It says "scholars differ" when they do. It says "I don't know, here is who does" when it doesn't.
5. **Personal curriculum synthesis** — generating a learning path for *this* person from verified segments, with prerequisites respected.
6. **Retention probe generation** — spaced-repetition questions derived from what the user actually watched.
7. **Coverage-debt detection** — AI reads the graph, finds the holes, and writes the commissioning brief.
8. **Clickbait and manipulation detection** — comparing title promise to transcript delivery at corpus scale.
9. **Reviewer assistance, not replacement** — pre-populating attestations for human sign-off, tracking reviewer disagreement to improve both model and policy.
10. **Accessibility** — real-time signing, dialect-aware audio, dynamic reading level.

### The compounding property
Every human attestation is a training label no one else has. Every 90-day satisfaction survey is a label no one else has. Every graph edge is a structured fact no one else has. Our AI gets better *because* of the human trust layer, and the human trust layer gets cheaper *because* of the AI. That loop is the company.

---

## 11. Network Effects

Ranked by strength and durability.

| # | Network | Mechanism | 10-year compounding |
|---|---|---|---|
| 1 | **Trust** | Each institution that co-signs makes the next one's participation more valuable and its absence more conspicuous | Becomes the industry standard; being un-attested becomes suspicious |
| 2 | **Knowledge graph** | Each edge makes every other edge more useful; prerequisites only work with density | Superlinear — utility scales with edges², edges scale with time |
| 3 | **Institution** | Universities bring scholars, scholars bring corpus, corpus brings learners, learners bring institutions | Exclusive relationships; each one is a decade-long lock |
| 4 | **Moderation** | Every review trains models and reviewers; every report improves policy | Cost per attestation falls yearly while quality rises |
| 5 | **Data / labels** | 90-day satisfaction, retention probes, benefit ratings | Cannot be bought or scraped; grows only with elapsed time |
| 6 | **Learning** | Paths improve as completion data accumulates; cohorts attract cohorts | Curriculum quality compounds into institutional adoption |
| 7 | **Language** | Each language's corpus makes cross-lingual alignment better for all | 40 languages behave like one corpus, not 40 |
| 8 | **Creator** | Better payouts attract better creators attract more learners attract better payouts | Classic marketplace flywheel, but on quality not virality |
| 9 | **Recommendation** | More benefit labels → better ranking → better sessions → more labels | Compounds only because the labels are proprietary |
| 10 | **Family / household** | Households add seats; children age into the same trusted product | Generational — a 20-year customer lifetime |
| 11 | **Community** | Khatm rooms, cohorts, masjid-hosted watch rooms | Local network effects that cluster geographically |
| 12 | **Reviewer** | Named reviewers build public records; reputation attracts better reviewers | The credential becomes valuable independent of us |

---

## 12. Data Moats

Datasets we should own, ranked by defensibility.

1. **The attestation ledger** — every moderation decision, signed, with rationale. Uncopyable, unbuyable, grows with time only.
2. **Rejection corpus** — the videos we said *no* to, with reasons. This is arguably more valuable than the approved corpus, and literally no one else has it, because no one else rejects at this granularity.
3. **90-day benefit labels** — the retrospective satisfaction dataset. Cannot be back-filled. A competitor starting today is three months behind on day one and never catches up.
4. **Retention-probe results** — what people actually retained, per concept, per language, per difficulty. This is educational science data no platform holds.
5. **Isnād / endorsement graph** — human relationships, verified. Unscrapable.
6. **Segment-level concept map** — minute-granular topical structure over a multilingual corpus.
7. **Prerequisite graph** — human-authored learning order.
8. **Cross-lingual concept alignment** — the same idea across 40 languages, verified.
9. **Contested-position dataset** — modeled scholarly disagreement.
10. **Family co-viewing patterns** — opt-in, consented, and unavailable anywhere else.
11. **Coverage-debt history** — what the world's beneficial-knowledge corpus was missing, year by year.
12. **Reviewer disagreement data** — where humans differ, which is the frontier of policy.

None of these can be purchased. None can be scraped. Nine of the twelve cannot even be generated with unlimited compute, because they encode human judgment and elapsed time.

---

## 13. Business Model

### The alignment test
A business model is correct when the company earns more precisely when the user benefits more. Advertising fails this test structurally: the advertiser pays for attention, so the platform optimizes attention, so the user's time is the product.

### Our model

| Stream | Payer | Aligned because |
|---|---|---|
| **Membership** | Learner | They pay for value received; churn if we waste their time |
| **Waqf / patronage** | Supporter | Endowment-style monthly support to a creator or institution |
| **Sadaqah tipping** | Viewer | Direct, per-video, voluntary |
| **Institutional licensing** | Universities, schools, masjids | They pay for verified curriculum and cohort tooling |
| **Certificates** | Learner / employer | Paid only on completion — we earn when learning finishes |
| **Family plans** | Parents | They pay for safety they can audit |
| **Commissioning** | Foundations, endowments | They fund coverage debt in specific languages/topics |
| **Trust infrastructure licensing** | Third parties | Long-term: others pay to use our attestation rails |

**Never:** advertising. Not "not yet." Never. The moment we take ad money, every recommendation is suspect and the entire document above collapses.

### Incentive conflicts to watch
- **Certificates** could tempt us to lower rigor to raise completion. Mitigation: institutions own the standard, not us.
- **Membership** could tempt us to paywall beneficial content. Mitigation: constitutional commitment that the core beneficial corpus stays free; membership buys tooling, paths, downloads, family seats.
- **Institutional licensing** could tempt us to favor paying institutions in ranking. Mitigation: ranking is graph- and trust-driven, audited quarterly, published.

Every stakeholder wins: learners get benefit, creators get income, institutions get reach and credibility, parents get safety, and the company earns from all four without selling any of them to a fifth party.

---

## 14. Fifty Structural Weaknesses YouTube Cannot Fix

Structural means: fixing it damages their core business.

**Advertising (1–10)**
1. Revenue is priced against watch time, so the ranker can never optimize for brevity or sufficiency.
2. Advertisers require scale, so niche beneficial content is structurally underpriced.
3. Ad load must grow, degrading the experience over time by financial necessity.
4. Brand-safety rules are set by advertisers, not by benefit or by scholarship.
5. They cannot ship a "you're done for today" feature without cutting inventory.
6. They cannot cap sessions.
7. Children's advertising regulation makes deep investment in kids' content unattractive.
8. Ad-driven ranking makes any "we recommend this because it's good for you" claim non-credible.
9. Premium subscribers still get a watch-time-optimized ranker, because it's one ranker.
10. Sponsorship arbitrage inside videos is outside their control and corrupts the content anyway.

**Incentives (11–18)**
11. Creator incentives reward frequency and virality, not accuracy or depth.
12. Thumbnails and titles are an arms race they profit from and therefore cannot end.
13. Shorts cannibalizes long-form learning, and they must keep Shorts to fight TikTok.
14. Engagement metrics are their public KPIs, so internal teams cannot deprioritize them.
15. Any team proposing a benefit metric competes with teams measured on watch time.
16. A/B testing culture selects for short-term lift, systematically killing slow-compounding features.
17. Ranking changes that reduce watch time cannot survive quarterly review.
18. Their most valuable creators would revolt against a quality-weighted payout.

**Creator economics (19–26)**
19. CPM cannot competitively pay a scholar, physician, or professor.
20. Payouts scale with views, so depth is punished.
21. Non-English, non-monetizable markets are structurally underserved.
22. Institutions cannot be paid as institutions.
23. No waqf, sadaqah, or patronage rails — and adding them competes with their ad take.
24. Demonetization opacity is required to prevent gaming, which permanently erodes creator trust.
25. Educational creators subsidize their channels from off-platform income — they know it, and it makes them portable.
26. They cannot commission content against a knowledge gap; they have no knowledge graph.

**Moderation (27–36)**
27. Per-video human attestation is economically impossible at their scale.
28. Attestation creates editorial liability they are legally structured to avoid.
29. Signing "this is beneficial" invites litigation in every jurisdiction.
30. Their policy must be globally neutral, so it cannot encode any particular ethical framework.
31. They cannot apply religious standards without accusations of favoritism across all religions.
32. Appeals cannot be human at their volume.
33. Moderation is a cost center; ours is the product.
34. They cannot publish per-decision rationale without exposing gameable rules.
35. Their rejection data is a legal risk to retain; ours is a training asset.
36. Reviewer identity cannot be public at their scale for safety reasons.

**Scale (37–42)**
37. Twenty billion videos cannot be graph-annotated.
38. Corpus quality cannot be raised without deleting content, which destroys creator relationships.
39. Prerequisite modeling requires curation they cannot afford.
40. Segment-level topical structure at their scale is prohibitive.
41. Any per-video human cost, multiplied by their catalog, exceeds the segment's revenue.
42. Their recommendation infrastructure is optimized for a corpus that is mostly not beneficial.

**Brand and governance (43–50)**
43. YouTube's brand is entertainment; "trusted learning" is not credible from them.
44. Parents already distrust them; that is a decade-old prior.
45. They cannot cede content governance to an external scholarly board.
46. They cannot make policy changes publicly diffable.
47. Google's ad business creates a permanent conflict-of-interest perception.
48. Antitrust exposure makes exclusive institutional partnerships risky for them.
49. Data-privacy posture makes families and schools cautious by default.
50. They cannot credibly promise "we want you to use this less."

---

## 15. Fifty Opportunities That Exist Only Because We Start From Zero

1. Attest every video from day one; no backlog ever.
2. Reject aggressively — corpus quality as a founding constraint.
3. Build the knowledge graph before the catalog, not after.
4. Publish reviewer identities and records.
5. Constitutional, publicly diffable content policy.
6. External governance board with real veto power.
7. Ban advertising in the founding documents.
8. Optimize the ranker against a 90-day satisfaction label.
9. Ship retention probes without fearing watch-time loss.
10. Show users value-per-minute instead of minutes.
11. Offer a natural session ending.
12. Cap push notifications at three per week and publish the cap.
13. Make family safety the default posture, not a sub-app.
14. Households as the primary account unit.
15. Pay creators on finish-rate and trust, not views.
16. Commission content against measured coverage debt.
17. Waqf and sadaqah rails as first-class revenue.
18. Institutional grants portal.
19. Certificates issued by institutions on our rails.
20. Cohort classes with real instructors.
21. Prerequisite-aware recommendation.
22. Difficulty-gradient progression.
23. Segment-level topic and timestamp modeling.
24. Isnād digitization as a product primitive.
25. Contested-position modeling instead of flattening disagreement.
26. Cross-lingual concept identity across 40+ languages.
27. Language-equity ranking floor.
28. Dialect-aware audio and search.
29. Multilingual corpus as strategy, not localization.
30. Grounded-only AI with mandatory citation.
31. AI tutor scoped to the user's own verified corpus.
32. Rejection corpus as a proprietary training set.
33. Reviewer-disagreement data as a policy frontier.
34. Adversarial audit program with published failures.
35. Public `/verify` endpoint for every single item.
36. Trust as a ranking signal, not just a filter.
37. Parasocial-dependency down-ranking.
38. Doom-loop interruption.
39. Clickbait-delta scoring against transcripts.
40. Co-viewing mode with family-specific ranking.
41. Prayer-time and Ramadan as ranking contexts.
42. Time-available inference for short windows.
43. Emotional-state as a declared, never inferred, input.
44. Portable, exportable personal knowledge record.
45. Decade-scale learning recap.
46. Masjid- and institution-hosted watch rooms.
47. Global synchronized khatm and Qiyām events.
48. Offline-first for low-bandwidth markets from day one.
49. Mid-range Android as the primary performance target.
50. Trust infrastructure eventually licensed to third parties as public rails.

---

## 16. Moats, Ranked

Scored 1–10 on: user value (UV), copy difficulty (CD), compounding (CO), defensibility (DF), AI leverage (AI), network effects (NE), business impact (BI), founder leverage (FL), strategic importance (SI), 10-year durability (DU).

| Rank | Moat | UV | CD | CO | DF | AI | NE | BI | FL | SI | DU | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Attestation ledger / provenance | 10 | 10 | 10 | 10 | 8 | 9 | 8 | 9 | 10 | 10 | **94** |
| 2 | Beneficial knowledge graph | 9 | 10 | 10 | 10 | 10 | 9 | 8 | 8 | 10 | 10 | **94** |
| 3 | Benefit-labeled dataset (T+90, probes) | 9 | 10 | 10 | 10 | 10 | 7 | 8 | 7 | 10 | 10 | **91** |
| 4 | Institutional relationships | 8 | 9 | 9 | 10 | 5 | 10 | 9 | 10 | 10 | 10 | **90** |
| 5 | Benefit-first ranker | 10 | 9 | 9 | 9 | 10 | 8 | 8 | 7 | 10 | 9 | **89** |
| 6 | Non-ad business model | 8 | 10 | 8 | 10 | 4 | 6 | 10 | 10 | 10 | 10 | **86** |
| 7 | Learning progression record | 10 | 8 | 10 | 9 | 8 | 7 | 8 | 6 | 9 | 10 | **85** |
| 8 | Creator economics (finish-rate payouts) | 8 | 9 | 8 | 9 | 5 | 10 | 9 | 8 | 9 | 9 | **84** |
| 9 | Multilingual corpus depth | 9 | 8 | 9 | 8 | 10 | 9 | 7 | 6 | 9 | 9 | **84** |
| 10 | Family-safe-by-default posture | 10 | 8 | 8 | 9 | 4 | 9 | 9 | 7 | 9 | 10 | **83** |
| 11 | Rejection corpus | 5 | 10 | 9 | 10 | 10 | 4 | 6 | 5 | 8 | 9 | **76** |
| 12 | Reviewer reputation network | 6 | 9 | 8 | 8 | 6 | 8 | 5 | 6 | 8 | 9 | **73** |
| 13 | Governance / constitutional policy | 7 | 9 | 6 | 9 | 2 | 6 | 5 | 9 | 8 | 10 | **71** |
| 14 | Grounded AI tutor | 9 | 6 | 8 | 6 | 10 | 5 | 7 | 5 | 7 | 7 | **70** |
| 15 | Community / cohort rails | 7 | 6 | 7 | 6 | 4 | 9 | 6 | 6 | 6 | 7 | **64** |

---

## 17. Reality Check — Killing Our Own Ideas

For each: *if YouTube launched this tomorrow, do we still win?*

| Idea | YouTube ships it tomorrow | Verdict |
|---|---|---|
| Halal filter | Trivial for them | **DISCARDED as a moat.** Table stakes only. |
| Better UI / calmer design | Copyable in weeks | **DISCARDED as a moat.** Necessary, not sufficient. |
| Prayer times, qibla, tasbih | Irrelevant to them, but 200 apps do it | **DISCARDED.** No moat, dilutes focus. |
| Islamic content vertical | They could curate one | **WEAK alone.** Only defensible with attestation + graph beneath it. |
| Ad-free subscription | Premium exists | **DISCARDED as a moat.** But non-ad *ranker* survives — Premium still uses the watch-time ranker. |
| Learning paths over video | They could build playlists+ | **SURVIVES.** Needs prerequisites, which need the graph, which needs provenance. Four-step chain they cannot start. |
| AI tutor over video | They will absolutely build this | **SURVIVES only if grounded in verified corpus.** An ungrounded tutor over an unverified corpus is a liability, not a competitor. Our version cites; theirs cannot. |
| Kids mode | YouTube Kids exists | **SURVIVES.** Because ours is attested and auditable and theirs is filtered. The difference is the ledger, not the mode. |
| Creator tipping | They have Thanks/Memberships | **SURVIVES only combined with payout formula + institutional rails.** Tipping alone is copyable. |
| Signed per-video attestation | They cannot, legally or economically | **CORE MOAT.** |
| Knowledge graph with isnād | They will not fund it; scholars will not give it to them | **CORE MOAT.** |
| T+90 benefit labels | Contradicts their KPIs | **CORE MOAT.** |
| Institutional co-signature | Antitrust + brand-fit problems | **CORE MOAT.** |
| Session endings / minimalism | Cannot ship against ad inventory | **CORE MOAT (behavioral).** |

**Conclusion:** roughly half of what a normal product team would build here is not defensible. Everything that survives sits on provenance, graph, labels, institutions, or economics. Build those. Treat everything else as necessary hygiene, funded minimally.

---

## 18. The Top 100 Opportunities, Ranked

Tier S = the company. Tier A = compounding infrastructure. Tier B = high-value product. Tier C = supporting. Tier D = hygiene/table stakes.

### Tier S — the company itself (1–10)

| # | Opportunity | Why it wins |
|---|---|---|
| 1 | **Signed attestation on every video + public `/verify`** | Legally and economically impossible for YouTube; permanent; underpins everything |
| 2 | **Beneficial knowledge graph (concepts, prerequisites, segments)** | Superlinear compounding; unscrapable; enables 30 other items |
| 3 | **T+90 benefit-labeled training set** | Cannot be bought or back-filled; contradicts YouTube's KPIs |
| 4 | **Benefit-first ranker trained on those labels** | The product thesis made real |
| 5 | **Institutional co-signature network** | Exclusive, decade-long, antitrust-awkward for Google |
| 6 | **Constitutional no-advertising commitment + non-ad revenue rails** | Removes the conflict that defines the incumbent |
| 7 | **Isnād / endorsement graph digitization** | 1,300-year epistemology as software primitive; no one else can source it |
| 8 | **Prerequisite-aware learning paths with institution certificates** | Turns video into curriculum; four-step dependency chain YouTube cannot start |
| 9 | **Rejection corpus as proprietary training data** | Uniquely ours; improves every model we run |
| 10 | **Finish-rate × trust payout formula** | Redirects the world's best beneficial creators to us |

### Tier A — compounding infrastructure (11–30)

11. Segment-level topic + timestamp annotation
12. Cross-lingual concept identity across 40+ languages
13. Reviewer reputation graph with public records
14. Retention probes (spaced recall) as a ranking signal
15. Coverage-debt engine driving commissioning
16. Multilingual corpus expansion via AI + human attestation
17. Contested-position modeling (madhhab-aware)
18. Household model with parent audit dashboard
19. Tier A–only Kids Mode with institutional whitelist
20. Grounded AI tutor (citation-mandatory)
21. Personal knowledge record, exportable and portable
22. Trust as a ranking weight, not just a filter
23. Adversarial audit program with published results
24. External governance board with veto
25. Publicly diffable, versioned content policy
26. Creator commissioning marketplace against graph gaps
27. Waqf / monthly patronage rails
28. Institutional grants portal
29. Language-equity ranking floor
30. Prerequisite satisfaction as a hard ranking constraint

### Tier B — high-value product (31–60)

31. "Why you're seeing this" on every item
32. Session-quality micro-survey feeding ranking
33. Parasocial-dependency diversification
34. Doom-loop interruption
35. Clickbait-delta scoring against transcripts
36. Emotional-manipulation scoring
37. Time-available inference
38. Prayer-window ranking contexts
39. Ramadan / Jumu'ah / last-ten-nights modes
40. Co-viewing (family room) mode
41. Session-fatigue-aware ranking and natural endings
42. Value-per-minute reporting to users
43. New-source discovery quota
44. Cohort classes with live instructors
45. Institution-hosted watch rooms
46. Global synchronized khatm and Qiyām
47. "What I learned this month" grounded summaries
48. Year-in-īmān decade recap
49. Bookmarks with reflections tied to segments
50. Ayah / dua bookmarks linked to source videos
51. Offline-first downloads for low-bandwidth markets
52. Mid-range Android as primary performance target
53. Creator earnings transparency dashboards
54. "Claim your channel / institution" onboarding
55. Priority child-report SLA under 12h
56. Public report SLA and resolution stats
57. Teaching-forward share (share to teach a person)
58. Skill and competency tracking
59. Book / primary-text nodes linked to segments
60. Dialect-aware search and audio

### Tier C — supporting (61–85)

61. Push budget of ≤3/week with quiet hours
62. Streak system without shame mechanics
63. Certificate issuance and verification
64. Employer-verifiable credentials
65. School and madrasah licensing
66. Masjid partnership program
67. Scholar verification and profiles
68. Institution profiles with corpus pages
69. Programmatic SEO over graph nodes
70. Public knowledge-graph browsing pages
71. Open data / research partnerships with universities
72. Accessibility: signing, reading level, dynamic type
73. Family plan billing
74. Gift memberships and sponsorships
75. Regional pricing and local payment rails
76. Cross-device continuity
77. Watch-later as study queue
78. Notes export (JSON + PDF)
79. Reviewer training and certification program
80. Appeals with human review and published SLA
81. Content-taxonomy public documentation
82. Transparency report, quarterly
83. Creator analytics oriented to learning outcomes
84. Referral loop framed as teaching, not growth-hacking
85. Diagnostics and quality dashboards, internal

### Tier D — hygiene / table stakes (86–100)

86. Strict halal floor enforced server- and client-side
87. Zero duplicates, zero empty sections
88. Fast cold start (<1s perceived)
89. Reliable thumbnails and fallbacks
90. Robust search with autocomplete
91. Comments with strong moderation
92. Follows and playlists
93. Native iOS and Android apps
94. Web push and service worker
95. i18n across all shipped locales with RTL
96. Security hardening and RLS discipline
97. Observability, tracing, alerting
98. CI quality gates (diversity sim, SEO, headers)
99. Store presence and ASO
100. Brand and design system consistency

---

## 19. Dependency Graph

```text
                    ┌──────────────────────────────┐
                    │ 6. No-ad constitution        │  (decision, not build)
                    └──────────────┬───────────────┘
                                   │ permits
                    ┌──────────────▼───────────────┐
                    │ 1. Attestation ledger        │◀── 13. Reviewer reputation
                    │    + public /verify          │◀── 24/25. Governance & policy
                    └──────────────┬───────────────┘
                          enables  │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
   ┌────────────────┐   ┌────────────────────┐  ┌──────────────────┐
   │ 9. Rejection   │   │ 2. Knowledge graph │  │ 5. Institutional │
   │    corpus      │   │  (11,12,17,59)     │◀─┤    network       │
   └───────┬────────┘   └─────────┬──────────┘  └────────┬─────────┘
           │                      │                      │
           │            ┌─────────▼──────────┐           │
           │            │ 30. Prerequisites  │           │
           │            └─────────┬──────────┘           │
           │                      │                      │
           ▼                      ▼                      ▼
   ┌────────────────────────────────────────────────────────────┐
   │ 3. T+90 benefit labels  ◀── 14. Retention probes           │
   │                         ◀── 32. Session-quality survey     │
   └────────────────────────────┬───────────────────────────────┘
                                ▼
                   ┌────────────────────────┐
                   │ 4. Benefit-first ranker│──▶ 31 "Why this" · 33–43 signals
                   └────────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐   ┌────────────────────┐   ┌────────────────────┐
│ 8. Learning   │   │ 19. Kids Mode /    │   │ 10. Payout formula │
│    paths      │   │     households     │   │  → 26 commissioning│
│  → 63 certs   │   │  → 55 child SLA    │   │  → 27/28 waqf      │
│  → 44 cohorts │   └────────────────────┘   └────────────────────┘
└───────┬───────┘
        ▼
┌────────────────┐
│ 20. Grounded   │  (requires graph + corpus + attestation; never before)
│     AI tutor   │
└────────────────┘
```

**Critical path:** 6 → 1 → 2 → 3 → 4 → everything.
**Longest lead time:** 5 (institutions) — start relationship-building on day one, in parallel, because it is the only item that cannot be accelerated with money or engineers.

---

## 20. Ten-Year Roadmap

**Years 1–2 — Foundation.**
Attestation on 100% of surfaced videos. Public `/verify`. Knowledge graph v1 over the top 5,000 concepts. T+90 survey instrumented. Benefit ranker v1. First 20 institutional partners. No-ad commitment published. Non-ad revenue live.

**Years 3–4 — Curriculum.**
Prerequisites across the graph. Learning paths authored by 100+ institutions. Certificates. Cohorts. Kids Mode at Tier A. Creator payouts exceeding YouTube equivalents for the top beneficial creators. 18 → 30 languages.

**Years 5–6 — Intelligence.**
Grounded AI tutor. Personal curriculum synthesis. Retention probes at scale. Coverage-debt commissioning at scale. The benefit-labeled dataset becomes the best training corpus for educational recommendation in existence.

**Years 7–8 — Institution.**
Schools, universities, and ministries adopt Heartify as curriculum infrastructure. Certificates recognized by employers. Trust rails licensed externally. 40+ languages, with non-English corpus depth exceeding English.

**Years 9–10 — Standard.**
Being un-attested is what "unverified" means for beneficial video. The graph is the largest of its kind on earth. Millions of families default to us. Learners have decade-long records they will not abandon. A generation of children grew up here.

**The year-10 audit.** If any of these is false, we optimized for the wrong thing:
- Every surfaced video carries a valid signed attestation.
- The graph spans 40+ languages and every beneficial category.
- Thousands of scholars and institutions earn a living here.
- Millions of families use us by default.
- Every recommendation explains itself.
- Users are years into learning paths they cannot replicate elsewhere.
- We have never sold an ad.

---

## 21. Three-Year Roadmap

**Year 1 — Trust spine + benefit labels.**
- 100% attestation coverage; `/verify` public and indexable.
- Reviewer reputation v1; published SLA; adversarial audit #1.
- T+90 survey shipped; session-quality micro-survey shipped.
- Knowledge graph v1: 5,000 concepts, segment annotation on top 20% of corpus.
- Benefit ranker v1 in A/B against current ranker.
- 20 institutional partners signed; governance board seated.
- Membership + sadaqah + waqf rails live. Ad-free constitution published.

**Year 2 — Curriculum + creator economics.**
- Prerequisites across the top 2,000 concepts.
- 50 learning paths from institutions; cohort v1; certificate v1.
- Payout formula live; top-100 beneficial sources earning ≥1.5× YouTube equivalent.
- Kids Mode Tier A + households + parent audit.
- Languages 18 → 26; language-equity floor enforced.
- Retention probes in production feeding the ranker.

**Year 3 — Intelligence + institutions.**
- Grounded AI tutor GA, citation-mandatory.
- Coverage-debt commissioning program funding 500+ commissioned works.
- 200 institutions; first ministry/school-district deployments.
- Personal knowledge record with full export.
- Benefit ranker v2 trained on two full years of T+90 labels.

---

## 22. Twelve-Month Roadmap

| Quarter | Ships | Proof |
|---|---|---|
| **Q1** | Attestation schema + signing; `/verify/:id` public; reviewer identities; audit log; report SLA | ≥99.5% of surfaced videos carry a valid signed attestation; median report→resolution <24h |
| **Q2** | T+90 survey pipeline; session-quality micro-survey; benefit-label store; graph v0 (2,000 concepts + segment annotation on top 10%) | ≥5% survey response rate; 2,000 concepts with ≥3 verified videos each |
| **Q3** | Benefit ranker v1 behind flag; "Why you're seeing this" everywhere; prerequisite constraint on 500 concepts; language-equity floor | Finish-rate +15% vs. control; session-quality ≥4.2/5; top-channel share ≤5%; repeat <1% |
| **Q4** | Institutional co-signature; 20 partners; payout formula; waqf/sadaqah rails; Kids Mode Tier A + households; no-ad constitution + governance board | 20 co-signing institutions; top-100 sources at ≥1.5× YouTube equivalent; 100/100 Kids audit pass |

---

## 23. MVP Sequence

The minimum sequence that makes the company defensible. Each step is worthless without the previous one.

```text
MVP-0  Decide and publish: no advertising, ever.               [1 week, zero engineering]
MVP-1  Sign one attestation. Serve one /verify page.           [proves the ledger]
MVP-2  Attest 100% of the surfaced corpus.                     [proves it scales]
MVP-3  Annotate 500 concepts with segments + prerequisites.    [proves the graph]
MVP-4  Ask 1,000 users "was this worth it?" at T+90.           [proves the label]
MVP-5  Rank by benefit for 10% of users.                       [proves the objective]
MVP-6  Ship one learning path with real prerequisites.         [proves curriculum]
MVP-7  Get one university to co-sign.                          [proves the network]
MVP-8  Pay one scholar more than YouTube would.                [proves the economics]
```

### Execution log

| Step | Status | Evidence (2026-07-31) |
| --- | --- | --- |
| MVP-0 | Shipped | No-ads constitution in `mem://strategy/invariants.md`; revenue = membership / waqf / licensing. |
| MVP-1 | Shipped | Append-only hash-chained ledger `public.attestations` (per-video digest, `prev_digest` → `chain_digest`, supersede-only corrections, no client write path). `get_public_attestation` is ledger-backed and `/verify/:videoId` renders the record, chain digest, and live re-verification. |
| MVP-2 | Shipped | 103,140 / 103,140 surfaced videos attested (100.0%). Coverage published on `/trust` with the ledger chain head. `attestation-backfill-10min` cron re-attests new and re-reviewed videos; staleness is detected by recomputing the canonical payload. |
| MVP-3 | Next | Concept graph: 500 concepts with segments + prerequisites. |
| MVP-4 | Pending | T+90 benefit label collection. |
| MVP-5 | Pending | Benefit-ranked feed for 10% of users. |

If MVP-1 through MVP-8 all succeed, the company is defensible for twenty years. If MVP-7 and MVP-8 fail, nothing else matters — the graph and the ledger only compound if institutions and creators bring their reputations into it.


**Sequencing rule:** never start step N+1 before step N has a published proof metric. We have historically shipped surface before substrate; this document exists to reverse that ordering permanently.

---

## 24. Founder Principles (permanent)

1. We are not competing for attention. We are competing for benefit per minute.
2. If it cannot be verified, it cannot be recommended.
3. Trust is not a feature; it is the product's material.
4. We never sell the user to anyone.
5. We give away power we could keep — governance, transparency, exportability — because that is what makes the trust real.
6. The graph is the company. Surfaces are fashion.
7. We measure engagement; we never optimize for it in isolation. A benefit-caused rise is good news; a benefit-neutral rise is a warning.
8. When in doubt, reject the video, publish the reason, and keep the corpus clean.
9. Every year the ledger, the graph, and the labels must be strictly larger and strictly better. If a year passes without that, the year was wasted.
10. Optimize for decades.

---

*This document governs. If a proposal conflicts with it, the proposal is wrong or this document must be formally amended — with a reason, in a commit, in public.*
