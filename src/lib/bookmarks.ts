// Shared helpers for the /bookmarks surface. Any reader page can call
// `addBookmark({...})` to save an ayah, hadith, dua, or name of Allah.
// Storage is local-first (no server round-trip) and mirrors the shape used
// by src/pages/Bookmarks.tsx.

export type BookmarkKind = "ayah" | "hadith" | "dua" | "name";

export interface BookmarkItem {
  id: string;
  kind: BookmarkKind;
  title: string;
  reference: string;
  arabic?: string;
  translation?: string;
  note?: string;
  createdAt: string;
  href?: string;
}

const KEY = "heartify.bookmarks.v1";

function readAll(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(items: BookmarkItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listBookmarks(): BookmarkItem[] {
  return readAll();
}

export function isBookmarked(id: string): boolean {
  return readAll().some((i) => i.id === id);
}

export function addBookmark(item: Omit<BookmarkItem, "createdAt"> & { createdAt?: string }): BookmarkItem {
  const items = readAll();
  const existing = items.find((i) => i.id === item.id);
  if (existing) return existing;
  const next: BookmarkItem = { ...item, createdAt: item.createdAt ?? new Date().toISOString() };
  writeAll([next, ...items]);
  return next;
}

export function removeBookmark(id: string) {
  writeAll(readAll().filter((i) => i.id !== id));
}

export function toggleBookmark(item: Omit<BookmarkItem, "createdAt">): boolean {
  if (isBookmarked(item.id)) {
    removeBookmark(item.id);
    return false;
  }
  addBookmark(item);
  return true;
}
