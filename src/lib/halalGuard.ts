/**
 * Client-side last-mile halal guard. Mirrors the edge guard
 * (`supabase/functions/_shared/halalGuard.ts`) so nothing prohibited can
 * render even if a cached or third-party response slips through.
 */
export const TIER1_RE =
  /(^|[^a-z])(female|females|woman|women|womens|girl|girls|actress|actresses|ustadha|shaykha|singer|singers|karaoke|rapper|hiphop|kpop|k-pop|kdrama|k-drama|twerk|belly ?dance|dancer|dancing|choreography|makeup artist|grwm|ootd|skincare|lookbook|cosmetics|celebrity|celebrities|gossip|dating|boyfriend|girlfriend|flirt|nude|nudity|sexy|porn|pornstar|onlyfans|bikini|lingerie|swimsuit|escort|stripper|casino|gambling|betting|lottery|tiktok|netflix|hollywood|bollywood|lollywood|music video|official music|official audio|official video|lyric video)($|[^a-z])/;

export const ARABIC_FEMALE_RE =
  /(المتسابقة|متسابقة|المتسابقات|القارئة|قارئة|القارئات|المقرئة|مقرئة|الطالبة|طالبة|الطفلة|طفلة|الشيخة|شيخة|الأستاذة|أستاذة|الاستاذة|الدكتورة|دكتورة|الفتاة|فتاة|فتيات|البنت|بنات|امرأة|المرأة|نساء|النساء|سيدة|السيدة|سيدات|الأخت|الاخت|أخواتي|اخواتي|مغنية|راقصة|ممثلة|أغنية|اغنية|أغاني|اغاني|موسيقى|موسيقية)/;

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
  if (TIER1_RE.test(text)) return false;
  if (ARABIC_FEMALE_RE.test(raw)) return false;
  if (strict && !TIER2_FALSE_POSITIVE_RE.test(text) && TIER2_RE.test(text)) return false;
  return true;
}

export function filterHalal<T extends { title?: string | null; channelTitle?: string | null }>(
  items: T[],
  strict = true,
): T[] {
  return items.filter((i) => isHalalAllowed(i, strict));
}
