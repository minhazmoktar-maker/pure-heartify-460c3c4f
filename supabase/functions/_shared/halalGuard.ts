/**
 * Strict Halal guard — the single source of truth for last-mile content
 * safety on every read path (surfaces, feed, search, related).
 *
 * Two tiers, mirroring the SQL helpers `halal_deny_tier1_pattern()` and
 * `halal_deny_tier2_pattern()` so the DB and the edge agree byte-for-byte:
 *
 *   TIER 1 — ALWAYS blocked for every user, strict mode or not.
 *   TIER 2 — blocked only when the user has Strict Halal enabled (default).
 *
 * Plus a visual gate: once the AI thumbnail worker populates
 * `visual_state`, anything it flags is blocked in both modes; `unchecked`
 * is allowed (the catalog is not fully swept yet) so the guard degrades
 * safely instead of emptying the app.
 */

export const TIER1_RE =
  /(^|[^a-z])(female|females|woman|women|womens|girl|girls|actress|actresses|ustadha|shaykha|singer|singers|karaoke|rapper|hiphop|kpop|k-pop|kdrama|k-drama|twerk|belly ?dance|dancer|dancing|choreography|makeup artist|grwm|ootd|skincare|lookbook|cosmetics|celebrity|celebrities|gossip|dating|boyfriend|girlfriend|flirt|nude|nudity|sexy|porn|pornstar|onlyfans|bikini|lingerie|swimsuit|escort|stripper|casino|gambling|betting|lottery|tiktok|netflix|hollywood|bollywood|lollywood|music video|official music|official audio|official video|lyric video)($|[^a-z])/;

export const ARABIC_FEMALE_RE =
  /(المتسابقة|متسابقة|المتسابقات|القارئة|قارئة|القارئات|المقرئة|مقرئة|الطالبة|طالبة|الطفلة|طفلة|الشيخة|شيخة|الأستاذة|أستاذة|الاستاذة|الدكتورة|دكتورة|الفتاة|فتاة|فتيات|البنت|بنات|امرأة|المرأة|نساء|النساء|سيدة|السيدة|سيدات|الأخت|الاخت|أخواتي|اخواتي|مغنية|راقصة|ممثلة|أغنية|اغنية|أغاني|اغاني|موسيقى|موسيقية)/;

/**
 * Multilingual female / music / entertainment indicators. Mirrors the SQL
 * helpers `halal_deny_female_intl_latin_pattern()` and
 * `halal_deny_female_intl_script_pattern()`.
 */
export const INTL_FEMALE_RE =
  /(^|[^a-z])(feminism|feminist|feminista|hermana|hermanas|mujer|mujeres|chica|chicas|cantante|cantora|femme|femmes|fille|filles|soeur|chanson|chanteuse|musique|wanita|perempuan|muslimah|ustazah|ustadzah|penyanyi|nyanyian|nasyid|lagu|kadin|kiz|sarki|muzik|hanim|frau|frauen|maedchen|saengerin|lied|mulher|mulheres|menina|mwanamke|wanawake|wimbo|khawateen|aurat|aurton|larki|larkiyan|mahila|naari|ladki|gaana|sangeet|ashram|bhajan|kirtan|satsang|gurupurnima|bhagavad|mandir|diwali)($|[^a-z])/;

export const INTL_FEMALE_SCRIPT_RE =
  /(মহিলা|নারী|মেয়ে|মেয়েদের|গায়িকা|গান|সঙ্গীত|خواتین|عورت|عورتیں|لڑکی|لڑکیاں|گانا|گانے|موسیقی|نغمہ|महिला|नारी|लड़की|लड़कियों|गायिका|गाना|संगीत|गुरुपूर्णिमा)/;

/** Channels excluded platform-wide regardless of individual video titles. */
export const BLOCKED_CHANNELS = new Set([
  "kitsuna", "zayan my", "amma", "academy of knowledge", "stanford online",
  "stanford graduate school of business", "deeplearningai", "andrew huberman",
  "huberman lab", "huberman lab clips", "faithful finance", "ted", "tedx",
  "islam on demand", "iqra tv", "iqraa tv",
  "diyanettv",
  "ruhan islamic tv",
  "tv alhijrah official",
  "aj+ كبريت",
  "pownews",
  "talktv",
  "cnbc-tv18",
  "cbn news",
  "roya news english",
  "atn bangla news",
  "news18 urdu",
  "newsx live",
  "99tv telugu",
  "kitco news",
  "din newsletter",
  "bbc earth",
  "bbc earth kids",
  "lex fridman",
  "maher zain",
  "pacific ghanaian adventist fellowship pagaf tv",
  "devour power tv",
]);

/** Named female presenters/speakers excluded platform-wide. */
export const FEMALE_NAMES_RE =
  /(^|[^a-z])(yvonne ridl[ae]y|haleh banani|mehreen|mia yilin|leila hormozi|layla hormozi|lauren booth|na[ai]ma b\.? robert|yasmin mogahed|nouran hussein)($|[^a-z])/;

export const TIER2_RE =
  /(^|[^a-z])(lady|ladies|sister|sisters|aunty|song|songs|music|musical|musician|musicians|band|concert|album|lyrics|remix|soundtrack|nasheed|nasheeds|anasheed|qaseeda|dance|fashion|beauty|makeup|hairstyle|outfit|jewellery|jewelry|drama|anime|manga|cartoon|movie|movies|trailer|romance|romantic|kiss|kissing|crush|prank|vlog|vlogs|vlogger|funny|comedy|standup|meme|memes|gaming|gameplay|fortnite|pubg|minecraft|reaction video|talk show)($|[^a-z])/;

/**
 * Narrow allow-list of benign phrases that would otherwise trip a tier-2
 * token (e.g. "makeup missed prayers", "sisters in Islam Q&A" is still
 * blocked, but "make up missed fasts" is not). Checked before tier 2 only.
 */
const TIER2_FALSE_POSITIVE_RE =
  /(mak(e|ing)?[ -]?up (missed|your missed|the missed)|make up (missed|for missed)|comedy of errors)/;

export interface HalalAssessInput {
  title?: string | null;
  channel_title?: string | null;
  visual_state?: string | null;
}

export interface HalalVerdict {
  allowed: boolean;
  tier: 0 | 1 | 2 | 3;
  reason: string | null;
}

const BAD_VISUAL = new Set(["female_detected", "music", "flagged", "rejected", "haram"]);

/**
 * @param strict when true (default for all users) tier-2 terms are blocked too.
 */
export function assessStrict(v: HalalAssessInput, strict = true): HalalVerdict {
  const text = `${v.title ?? ""} ${v.channel_title ?? ""}`.toLowerCase();

  const channel = (v.channel_title ?? "").trim().toLowerCase();
  if (channel && BLOCKED_CHANNELS.has(channel)) {
    return { allowed: false, tier: 1, reason: "blocked_channel" };
  }

  if (TIER1_RE.test(text)) return { allowed: false, tier: 1, reason: "tier1_text" };
  if (FEMALE_NAMES_RE.test(text)) return { allowed: false, tier: 1, reason: "tier1_female_name" };

  // Arabic female/music indicators. Kept as its own pattern because the
  // Latin word-boundary classes in TIER1_RE can never match Arabic script.
  const raw = `${v.title ?? ""} ${v.channel_title ?? ""}`;
  if (ARABIC_FEMALE_RE.test(raw)) return { allowed: false, tier: 1, reason: "tier1_arabic" };
  if (INTL_FEMALE_RE.test(text)) return { allowed: false, tier: 1, reason: "tier1_intl" };
  if (INTL_FEMALE_SCRIPT_RE.test(raw)) return { allowed: false, tier: 1, reason: "tier1_intl_script" };

  const vs = (v.visual_state ?? "unchecked").toLowerCase();
  if (BAD_VISUAL.has(vs)) return { allowed: false, tier: 3, reason: `visual:${vs}` };

  if (strict && !TIER2_FALSE_POSITIVE_RE.test(text) && TIER2_RE.test(text)) {
    return { allowed: false, tier: 2, reason: "tier2_text" };
  }

  return { allowed: true, tier: 0, reason: null };
}

/** Convenience filter for arrays of video-ish rows. */
export function filterStrict<T extends HalalAssessInput>(items: T[], strict = true): T[] {
  return items.filter((i) => assessStrict(i, strict).allowed);
}
