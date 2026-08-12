/**
 * Client-side last-mile halal guard. Mirrors the edge guard
 * (`supabase/functions/_shared/halalGuard.ts`) so nothing prohibited can
 * render even if a cached or third-party response slips through.
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
  /(মহিলা|নারী|মেয়ে|মেয়েদের|গায়িকা|গান|সঙ্গীত|خواتین|عورت|عورتیں|لڑکی|لڑکیاں|گانا|گانے|موسیقی|نغمہ|महिला|नारी|लड़की|लड़कियों|गायिका|गाना|संगीत|गुरुपूर्णिमा)/;

/** Channels excluded platform-wide regardless of individual video titles. */
export const BLOCKED_CHANNELS = [
  "kitsuna",
  "zayan my",
  "amma",
  "academy of knowledge",
  "stanford online",
  "stanford graduate school of business",
  "deeplearningai",
  "andrew huberman",
  "huberman lab",
  "huberman lab clips",
  "faithful finance",
  "ted",
  "tedx",
  "islam on demand",
  "iqra tv",
  "iqraa tv",
];


/** Named female presenters/speakers excluded platform-wide. */
export const FEMALE_NAMES_RE =
  /(^|[^a-z])(yvonne ridl[ae]y|haleh banani|mehreen|mia yilin|leila hormozi|layla hormozi|lauren booth|na[ai]ma b\.? robert|yasmin mogahed|nouran hussein)($|[^a-z])/;

export const TIER2_RE =
  /(^|[^a-z])(lady|ladies|sister|sisters|aunty|song|songs|music|musical|musician|musicians|band|concert|album|lyrics|remix|soundtrack|nasheed|nasheeds|anasheed|qaseeda|dance|fashion|beauty|makeup|hairstyle|outfit|jewellery|jewelry|drama|anime|manga|cartoon|movie|movies|trailer|romance|romantic|kiss|kissing|crush|prank|vlog|vlogs|vlogger|funny|comedy|standup|meme|memes|gaming|gameplay|fortnite|pubg|minecraft|reaction video|talk show)($|[^a-z])/;

const TIER2_FALSE_POSITIVE_RE =
  /(mak(e|ing)?[ -]?up (missed|your missed|the missed)|make up (missed|for missed)|comedy of errors)/;

export function isHalalAllowed(
  input: { title?: string | null; channelTitle?: string | null; channel_title?: string | null },
  strict = true,
): boolean {
  const raw = `${input.title ?? ""} ${input.channelTitle ?? input.channel_title ?? ""}`;
  const text = raw.toLowerCase();
  const channel = (input.channelTitle ?? input.channel_title ?? "").trim().toLowerCase();
  if (channel && BLOCKED_CHANNELS.includes(channel)) return false;
  if (TIER1_RE.test(text)) return false;
  if (FEMALE_NAMES_RE.test(text)) return false;
  if (ARABIC_FEMALE_RE.test(raw)) return false;
  if (INTL_FEMALE_RE.test(text)) return false;
  if (INTL_FEMALE_SCRIPT_RE.test(raw)) return false;
  if (strict && !TIER2_FALSE_POSITIVE_RE.test(text) && TIER2_RE.test(text)) return false;
  return true;

}

export function filterHalal<T extends { title?: string | null; channelTitle?: string | null }>(
  items: T[],
  strict = true,
): T[] {
  return items.filter((i) => isHalalAllowed(i, strict));
}
