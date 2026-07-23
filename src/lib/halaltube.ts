// Helpers for linking Heartify scholars to HalalTube lectures.
// HalalTube speaker pages live at https://halaltube.com/speaker/{slug}
// and search lives at https://halaltube.com/?s={query}.

export function halaltubeSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/['’`."]/g, "")
    .replace(/\b(sheikh|shaykh|shaikh|imam|mufti|dr|hafiz|maulana|ustadh|ustaz|qari)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function halaltubeSpeakerUrl(name: string): string {
  return `https://halaltube.com/speaker/${halaltubeSlug(name)}`;
}

export function halaltubeSearchUrl(query: string): string {
  return `https://halaltube.com/?s=${encodeURIComponent(query.trim())}`;
}
