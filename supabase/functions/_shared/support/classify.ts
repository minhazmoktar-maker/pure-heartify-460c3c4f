/**
 * LEVEL 0 — deterministic support brain.
 *
 * Everything in this module runs in-process with no database round trip and no
 * model call: category classification, static answers, guided troubleshooting
 * flows, structured report intent, and the "we don't answer that" boundaries.
 *
 * Pure and runtime-agnostic on purpose — the edge function (Deno) and the
 * Vitest suite (Node) import the exact same file, so the behaviour the tests
 * assert is the behaviour production runs.
 */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const SUPPORT_CATEGORIES = [
  "general_faq", "account", "login", "signup", "email_verification",
  "password_reset", "profile", "favorites", "watch_history", "daily_dose",
  "search", "recommendations", "video_playback", "audio", "downloads",
  "offline_mode", "pip", "notifications", "premium", "billing", "donations",
  "sponsorship", "moderation", "content_reporting", "halal_compliance",
  "privacy", "terms", "copyright", "safety", "technical", "app_install",
  "ios", "android", "website", "deep_links", "performance", "unsupported",
] as const;

export type SupportCategory = typeof SUPPORT_CATEGORIES[number];

/**
 * Keyword rules, most specific first. Multi-label by design: "why was my video
 * removed" is both `moderation` and `halal_compliance` in Heartify's world.
 */
const CATEGORY_RULES: Array<[SupportCategory, RegExp]> = [
  ["password_reset", /\b(reset|forgot|change|new)\b[^.?!]{0,20}\bpassword\b|\bpassword\b[^.?!]{0,20}\b(reset|forgot|change)\b/i],
  ["email_verification", /\b(verif(y|ication)|confirm(ation)?)\b[^.?!]{0,20}\b(email|e-mail|link|code)\b|\bemail\b[^.?!]{0,15}\bnot (arrived|received|coming)\b/i],
  ["login", /\b(log ?in|sign ?in|signin|can'?t get in|locked out|2fa|two[- ]factor|otp)\b/i],
  ["signup", /\b(sign ?up|signup|register|create (an )?account|new account)\b/i],
  ["account", /\b(account|delete my account|deactivate|username|display name)\b/i],
  ["profile", /\b(profile|avatar|profile picture|bio)\b/i],
  ["favorites", /\b(favou?rite|saved videos?|bookmark|playlist)\b/i],
  ["watch_history", /\b(watch history|history|continue watching|already watched)\b/i],
  ["daily_dose", /\b(daily dose|dose of the day|verse of the day|streak)\b/i],
  ["search", /\b(search|find a video|can'?t find|no results)\b/i],
  ["recommendations", /\b(recommend|for you|feed|suggested|why am i seeing|personali[sz])\b/i],
  ["video_playback", /\b(play(back|ing)?|video (won'?t|not|doesn'?t) (play|load)|buffer|black screen|freezes?|stutter)\b/i],
  ["audio", /\b(audio|sound|recit(er|ation)|listen|volume|no sound|mute)\b/i],
  ["downloads", /\b(download|save for later offline)\b/i],
  ["offline_mode", /\b(offline|no internet|airplane mode)\b/i],
  ["pip", /\b(picture[- ]in[- ]picture|\bpip\b|background play|minimi[sz]ed player)\b/i],
  ["notifications", /\b(notification|push|reminder|alert|azan alarm)\b/i],
  ["premium", /\b(premium|plus|membership|upgrade|subscri(be|ption)|plan)\b/i],
  ["billing", /\b(bill(ing|ed)?|payment|invoice|receipt|refund|charge[ds]?|card declined|price|cost|free trial)\b/i],
  ["donations", /\b(donat|sadaqah|waqf|charity|contribute money)\b/i],
  ["sponsorship", /\b(sponsor|advertis|partnership|promote my)\b/i],
  ["content_reporting", /\b(report|flag)\b[^.?!]{0,25}\b(video|content|channel|creator|comment)\b|\breport (this|that|it)\b/i],
  ["moderation", /\b(moderat|removed|rejected|taken down|approved|appeal|strike|blocked|banned|suspend)\b/i],
  ["halal_compliance", /\b(halal|haram|music|female|women|awrah|permissible|islamically|shariah|shari'?a)\b/i],
  ["copyright", /\b(copyright|dmca|my content was used|stolen video|reupload)\b/i],
  ["privacy", /\b(privacy|personal (data|information)|gdpr|sell my data|tracking|cookies?|delete my data)\b/i],
  ["terms", /\b(terms|conditions|tos|agreement|eula|licen[cs]e)\b/i],
  ["safety", /\b(safe(ty)?|child|kids|harass|bully|abuse|threat|scam)\b/i],
  ["app_install", /\b(install|apk|app store|play store|testflight|add to home screen|pwa)\b/i],
  ["ios", /\b(ios|iphone|ipad|safari|apple)\b/i],
  ["android", /\b(android|samsung|xiaomi|chrome on my phone|play services)\b/i],
  ["website", /\b(website|desktop|browser|laptop|pc)\b/i],
  ["deep_links", /\b(deep ?link|shared link|link (doesn'?t|won'?t) open|opens in browser instead)\b/i],
  ["performance", /\b(slow|lag|freez|crash(es|ing)?|battery|data usage|heats?)\b/i],
  ["technical", /\b(error|bug|broken|not working|doesn'?t work|blank|white screen|stuck)\b/i],
];

/** Requests Heartify support must decline (scholarly, medical, legal, financial). */
const UNSUPPORTED_RULES: Array<[string, RegExp]> = [
  [
    "fatwa",
    /\b(fatwa|ruling on|permissible to|hukm|can i (pray|fast|marry|divorce)|zakat calculation for my|is (it|listening|watching|singing|playing|smoking|dating|working) [^?]*\b(halal|haram)\b|is [^?]{0,40}\b(halal|haram) (in islam|according to)\b)/i,
  ],
  ["medical", /\b(diagnos|symptom|medicine|dosage|am i (sick|pregnant)|mental illness treatment)\b/i],
  ["legal", /\b(sue|lawsuit|legal advice|represent me in court|is this legal in my country)\b/i],
  ["financial", /\b(investment advice|should i buy|stock tip|crypto advice)\b/i],
];

/**
 * Questions about Heartify's own halal standard are product questions, not
 * requests for a religious ruling — they must be answered from policy rather
 * than declined.
 */
const HEARTIFY_POLICY_CONTEXT = /\b(heartify|this app|the app|the platform|your (content|videos|policy|standard)|on heartify)\b/i;


export interface Classification {
  categories: SupportCategory[];
  primary: SupportCategory;
  unsupported: string | null;
}

export function classifyQuestion(rawQuestion: string): Classification {
  const q = (rawQuestion ?? "").toLowerCase();
  const categories: SupportCategory[] = [];
  for (const [cat, re] of CATEGORY_RULES) {
    if (re.test(q) && !categories.includes(cat)) categories.push(cat);
  }
  const unsupported = UNSUPPORTED_RULES.find(([, re]) => re.test(q))?.[0] ?? null;
  if (unsupported) categories.unshift("unsupported");
  if (categories.length === 0) categories.push("general_faq");
  return { categories: categories.slice(0, 6), primary: categories[0], unsupported };
}

// ---------------------------------------------------------------------------
// Static answers (Level 0 — no DB, no model)
// ---------------------------------------------------------------------------

export interface StaticAnswer {
  key: string;
  answer: string;
  /** Whitelisted action ids from `routes.ts`. */
  actionIds: string[];
  topic: SupportCategory;
  escalate?: boolean;
}

const GREETING = /^(as-?salamu?\s?alaykum[^a-z]*|salam|hi|hey|hello|good (morning|evening|afternoon))[\s!.,]*$/i;
const THANKS = /^(thanks?|thank you|jazak(allah)?( khair(an)?)?|shukran|much appreciated)[\s!.,]*$/i;
const WHO_ARE_YOU = /\b(who are you|what are you|are you (a )?(bot|human|ai|robot))\b/i;
const WHAT_CAN_YOU_DO = /\b(what can you (do|help with)|how can you help|what do you do)\b/i;
const HUMAN_REQUEST = /\b(human|real person|agent|someone from (the )?team|talk to support|speak to a person)\b/i;

/**
 * Answers that are true by construction — they describe the assistant itself or
 * are pure conversational glue. Never worth a model call or a cache row.
 */
export function staticAnswer(rawQuestion: string, opts: { signedIn: boolean }): StaticAnswer | null {
  const q = (rawQuestion ?? "").trim();
  if (!q) return null;

  if (GREETING.test(q)) {
    return {
      key: "greeting",
      topic: "general_faq",
      answer: "Wa alaykum as-salam. How can I help you with Heartify today?",
      actionIds: ["open_help"],
    };
  }
  if (THANKS.test(q)) {
    return {
      key: "thanks",
      topic: "general_faq",
      answer: "You're welcome. If anything else comes up, I'm here.",
      actionIds: [],
    };
  }
  if (WHO_ARE_YOU.test(q)) {
    return {
      key: "identity",
      topic: "general_faq",
      answer:
        "I'm the Heartify Help Assistant — an automated assistant that answers questions about using Heartify, " +
        "from Heartify's own help articles and policies. If I can't resolve something, I'll pass it to the Heartify team.",
      actionIds: ["open_help", "open_contact"],
    };
  }
  if (WHAT_CAN_YOU_DO.test(q)) {
    return {
      key: "capabilities",
      topic: "general_faq",
      answer:
        "I can help with your account and sign-in, playback and audio problems, favourites and history, Daily Dose, " +
        "notifications, membership and billing questions, reporting content, and Heartify's content, privacy and terms policies. " +
        "Ask in your own words and I'll take it from there.",
      actionIds: ["open_help"],
    };
  }
  if (HUMAN_REQUEST.test(q) && q.length < 120) {
    return {
      key: "human_handoff",
      topic: "general_faq",
      answer:
        "Of course. I've noted this for the Heartify team — you can also send the details from the Contact page and " +
        "they'll reply to your registered email.",
      actionIds: opts.signedIn ? ["open_contact", "open_profile"] : ["open_contact"],
      escalate: true,
    };
  }
  return null;
}

/** Safe refusal used for scholarly/medical/legal/financial requests. */
export function unsupportedAnswer(kind: string): StaticAnswer {
  const map: Record<string, string> = {
    fatwa:
      "I can't give religious rulings — please take that to a qualified scholar you trust. " +
      "What I can explain is how Heartify's own content rules classify and filter material on the platform.",
    medical:
      "I'm not able to help with medical questions. Please speak to a qualified health professional. " +
      "I can help with anything about using Heartify.",
    legal:
      "I can't give legal advice. For anything legal, please consult a qualified lawyer. " +
      "I can point you to Heartify's Terms of Service and Privacy Policy if that's useful.",
    financial:
      "I can't give financial or investment advice. I can help with Heartify membership, billing and donations questions.",
  };
  return {
    key: `unsupported_${kind}`,
    topic: "unsupported",
    answer: map[kind] ?? "That's outside what I can help with, but I can answer anything about using Heartify.",
    actionIds: kind === "legal" ? ["open_terms", "open_privacy_policy"] : ["open_help"],
  };
}

/** Reply shown when a turn tries to override instructions or extract internals. */
export const INJECTION_REFUSAL: StaticAnswer = {
  key: "injection_refused",
  topic: "unsupported",
  answer:
    "I can only help with questions about using Heartify, and I can't share anything about how I'm built or " +
    "configured. Tell me what you're trying to do in the app and I'll help with that.",
  actionIds: ["open_help"],
};

// ---------------------------------------------------------------------------
// Guided troubleshooting flows (Level 0)
// ---------------------------------------------------------------------------

export interface TroubleshootStep {
  /** Short instruction the user can act on immediately. */
  text: string;
}

export interface TroubleshootFlow {
  id: string;
  topic: SupportCategory;
  /** Question that narrows the diagnosis when the user hasn't told us yet. */
  clarifying: string;
  steps: TroubleshootStep[];
  actionIds: string[];
}

const PLATFORM_HINT = /\b(ios|iphone|ipad|android|samsung|chrome|safari|firefox|edge|desktop|laptop|browser|app|website)\b/i;

const FLOWS: Record<string, TroubleshootFlow> = {
  playback: {
    id: "playback",
    topic: "video_playback",
    clarifying: "Which device and app are you using — the iOS app, the Android app, or the website in a browser?",
    steps: [
      { text: "Try a different video: if only one video fails, the source may be unavailable and reporting it helps us replace it." },
      { text: "Switch network (mobile data to Wi-Fi or the reverse) — most playback stalls are network-side." },
      { text: "Fully close and reopen Heartify, or hard-refresh the page in your browser." },
      { text: "Disable any ad-blocker, VPN or content blocker for Heartify, then retry." },
      { text: "If it still fails on every video, tell me your device and browser and I'll pass the details to the team." },
    ],
    actionIds: ["open_status", "open_contact"],
  },
  audio: {
    id: "audio",
    topic: "audio",
    clarifying: "Is the problem with a specific reciter, or with all audio in the Listen section?",
    steps: [
      { text: "Check the device volume and the silent/mute switch, then raise the in-app volume." },
      { text: "Try another reciter or track — a single failing source is usually a broken audio file we can replace." },
      { text: "If audio stops when you lock the screen, allow background playback for Heartify in your device settings." },
      { text: "Reconnect any Bluetooth headphones, or test with them disconnected." },
    ],
    actionIds: ["open_listen", "open_contact"],
  },
  login: {
    id: "login",
    topic: "login",
    clarifying: "Are you signing in with email and password, or with Google?",
    steps: [
      { text: "Check the email address is the one you registered with — sign-in is case-insensitive but must match exactly." },
      { text: "If you signed up with Google, use the Google button rather than a password." },
      { text: "Request a password reset link and open it on the same device, within one hour." },
      { text: "If the reset email hasn't arrived, check spam and any filters, then wait a few minutes before requesting again." },
    ],
    actionIds: ["open_login", "open_forgot_password", "open_contact"],
  },
  notifications: {
    id: "notifications",
    topic: "notifications",
    clarifying: "Are you missing notifications on a phone app or in a desktop browser?",
    steps: [
      { text: "Open Heartify's notification settings and confirm the reminders you expect are switched on." },
      { text: "Allow notifications for Heartify in your device or browser system settings — a blocked permission overrides in-app settings." },
      { text: "On battery-saver or Doze modes, exclude Heartify so scheduled reminders can fire." },
      { text: "Re-enable one reminder to re-register the device, then wait for the next scheduled time." },
    ],
    actionIds: ["open_notification_settings", "open_help"],
  },
  performance: {
    id: "performance",
    topic: "performance",
    clarifying: "Is it slow everywhere in the app, or on one screen in particular?",
    steps: [
      { text: "Close other heavy apps or browser tabs and retry — Heartify streams video and needs free memory." },
      { text: "Update to the latest Heartify version, or hard-refresh the website." },
      { text: "Lower playback quality on a weak connection." },
      { text: "If one specific screen is slow, tell me which one and your device model." },
    ],
    actionIds: ["open_help", "open_contact"],
  },
  deep_links: {
    id: "deep_links",
    topic: "deep_links",
    clarifying: "Did the link open the wrong app, or nothing at all?",
    steps: [
      { text: "Make sure the Heartify app is installed and you've opened it once and signed in." },
      { text: "On Android, allow Heartify to open supported links in the app's default settings." },
      { text: "On iOS, open the link from Messages or Notes rather than inside another app's in-app browser." },
      { text: "Any Heartify link also works in a normal browser tab if the app won't take it." },
    ],
    actionIds: ["open_home", "open_help"],
  },
};

const FLOW_TRIGGERS: Array<[keyof typeof FLOWS, RegExp]> = [
  ["playback", /\b(video|videos|playback|player)\b[^.?!]{0,30}\b(not|won'?t|doesn'?t|isn'?t|stopped|fail|black|freez|buffer|stuck|error)\b|\b(can'?t|cannot) (watch|play)\b/i],
  ["audio", /\b(no sound|audio (not|won'?t|doesn'?t)|sound (not|isn'?t)|recitation (not|won'?t)|can'?t hear)\b/i],
  ["login", /\b(can'?t (log ?in|sign ?in)|login (not working|fails|failed)|locked out|invalid credentials|wrong password)\b/i],
  ["notifications", /\b(not (getting|receiving)|no|missing)\b[^.?!]{0,20}\b(notifications?|reminders?)\b/i],
  ["performance", /\b(slow|laggy|lags|freezing|crash(es|ing)?|keeps closing)\b/i],
  ["deep_links", /\b(link (doesn'?t|won'?t) open|shared link|deep ?link)\b/i],
];

/**
 * Match a technical complaint to a guided flow. Returns null for anything that
 * isn't a recognised troubleshooting shape, so normal questions fall through to
 * the knowledge layers.
 */
export function matchTroubleshootFlow(rawQuestion: string): TroubleshootFlow | null {
  const q = (rawQuestion ?? "").toLowerCase();
  for (const [id, re] of FLOW_TRIGGERS) {
    if (re.test(q)) return FLOWS[id];
  }
  return null;
}

/**
 * Render a flow as a support answer. When the user hasn't said which platform
 * they're on, the clarifying question is asked alongside the steps that are
 * useful regardless — never a dead-end "which device?" with no help attached.
 *
 * Deliberately makes no claim about service health: `statusKnown` stays false
 * unless a verified status signal is passed in.
 */
export function renderTroubleshootFlow(flow: TroubleshootFlow, rawQuestion: string): {
  answer: string;
  clarifying: string | null;
  actionIds: string[];
  topic: SupportCategory;
} {
  const knowsPlatform = PLATFORM_HINT.test(rawQuestion ?? "");
  const steps = flow.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n");
  const head = "Let's narrow this down — these are the checks that resolve it most often:";
  const tail = knowsPlatform
    ? "If none of that helps, tell me what you saw at the last step and I'll escalate it with the details."
    : flow.clarifying;
  return {
    answer: `${head}\n\n${steps}\n\n${tail}`,
    clarifying: knowsPlatform ? null : flow.clarifying,
    actionIds: flow.actionIds,
    topic: flow.topic,
  };
}

// ---------------------------------------------------------------------------
// Structured content reports (Level 3 — application data, no model)
// ---------------------------------------------------------------------------

export const REPORT_REASONS = [
  "inappropriate", "sexual_suggestive", "female_visual", "music", "gambling",
  "alcohol", "drugs", "violence", "misinformation", "copyright", "other",
] as const;

export type ReportReason = typeof REPORT_REASONS[number];

const REASON_RULES: Array<[ReportReason, RegExp]> = [
  ["sexual_suggestive", /\b(sexual|nude|nudity|porn|obscene|suggestive|indecent)\b/i],
  ["female_visual", /\b(female|woman|women|girl|uncovered|awrah)\b/i],
  ["music", /\b(music|song|instrument|beat|background music)\b/i],
  ["gambling", /\b(gambl|betting|casino|lottery)\b/i],
  ["alcohol", /\b(alcohol|beer|wine|drinking)\b/i],
  ["drugs", /\b(drugs?|cannabis|weed|cocaine|vap(e|ing)|smoking)\b/i],
  ["violence", /\b(violen|gore|blood|graphic|fight(ing)?|killing)\b/i],
  ["misinformation", /\b(misinformation|false|fake|misleading|lie[sd]?|wrong claim)\b/i],
  ["copyright", /\b(copyright|my video|stolen|reupload|without permission|dmca)\b/i],
  ["inappropriate", /\b(inappropriate|not halal|haram|offensive|disturbing)\b/i],
];

export interface ReportIntent {
  /** Video id when the user pasted one (YouTube-style id or Heartify uuid). */
  videoId: string | null;
  reason: ReportReason | null;
  /** Free-text context, already trimmed. */
  detail: string;
  /** What still has to be collected before a report can be filed. */
  missing: Array<"video" | "reason">;
}

const REPORT_INTENT = /\b(report|flag)\b[^.?!]{0,30}\b(video|content|channel|creator|clip|this|it)\b|\bthis (video|content) (is|has|shows)\b/i;
const YT_ID = /(?:youtube\.com\/watch\?v=|youtu\.be\/|\bv=)([A-Za-z0-9_-]{11})\b|\b([A-Za-z0-9_-]{11})\b(?=\s*$)/;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

/** Detect a "report this video" request and extract whatever is already known. */
export function detectReportIntent(rawQuestion: string): ReportIntent | null {
  const q = (rawQuestion ?? "").trim();
  if (!REPORT_INTENT.test(q)) return null;

  const uuid = q.match(UUID)?.[0] ?? null;
  const yt = uuid ? null : q.match(YT_ID);
  const videoId = uuid ?? yt?.[1] ?? yt?.[2] ?? null;
  const reason = REASON_RULES.find(([, re]) => re.test(q))?.[0] ?? null;

  const missing: Array<"video" | "reason"> = [];
  if (!videoId) missing.push("video");
  if (!reason) missing.push("reason");

  return { videoId, reason, detail: q.slice(0, 500), missing };
}

/** Prompt for whatever the report is still missing — never files a partial report. */
export function reportFollowUp(intent: ReportIntent): string {
  if (intent.missing.includes("video") && intent.missing.includes("reason")) {
    return "I can file that report for you. Which video is it — paste the link or open it and use the Report button — " +
      "and what's the concern (for example inappropriate content, music, misinformation or copyright)?";
  }
  if (intent.missing.includes("video")) {
    return "I can file that. Which video is it? Paste the link, or open the video and use the Report button there.";
  }
  return "Got the video. What's the concern — inappropriate content, sexual or suggestive content, female visual content, " +
    "music, gambling, alcohol, drugs, violence, misinformation, copyright, or something else?";
}

/** Confirmation shown once a structured report has actually been stored. */
export function reportConfirmation(reason: ReportReason): string {
  return `Thank you — I've filed a report under "${reason.replace(/_/g, " ")}". ` +
    "Heartify's moderation team reviews reports against the platform's content rules; a single report never " +
    "automatically penalises a creator. You can follow the outcome from your profile.";
}

/**
 * Map a user-facing reason onto the `video_reports.reason` enumeration the
 * moderation pipeline already understands. Anything without a precise match
 * lands in the haram/other buckets rather than being invented.
 */
export function toDbReportReason(reason: ReportReason): string {
  switch (reason) {
    case "sexual_suggestive": return "sexual_content";
    case "music": return "music_or_haram";
    case "gambling":
    case "alcohol":
    case "drugs":
    case "female_visual": return "music_or_haram";
    case "violence": return "violence";
    case "misinformation": return "misinformation";
    case "copyright": return "copyright";
    case "inappropriate": return "inappropriate_content";
    default: return "other";
  }
}
