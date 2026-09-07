/**
 * Authoritative hub pages (SEO pillar content).
 *
 * Each hub is a genuine, long-form entry point for one of Heartify's three
 * core intents — Islamic learning, halal video, and Qur'an listening. Hubs are
 * linked from the homepage footer nav and link out to the relevant in-app
 * surfaces so crawlers (and users) reach depth in one hop.
 */

export interface HubSection {
  heading: string;
  body: string;
  links?: Array<{ to: string; label: string }>;
}

export interface KnowledgeHub {
  slug: string;
  h1: string;
  kicker: string;
  title: string;
  description: string;
  intro: string;
  sections: HubSection[];
  faq: Array<{ q: string; a: string }>;
}

export const KNOWLEDGE_HUBS: Record<string, KnowledgeHub> = {
  "islamic-learning": {
    slug: "islamic-learning",
    kicker: "Learning hub",
    h1: "Islamic learning online — a structured path, not a feed",
    title: "Islamic Learning Online — Structured Courses & Lessons | Heartify",
    description:
      "Learn Islam step by step: aqeedah, fiqh, seerah, tajweed and Arabic — reviewed lessons, structured paths, and certificates. No music, no ads, no engagement bait.",
    intro:
      "Most people learn Islam in fragments — a clip here, a reel there — and retain very little. Heartify organises reviewed lessons into ordered paths so each session builds on the last, and measures whether a lesson was actually beneficial ninety days later rather than how long you stared at a screen.",
    sections: [
      {
        heading: "Start with the foundations",
        body: "Begin with the six articles of faith and the pillars of Islam before branching into law or history. Foundations first means later material has somewhere to attach; it is also the order the earliest generations taught in — belief, then worship, then character, then breadth.",
        links: [
          { to: "/aqeedah", label: "Aqeedah — creed essentials" },
          { to: "/salah-guide", label: "How to pray, step by step" },
          { to: "/wudu", label: "Wudu and purification" },
          { to: "/new-muslim", label: "New Muslim starting point" },
        ],
      },
      {
        heading: "Then follow an ordered path",
        body: "Learning paths group lessons into sequenced units with progress tracking and a certificate on completion. Each unit is short enough to finish in one sitting on a phone, which is how the overwhelming majority of our learners study.",
        links: [
          { to: "/learn", label: "Browse learning paths" },
          { to: "/certificates", label: "Certificates you can verify" },
          { to: "/quiz", label: "Test what you retained" },
        ],
      },
      {
        heading: "Learn from named, checkable teachers",
        body: "Every lesson names its channel and teacher, and every channel carries a trust tier that says exactly how it was reviewed. Classical scholars have their own reference pages so terminology in a lecture can be traced back to who first used it.",
        links: [
          { to: "/scholars", label: "Scholars reference" },
          { to: "/directory", label: "Directory of channels and teachers" },
          { to: "/channel-trust", label: "How channel trust works" },
        ],
      },
      {
        heading: "Language and recitation skills",
        body: "Reading the Qur'an correctly is a skill with its own curriculum: letters, then articulation points, then the rules of tajweed, then fluency. These are taught as drills rather than lectures because they are motor skills, not information.",
        links: [
          { to: "/alphabet", label: "Arabic alphabet" },
          { to: "/tajweed", label: "Tajweed rules" },
          { to: "/hifz", label: "Memorisation planner" },
        ],
      },
    ],
    faq: [
      {
        q: "Is Islamic learning on Heartify free?",
        a: "Yes. The learning paths, lessons, quizzes and reference pages are free. Membership supports the platform and unlocks extras, and Heartify never runs advertising.",
      },
      {
        q: "How do you decide what is authentic?",
        a: "Content passes a multi-stage review before it can be served, and every video has a public attestation page showing its tier, reviewer chain and any institutional co-signatures.",
      },
      {
        q: "Can I get a certificate?",
        a: "Completing a learning path issues a certificate with a public verification link, so a teacher or institution can confirm it independently.",
      },
    ],
  },
  "halal-video": {
    slug: "halal-video",
    kicker: "Halal video hub",
    h1: "Halal video — reviewed before it reaches you",
    title: "Halal Video Platform — Reviewed, Family-Safe Content | Heartify",
    description:
      "Watch halal video: Islamic, educational, historical and family content reviewed against a strict halal floor — no music, no mixed-gender content, no ads, no autoplay traps.",
    intro:
      "A halal video platform is not a filtered version of an existing feed — it is a different objective. Heartify reviews every video before it can be served, publishes what that review found, and ranks by measured benefit rather than watch time.",
    sections: [
      {
        heading: "What the halal floor actually means",
        body: "Music, mixed-gender presentation, immodest imagery and engagement bait are excluded at the source, not hidden behind a toggle. A video that cannot be evidenced as clean is not served, and thumbnails are checked visually as well as textually.",
        links: [
          { to: "/halal", label: "Browse halal topics" },
          { to: "/trust", label: "Trust and safety standards" },
        ],
      },
      {
        heading: "Every video can be audited",
        body: "Each video has a public attestation record: which stage reviewed it, what confidence, which channel tier it came from, and a tamper-evident digest chained into a ledger. If a decision changes, the record shows that too.",
        links: [
          { to: "/verify", label: "Public attestation and badge" },
          { to: "/audit", label: "Corpus audit reports" },
        ],
      },
      {
        heading: "Beyond religious lectures",
        body: "Beneficial is broader than religious. History, science, language learning, entrepreneurship, productivity and children's content all belong here provided they clear the same floor — which is what makes Heartify usable as a household's only video app.",
        links: [
          { to: "/kids", label: "Kids mode" },
          { to: "/history", label: "Islamic history" },
          { to: "/guides/best-islamic-cartoons", label: "Family-safe cartoons" },
          { to: "/halal-alternative-to-youtube", label: "Halal alternative to YouTube" },
        ],
      },
      {
        heading: "Ranked by benefit, never by watch time",
        body: "Ninety days after a watch we ask a single question: was it worth your time? Those answers — not session length — train the ranker, so material that felt compelling but taught nothing loses ground over time.",
        links: [{ to: "/concept", label: "How the benefit objective works" }],
      },
    ],
    faq: [
      {
        q: "Does Heartify remove music entirely?",
        a: "Yes. Videos with musical instrumentation do not pass review, including background music in otherwise educational material.",
      },
      {
        q: "Is Heartify safe for children?",
        a: "Kids mode narrows the corpus to age-appropriate, reviewed content and disables social features and comments.",
      },
      {
        q: "Are there ads?",
        a: "No. Heartify has no advertising and never will; it is funded by membership, sadaqah and institutional licensing.",
      },
    ],
  },
  "quran-listening": {
    slug: "quran-listening",
    kicker: "Qur'an hub",
    h1: "Listen to the Qur'an — offline, ad-free, by reciter",
    title: "Listen to the Qur'an Online — Reciters, Offline Audio | Heartify",
    description:
      "Listen to the Qur'an by reciter or surah with offline downloads, background and lock-screen playback, and position resume. Ad-free, no music, works on slow networks.",
    intro:
      "Qur'an audio should keep playing when the screen locks, resume where you stopped, and work when the network does not. Heartify's listening surface is built for commutes, prayer rooms and households on limited data.",
    sections: [
      {
        heading: "Choose a reciter, not a playlist",
        body: "Forty-plus reciters are available with consistent audio integrity checks, so a surah does not switch voices or cut off mid-ayah. Preferences persist across devices when you are signed in.",
        links: [
          { to: "/listen", label: "Open the listening surface" },
          { to: "/reciters", label: "Browse reciters" },
        ],
      },
      {
        heading: "Offline first",
        body: "Individual surahs or full juz can be downloaded to the device and played with no connection at all. Downloads resume after interruptions, and storage usage is shown so you can reclaim space deliberately.",
        links: [
          { to: "/offline", label: "Offline library and storage" },
        ],
      },
      {
        heading: "Background and lock-screen playback",
        body: "Playback continues in the background with proper media-session metadata, so track controls appear on the lock screen, in the car and on Bluetooth devices — and resume correctly after a reconnection.",
      },
      {
        heading: "Memorisation and daily routine",
        body: "Repeat ranges, memorisation planning and daily adhkar sit next to the player so listening turns into retention rather than background noise.",
        links: [
          { to: "/hifz", label: "Hifz planner" },
          { to: "/adhkar", label: "Daily adhkar" },
          { to: "/listen?surah=18", label: "Surah al-Kahf for Jumu'ah" },
        ],
      },
    ],
    faq: [
      {
        q: "Can I listen to the Qur'an offline?",
        a: "Yes. Downloaded surahs are stored on your device and play without any network connection.",
      },
      {
        q: "Does audio keep playing when I lock my phone?",
        a: "Yes. Background and lock-screen playback are supported, including Bluetooth controls and resume after reconnect.",
      },
      {
        q: "How many reciters are available?",
        a: "More than forty, each with automated audio integrity checks against missing or truncated segments.",
      },
    ],
  },
};

export const hubList = () => Object.values(KNOWLEDGE_HUBS);
