# Heartify Viral Growth Playbook — 108 Mechanisms

Every mechanism lists: **How it works → Example → Implementation in Heartify → K-factor Δ → DAU Δ → Retention Δ**. K-factor is the average new users invited × conversion; DAU/retention deltas are directional estimates vs baseline for a halal-content platform.

Legend: **K** = new-invitees per user per cycle · **DAU** = daily active user lift · **RET** = D30 retention lift.

---

## A. Direct invite loops (1–15)

1. **SMS/WhatsApp invite with reward** — user shares link, both get 1-month premium. *Ex: Dropbox, Cash App.* → Add `useReferral` reward tier + WhatsApp deep link. **K 0.20 · DAU +8% · RET +6%**
2. **Contact-book auto-suggest** — permissioned import surfaces friends already on app. *Ex: WhatsApp, Signal.* → Native contact API + hashed match RPC. **K 0.35 · DAU +12% · RET +9%**
3. **Group Quran khatm invite** — start a khatm, invite 30 friends to claim juz. *Ex: Strava clubs.* → Extend `/khatm` with shareable group link. **K 0.60 · DAU +15% · RET +18%**
4. **Family plan** — one premium seat covers 6 family members. *Ex: Spotify, Apple One.* → Extend `entitlements` with `plan_group_id`. **K 0.45 · DAU +10% · RET +22%**
5. **Referral leaderboard** — top inviters get badges + free premium. *Ex: Robinhood.* → `referrals` + weekly rank RPC. **K 0.15 · DAU +5% · RET +4%**
6. **Dua request share** — post a dua → shareable card to any platform. *Ex: BeReal share cards.* → Dynamic OG image per `dua_requests` row. **K 0.25 · DAU +7% · RET +5%**
7. **Ameen streak reciprocity** — say Ameen → prompt to share the dua. *Ex: LinkedIn reactions.* → Post-Ameen sheet with share CTA. **K 0.10 · DAU +4% · RET +3%**
8. **Iftar countdown invite** — Ramadan countdown widget shared to stories. *Ex: TikTok countdowns.* → Widget generator route. **K 0.30 · DAU +9% seasonal · RET +7%**
9. **Adhan alarm share** — share your favorite reciter's adhan as ringtone. *Ex: Shazam song share.* → Reciter share page + audio preview. **K 0.12 · DAU +3% · RET +4%**
10. **Ramadan challenge invite** — 30-day challenge with team of 5. *Ex: Duolingo streaks with friends.* → Team table + progress UI. **K 0.55 · DAU +18% · RET +25%**
11. **Prayer partner** — pair with one friend, get reminded when they pray. *Ex: Habitica.* → Pairing table + push. **K 0.20 · DAU +11% · RET +14%**
12. **Sadaqah gift** — donate a premium month to a friend. *Ex: Substack gift.* → Gift entitlement mutation. **K 0.18 · DAU +6% · RET +8%**
13. **Wedding/Nikah invite card** — generate Islamic e-invite from app. *Ex: Paperless Post.* → Template + share. **K 0.40 · DAU +3% · RET +2%**
14. **New-Muslim mentor invite** — connect converts to mentors. *Ex: Reddit r/Islam DMs.* → Mentor match module. **K 0.25 · DAU +6% · RET +20%**
15. **Refer-a-scholar** — invite your local imam; verified imams get creator tools. *Ex: LinkedIn creator invites.* → Verification workflow. **K 0.15 · DAU +5% · RET +12%**

## B. Social content loops (16–35)

16. **Shareable ayah cards** — long-press ayah → auto-designed image. *Ex: Kindle highlights.* → Canvas render in `/quran`. **K 0.35 · DAU +12% · RET +10%**
17. **Hadith of the day auto-post** — user opts in, app posts daily to their story. *Ex: Spotify Wrapped daily.* → OAuth to IG/X + scheduler. **K 0.28 · DAU +8% · RET +6%**
18. **Dua wall public feed** — anon or signed prayers browsable by anyone. *Ex: Reddit.* → Already partial; add SEO'd public view. **K 0.30 · DAU +14% · RET +9%**
19. **Journal → share highlight** — private reflection → optional shareable quote. *Ex: Day One.* → Toggle per entry. **K 0.10 · DAU +3% · RET +7%**
20. **Reciter clip share** — 30-sec audio clip → video card with waveform. *Ex: Overcast clips.* → Waveform gen + MP4 export. **K 0.40 · DAU +15% · RET +11%**
21. **Khatm completion certificate** — beautiful shareable proof of full Quran. *Ex: Coursera certs.* → Cert generator. **K 0.25 · DAU +4% · RET +18%**
22. **Ramadan Wrapped** — annual recap of ibadah. *Ex: Spotify Wrapped.* → Yearly job + share flow. **K 0.80 · DAU +40% Ramadan · RET +15%**
23. **Streak share** — 100-day dhikr streak → auto-share. *Ex: Duolingo.* → Streak milestone triggers. **K 0.20 · DAU +9% · RET +14%**
24. **Public bookmarks** — curators publish collections. *Ex: Pinterest boards.* → Publish flag on `favorites`. **K 0.22 · DAU +8% · RET +7%**
25. **Reciter "battle" polls** — vote favorite reciter of the week. *Ex: TikTok duets.* → Poll table + widget. **K 0.15 · DAU +5% · RET +4%**
26. **Question-of-the-week** — scholar answers top-voted community question. *Ex: Stack Overflow.* → Q&A module. **K 0.18 · DAU +9% · RET +11%**
27. **Live dua rooms** — realtime audio prayer circles. *Ex: Clubhouse, X Spaces.* → LiveKit integration. **K 0.35 · DAU +12% · RET +13%**
28. **Halal watchlist share** — video collection with 1-tap subscribe. *Ex: YouTube playlists.* → Playlist share. **K 0.28 · DAU +10% · RET +9%**
29. **Story reactions on adhkar** — friends see and react to your morning adhkar. *Ex: Snap streaks.* → Friend feed. **K 0.20 · DAU +11% · RET +12%**
30. **Deep-linked ayah discussions** — every ayah has a comment thread. *Ex: Genius annotations.* → Ayah threads. **K 0.15 · DAU +8% · RET +9%**
31. **Ummah map** — anonymized global map of who's praying now. *Ex: Peloton leaderboard.* → Realtime channel. **K 0.10 · DAU +6% · RET +5%**
32. **Dua answered testimonials** — mark dua as answered → share. *Ex: Product Hunt reviews.* → Status toggle. **K 0.22 · DAU +4% · RET +8%**
33. **Baby-name announcement card** — pick name in app → announcement card. *Ex: Nametests virality.* → Card generator. **K 0.50 · DAU +2% · RET +1%**
34. **Convert-anniversary share** — celebrate shahada anniversary. *Ex: LinkedIn work anniversaries.* → Yearly trigger. **K 0.18 · DAU +2% · RET +6%**
35. **Public reciter fan pages** — follow reciters, share pages. *Ex: Last.fm artists.* → Reciter profile share. **K 0.20 · DAU +7% · RET +8%**

## C. Content-embedding loops (36–50)

36. **Ayah embed widget** — bloggers embed ayah with Heartify branding. *Ex: Twitter embeds.* → JS widget + oEmbed. **K 0.05 external · DAU +4% · RET +2%**
37. **iMessage / RCS stickers** — dua and dhikr sticker packs. *Ex: Duolingo owl stickers.* → Sticker extension. **K 0.30 · DAU +5% · RET +3%**
38. **WhatsApp status templates** — daily hadith formatted for WA status. *Ex: ShareChat.* → Template + WA deeplink. **K 0.40 · DAU +11% · RET +6%**
39. **Prayer-time widget** — iOS/Android home widget branded. *Ex: Google Weather widget.* → SwiftUI/Glance widgets. **K 0.15 · DAU +18% · RET +25%**
40. **Lock-screen adhan** — Live Activity/Dynamic Island adhan countdown. *Ex: Uber Live Activity.* → ActivityKit. **K 0.10 · DAU +14% · RET +20%**
41. **Watch complication** — next prayer complication on Apple Watch. *Ex: Strava complication.* → watchOS app. **K 0.08 · DAU +9% · RET +18%**
42. **Auto-signature ayah** — signup adds daily ayah to email signature. *Ex: "Sent from Superhuman".* → OAuth Gmail. **K 0.12 · DAU +3% · RET +4%**
43. **Browser extension** — highlight any English Islamic text → tafsir. *Ex: Grammarly.* → Chrome/Safari extension. **K 0.20 · DAU +6% · RET +9%**
44. **Quran-in-context menu** — right-click Arabic on web → translate via Heartify. *Ex: Google Translate ext.* → Same extension. **K 0.10 · DAU +4% · RET +5%**
45. **SEO'd hadith library** — every hadith is a public page ranked in Google. *Ex: Sunnah.com traffic.* → Already partial via `library.json`. **K 0.05 external · DAU +25% · RET +8%**
46. **AMP prayer-time pages** — geo-detected instant page per city. *Ex: IslamicFinder SEO.* → SSR route. **K organic · DAU +30% · RET +10%**
47. **YouTube overlay** — extension marks halal channels with badge. *Ex: RottenTomatoes browser ext.* → WebExtension. **K 0.25 · DAU +7% · RET +8%**
48. **Zapier/Shortcuts integration** — auto-log salah from Shortcuts. *Ex: Todoist.* → API + Shortcut pack. **K 0.05 · DAU +2% · RET +9%**
49. **Alexa/Google Assistant skill** — "what's next prayer?" *Ex: any weather skill.* → Skill deployment. **K 0.10 · DAU +5% · RET +6%**
50. **CarPlay/Android Auto** — hands-free adhan + Quran. *Ex: Spotify Auto.* → Native module. **K 0.08 · DAU +6% · RET +14%**

## D. Gamification loops (51–70)

51. **Daily streak** — visible flame counter for salah/dhikr. *Ex: Duolingo.* → Extend `streaks`. **K 0.05 · DAU +22% · RET +30%**
52. **Streak freezes as gift** — send a freeze to a friend. *Ex: Duolingo.* → Freeze balance + gift. **K 0.15 · DAU +6% · RET +8%**
53. **Public leaderboards** — weekly reading rank in your city. *Ex: Strava.* → Rank RPC by geo. **K 0.10 · DAU +8% · RET +9%**
54. **Achievement NFTs** (halal, non-tradable) — collectible badges. *Ex: Reddit avatars.* → Badge system, no chain required. **K 0.08 · DAU +5% · RET +11%**
55. **Ramadan quest map** — 30 daily quests unlocking rewards. *Ex: Fortnite battle pass.* → Quest engine. **K 0.25 · DAU +35% Ramadan · RET +20%**
56. **Level-up shareables** — reach hafiz-level → shareable card. *Ex: LinkedIn skill badges.* → Level triggers. **K 0.20 · DAU +6% · RET +12%**
57. **Team streaks** — group of 3 must all pray fajr to keep streak. *Ex: Snap group streaks.* → Group RPC. **K 0.45 · DAU +12% · RET +22%**
58. **Sadaqah leaderboard (anon)** — anonymous top-givers this month. *Ex: Twitch tips.* → Anon rank. **K 0.05 · DAU +3% · RET +6%**
59. **Quiz duels** — challenge friend to Islamic quiz. *Ex: QuizUp.* → Realtime match. **K 0.30 · DAU +9% · RET +8%**
60. **Guess the reciter** — audio quiz with score sharing. *Ex: Heardle.* → Daily audio game. **K 0.35 · DAU +11% · RET +9%**
61. **Guess the surah** — 5-sec clip → guess. *Ex: Wordle.* → Daily puzzle. **K 0.40 · DAU +14% · RET +12%**
62. **Daily Wordle-style ayah** — fill missing word. *Ex: NYT Connections.* → Daily puzzle. **K 0.30 · DAU +12% · RET +11%**
63. **Hifz progress rings** — 3 Apple-style rings for review/new/revision. *Ex: Apple Fitness rings.* → Ring UI. **K 0.05 · DAU +18% · RET +25%**
64. **Milestone confetti + share** — finish juz → confetti + share sheet. *Ex: Robinhood confetti.* → Post-complete flow. **K 0.15 · DAU +4% · RET +7%**
65. **Habit chain lock-in** — 21-day chain visualized. *Ex: Streaks app.* → Chain viz. **K 0.03 · DAU +10% · RET +18%**
66. **Redeemable Barakah points** — earn on ibadah → sadaqah donations. *Ex: airline miles.* → Points ledger. **K 0.10 · DAU +8% · RET +14%**
67. **Timed sprint** — 10-min Quran sprint with friends. *Ex: Peloton class.* → Live sprint rooms. **K 0.25 · DAU +7% · RET +9%**
68. **Reflection karma** — helpful journal reflections upvoted. *Ex: Reddit karma.* → Voting. **K 0.08 · DAU +6% · RET +7%**
69. **Weekly recap** — Sunday email/push summarizing week. *Ex: Notion weekly.* → Cron. **K 0.05 · DAU +6% · RET +11%**
70. **Missed-day recovery** — pay 3 points to restore streak. *Ex: Duolingo streak repair.* → Recovery flow. **K 0.02 · DAU +5% · RET +9%**

## E. Notification-driven loops (71–85)

71. **Adhan push** — 5×/day, opens app 3× more than avg push. *Ex: Duolingo notifs.* → Already partial; add smart snooze. **K 0.02 · DAU +40% · RET +30%**
72. **"Your friend just prayed"** — social presence push. *Ex: Strava kudos push.* → Friend graph events. **K 0.10 · DAU +9% · RET +8%**
73. **Reciter drop alert** — new upload from followed reciter. *Ex: YouTube subs.* → Follow + push. **K 0.05 · DAU +11% · RET +14%**
74. **Ramadan-eve invite blast** — invite dormant users a week before Ramadan. *Ex: NYT election reminders.* → Segmented campaign. **K 0.10 · DAU +25% seasonal · RET +18%**
75. **Local iftar countdown** — geo-precise notification. *Ex: hyperlocal weather.* → Geo cron. **K 0.05 · DAU +22% Ramadan · RET +12%**
76. **Lailatul-Qadr guesser** — nightly last-10 push encourages return. *Ex: Wordle daily.* → Nightly job. **K 0.08 · DAU +35% Ramadan · RET +9%**
77. **Missed-prayer nudge** — gentle push if unlogged 3 hours after time. *Ex: MyFitnessPal.* → Rules engine. **K 0 · DAU +14% · RET +19%**
78. **Weekly Jumu'ah reminder** — Fri morning with khutbah suggestions. *Ex: LinkedIn weekly.* → Weekly cron. **K 0.05 · DAU +18% Fri · RET +11%**
79. **Anniversary of significant event** — Hijri new year push. *Ex: Google Doodles.* → Hijri calendar events. **K 0.03 · DAU +6% · RET +5%**
80. **Return-user reactivation** — 7/14/28-day dormant sequences. *Ex: Duolingo owl.* → Lifecycle. **K 0.02 · DAU +8% · RET +15%**
81. **Push A/B copy engine** — LLM writes 3 variants, ships winner. *Ex: Netflix thumbs.* → Variant table. **K 0 · DAU +6% · RET +4%**
82. **Silent geofence push** — enter mosque → offer bookmark khutbah. *Ex: Yelp checkins.* → Geofence. **K 0.05 · DAU +4% · RET +6%**
83. **Watchface tap-to-open** — quick action rings adhkar counter. *Ex: Nike Run Club watch.* → Widget action. **K 0 · DAU +7% · RET +10%**
84. **In-app "someone said Ameen to your dua"** — social push. *Ex: TikTok likes.* → Ameen trigger. **K 0.05 · DAU +12% · RET +8%**
85. **New scholar Q&A alert** — followed scholar posted. *Ex: Substack alerts.* → Follow model. **K 0.06 · DAU +7% · RET +9%**

## F. Creator & marketplace loops (86–95)

86. **Creator invite** — verified reciters/scholars invite peers, get co-branded page. *Ex: Substack invites.* → Creator invite quota. **K 0.30 supply-side · DAU +12% · RET +10%**
87. **Creator subscribe** — followers get push + priority feed. *Ex: YouTube subs.* → Follow entity. **K 0.10 · DAU +14% · RET +18%**
88. **Tipping/sadaqah to creator** — halal micro-donations. *Ex: Twitch bits.* → Payments + payout. **K 0.05 · DAU +5% · RET +9%**
89. **Fatwa marketplace** — pay for scholar's private answer. *Ex: JustAnswer.* → Booking. **K 0.03 · DAU +2% · RET +11%**
90. **UGC dua wall promotion** — top duas shown in feed. *Ex: Twitter For You.* → Ranking. **K 0.12 · DAU +8% · RET +6%**
91. **Creator collab feature** — two reciters collab track shared to both audiences. *Ex: Spotify collabs.* → Multi-artist entity. **K 0.20 · DAU +6% · RET +5%**
92. **Verified badge as flex** — public checkmark drives applications. *Ex: X verified.* → Verification queue. **K 0.10 supply · DAU +3% · RET +4%**
93. **Course marketplace** — scholars sell structured courses. *Ex: Udemy.* → Course entity. **K 0.05 · DAU +4% · RET +15%**
94. **Live streaming khutbah** — mosques go live to their followers. *Ex: Instagram Live.* → Live module. **K 0.15 · DAU +9% · RET +11%**
95. **Local mosque claim** — mosque admins claim page → invite their jama'ah. *Ex: Google My Business.* → Claim flow. **K 0.25 · DAU +12% · RET +14%**

## G. Passive & structural loops (96–108)

96. **SEO surface for every hadith/dua** — 100k+ indexable pages. *Ex: Genius, StackOverflow.* → Already partial. **K organic · DAU +40% long-tail · RET +6%**
97. **PWA install prompt** — one-tap add-to-homescreen. *Ex: Twitter Lite.* → Manifest already present; add prompt UX. **K 0 · DAU +15% · RET +20%**
98. **Deep-linked shares** — every share opens exact ayah/reciter. *Ex: Spotify deeplinks.* → Universal Links (already partial). **K 0.10 · DAU +8% · RET +7%**
99. **QR at mosques** — printable QR for mosque prayer times. *Ex: menu QRs.* → QR generator. **K 0.20 offline · DAU +7% · RET +10%**
100. **Ramadan billboards / co-marketing** — partner Islamic brands. *Ex: Duolingo Super Bowl.* → BD. **K viral spike · DAU +20% seasonal · RET +6%**
101. **Influencer creator kit** — pre-made assets for Muslim influencers. *Ex: Shopify partner kit.* → Media kit page. **K 0.15 · DAU +10% · RET +5%**
102. **Referral via Apple/Google share sheet with dynamic OG** — beautiful preview cards. *Ex: Notion share.* → Dynamic OG service. **K 0.15 · DAU +5% · RET +3%**
103. **Watch-together rooms** — sync-play halal content with friends. *Ex: Teleparty.* → Sync module. **K 0.25 · DAU +9% · RET +11%**
104. **Auto-invite on payment success** — after donating, invite to sponsor a friend. *Ex: GoFundMe share.* → Post-donate flow. **K 0.20 · DAU +2% · RET +5%**
105. **In-app "invite to complete challenge"** — post-completion CTA. *Ex: Peloton challenge invite.* → Trigger UI. **K 0.15 · DAU +5% · RET +7%**
106. **Public streak URL** — heartify.app/u/username shows streak. *Ex: Duolingo profile.* → Public profile route. **K 0.10 · DAU +4% · RET +6%**
107. **Localized landing pages** — city-level SEO (`/prayer-times/london`). *Ex: Zillow.* → SSR template. **K organic · DAU +30% · RET +8%**
108. **Post-signup "invite 3 to unlock"** — soft gate for premium trial. *Ex: Superhuman early access.* → Onboarding step. **K 0.50 · DAU +6% · RET +4%**

---

## Prioritization matrix (top 15 to build first)

Sorted by (K × DAU × RET) potential ÷ engineering weeks:

1. Streak system (#51) — highest retention lift, cheap.
2. Ramadan Wrapped (#22) — highest one-shot K.
3. Family plan (#4) — huge retention + revenue.
4. Group khatm (#3) — natural high-K viral loop.
5. Adhan push polish (#71) — highest DAU lift already partly built.
6. Home widgets + Live Activity (#39, #40) — retention moat.
7. Team streaks (#57) — combines gamification + invite.
8. Ayah share cards (#16) — passive viral content.
9. Ramadan challenge invite (#10) — seasonal K spike.
10. Ramadan quest map (#55) — engagement multiplier.
11. Guess-the-surah / reciter (#60, #61) — daily-return hooks.
12. Creator invite + subscribe (#86, #87) — supply-side flywheel.
13. Public reciter clip share (#20) — TikTok-shape virality.
14. Local mosque claim (#95) — network-effect anchor.
15. SEO'd hadith + city prayer-times pages (#45, #96, #107) — compounding organic.

## Measurement

Track per mechanism in `analytics_events`:
- `viral_impression`, `viral_click`, `viral_signup`, `viral_activation`.
- Compute weekly K = signups_from_share ÷ senders.
- SLO: any mechanism with K < 0.05 after 4 weeks post-launch is deprecated.
