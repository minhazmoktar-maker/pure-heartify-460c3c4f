import { RECITERS, surahAudioUrl, reciterById, type ReciterRecord } from "@/data/reciters";
import { SURAHS } from "@/data/surahs";
import type { Track } from "@/data/audio";
import albumQuran from "@/assets/album-quran.jpg";

/**
 * Build the 114-surah Track[] for a given reciter.
 * Returns an empty array when the reciter has no verified public mount.
 */
export function reciterQuranTracks(reciterId: string): Track[] {
  const r = reciterById(reciterId);
  if (!r || r.comingSoon || !r.mp3quranSlug) return [];
  return SURAHS.map((s) => trackFor(r, s.number, s.nameEn, s.nameAr, s.ayahs));
}

export function reciterHasAudio(r: ReciterRecord): boolean {
  return !r.comingSoon && Boolean(r.mp3quranSlug);
}

function trackFor(
  r: ReciterRecord,
  n: number,
  nameEn: string,
  nameAr: string,
  ayahs: number,
): Track {
  const url = surahAudioUrl(r, n) ?? "";
  return {
    id: `q-${r.id}-${n}`,
    title: `${n}. ${nameEn} — ${nameAr}`,
    artist: r.name,
    album: `Complete Qur'an — ${r.name}`,
    duration: "—",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "",
    url,
    language: "Arabic",
    description: `Surah ${nameEn} (${ayahs} āyāt) recited by ${r.name}.`,
    source: "mp3quran.net",
    tags: ["quran", r.id, nameEn.toLowerCase()],
    addedAt: "2026-07-01",
    popularity: 100 - n,
  };
}

export { RECITERS };
