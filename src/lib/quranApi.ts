/**
 * Thin client for the public al-quran.cloud API.
 * No auth key required. All endpoints return JSON with { code, status, data }.
 * Docs: https://alquran.cloud/api
 */

export interface SurahMeta {
  number: number;
  name: string; // Arabic
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan";
}

export interface Ayah {
  number: number; // global ayah number
  numberInSurah: number;
  text: string;
  audio?: string;
  audioSecondary?: string[];
}

export interface SurahDetail extends SurahMeta {
  ayahs: Ayah[];
  edition?: { identifier: string; language: string; name: string; englishName: string };
}

const BASE = "https://api.alquran.cloud/v1";

/** Verified public editions (identifier -> label). Keep this list small and known-good. */
export const AUDIO_EDITIONS = [
  { id: "ar.alafasy", label: "Mishary Alafasy" },
  { id: "ar.abdulbasitmurattal", label: "Abdul Basit (Murattal)" },
  { id: "ar.husary", label: "Mahmoud Al-Husary" },
  { id: "ar.minshawi", label: "Muhammad Al-Minshawi" },
  { id: "ar.hudhaify", label: "Ali Al-Hudhaify" },
] as const;

export const TRANSLATION_EDITIONS = [
  { id: "en.sahih", label: "English — Saheeh International" },
  { id: "en.pickthall", label: "English — Pickthall" },
  { id: "en.yusufali", label: "English — Yusuf Ali" },
  { id: "ur.jalandhry", label: "Urdu — Jalandhry" },
  { id: "fr.hamidullah", label: "French — Hamidullah" },
  { id: "id.indonesian", label: "Indonesian" },
  { id: "tr.diyanet", label: "Turkish — Diyanet" },
  { id: "bn.bengali", label: "Bengali — Muhiuddin Khan" },
] as const;

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Quran API ${res.status}`);
  const body = await res.json();
  if (body.code !== 200) throw new Error(body.status ?? "Quran API error");
  return body.data as T;
}

export const listSurahs = () => j<SurahMeta[]>(`${BASE}/surah`);

export const getSurahArabic = (n: number) =>
  j<SurahDetail>(`${BASE}/surah/${n}/quran-uthmani`);

export const getSurahAudio = (n: number, edition: string) =>
  j<SurahDetail>(`${BASE}/surah/${n}/${edition}`);

export const getSurahTranslation = (n: number, edition: string) =>
  j<SurahDetail>(`${BASE}/surah/${n}/${edition}`);
