// Hadith collections via fawazahmed0/hadith-api (public CDN, no key)
// https://github.com/fawazahmed0/hadith-api
export const HADITH_COLLECTIONS = [
  { id: "eng-bukhari", name: "Sahih al-Bukhari", books: 99, arabicId: "ara-bukhari" },
  { id: "eng-muslim", name: "Sahih Muslim", books: 56, arabicId: "ara-muslim" },
  { id: "eng-abudawud", name: "Sunan Abu Dawud", books: 43, arabicId: "ara-abudawud" },
  { id: "eng-tirmidhi", name: "Jami' at-Tirmidhi", books: 49, arabicId: "ara-tirmidhi" },
  { id: "eng-nasai", name: "Sunan an-Nasa'i", books: 51, arabicId: "ara-nasai" },
  { id: "eng-ibnmajah", name: "Sunan Ibn Majah", books: 37, arabicId: "ara-ibnmajah" },
  { id: "eng-nawawi", name: "40 Hadith Nawawi", books: 1, arabicId: "ara-nawawi" },
  { id: "eng-qudsi40", name: "40 Hadith Qudsi", books: 1, arabicId: "ara-qudsi40" },
] as const;

export type HadithEdition = (typeof HADITH_COLLECTIONS)[number];

export type Hadith = {
  hadithnumber: number;
  arabicnumber?: number;
  text: string;
  arabicText?: string;
  reference?: { book?: number; hadith?: number };
  grades?: { name: string; grade: string }[];
};

const BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";

export async function fetchHadithSection(edition: string, section: number = 1): Promise<Hadith[]> {
  const res = await fetch(`${BASE}/${edition}/sections/${section}.min.json`);
  if (!res.ok) {
    // Fall back to whole collection for small ones
    const full = await fetch(`${BASE}/${edition}.min.json`);
    if (!full.ok) throw new Error("Failed to load hadith");
    const data = await full.json();
    return (data.hadiths || []).slice(0, 40).map((h: any) => ({
      hadithnumber: h.hadithnumber,
      arabicnumber: h.arabicnumber,
      text: h.text,
      reference: h.reference,
      grades: h.grades,
    }));
  }
  const data = await res.json();
  return (data.hadiths || []).map((h: any) => ({
    hadithnumber: h.hadithnumber,
    arabicnumber: h.arabicnumber,
    text: h.text,
    reference: h.reference,
    grades: h.grades,
  }));
}

export async function fetchArabicSection(arabicEdition: string, section: number = 1): Promise<Map<number, string>> {
  try {
    const res = await fetch(`${BASE}/${arabicEdition}/sections/${section}.min.json`);
    if (!res.ok) return new Map();
    const data = await res.json();
    const map = new Map<number, string>();
    for (const h of data.hadiths || []) map.set(h.hadithnumber, h.text);
    return map;
  } catch {
    return new Map();
  }
}
