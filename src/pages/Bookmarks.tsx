import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookOpen, BookText, Trash2, Search, StickyNote, Save, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const STORAGE_KEY = "heartify.bookmarks.v1";

type BookmarkKind = "ayah" | "hadith" | "dua" | "name";

interface BookmarkItem {
  id: string;
  kind: BookmarkKind;
  title: string;
  reference: string; // e.g. "Surah 2:255" or "Bukhari 1:1"
  arabic?: string;
  translation?: string;
  note?: string;
  createdAt: string; // ISO
  href?: string; // deep link back into reader
}

function loadAll(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAll(items: BookmarkItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const kindMeta: Record<BookmarkKind, { label: string; icon: typeof BookOpen }> = {
  ayah: { label: "Ayah", icon: BookOpen },
  hadith: { label: "Hadith", icon: BookText },
  dua: { label: "Dua", icon: Bookmark },
  name: { label: "Name", icon: Bookmark },
};

const Bookmarks = () => {
  const [items, setItems] = useState<BookmarkItem[]>(loadAll);
  const [tab, setTab] = useState<"all" | BookmarkKind>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    saveAll(items);
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (tab !== "all") list = list.filter((i) => i.kind === tab);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((i) =>
        [i.title, i.reference, i.translation, i.note].some((s) => s?.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [items, tab, query]);

  const counts = useMemo(() => {
    return {
      all: items.length,
      ayah: items.filter((i) => i.kind === "ayah").length,
      hadith: items.filter((i) => i.kind === "hadith").length,
      dua: items.filter((i) => i.kind === "dua").length,
      name: items.filter((i) => i.kind === "name").length,
    };
  }, [items]);

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast("Bookmark removed.");
  };

  const startEdit = (item: BookmarkItem) => {
    setEditing(item.id);
    setNoteDraft(item.note ?? "");
  };

  const saveNote = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, note: noteDraft.trim() || undefined } : i)));
    setEditing(null);
    toast("Note saved.");
  };

  const clearAll = () => {
    if (!items.length) return;
    if (!confirm("Remove all bookmarks?")) return;
    setItems([]);
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Bookmarks — saved ayat, hadith & duas"
        description="Your saved ayat, hadith, duas, and names of Allah with private notes."
        path="/bookmarks"
      />
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <SectionHeader
          title="Bookmarks"
          description={`${counts.all} saved item${counts.all === 1 ? "" : "s"} · private, stored on this device.`}
          icon={Bookmark}
          className="mb-6"
          actions={items.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Clear
            </Button>
          ) : undefined}
        />


        <div className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bookmarks, references, notes…"
              className="pl-9"
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All · {counts.all}</TabsTrigger>
            <TabsTrigger value="ayah">Ayat · {counts.ayah}</TabsTrigger>
            <TabsTrigger value="hadith">Hadith · {counts.hadith}</TabsTrigger>
            <TabsTrigger value="dua">Duas · {counts.dua}</TabsTrigger>
            <TabsTrigger value="name">Names · {counts.name}</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-6">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No bookmarks yet"
                description="Save ayat from the Quran, hadith from the library, or duas from Adhkar. They will appear here — with your private notes and reflections."
                actionLabel="Open Quran"
                actionHref="/quran"
                secondaryAction={
                  <>
                    <Link to="/hadith" className="tap-target inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold transition-transform hover:bg-accent active:scale-[0.97]">
                      Open Hadith
                    </Link>
                    <Link to="/adhkar" className="tap-target inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold transition-transform hover:bg-accent active:scale-[0.97]">
                      Open Adhkar
                    </Link>
                  </>
                }
              />
            ) : (
              <ul className="space-y-3">
                {filtered.map((item) => {
                  const Icon = kindMeta[item.kind].icon;
                  const isEditing = editing === item.id;
                  return (
                    <li key={item.id}>
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {kindMeta[item.kind].label}
                              </span>
                              <span className="text-xs text-muted-foreground">{item.reference}</span>
                            </div>
                            <h3 className="mt-1 font-medium text-foreground">{item.title}</h3>
                            {item.arabic && (
                              <p className="mt-2 text-right font-heading text-lg leading-relaxed text-foreground" dir="rtl">
                                {item.arabic}
                              </p>
                            )}
                            {item.translation && (
                              <p className="mt-2 text-sm text-muted-foreground">{item.translation}</p>
                            )}

                            {isEditing ? (
                              <div className="mt-3 space-y-2">
                                <Textarea
                                  value={noteDraft}
                                  onChange={(e) => setNoteDraft(e.target.value)}
                                  placeholder="Add a private note or reflection…"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => saveNote(item.id)}>
                                    <Save className="mr-1.5 h-3.5 w-3.5" /> Save note
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                                    <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : item.note ? (
                              <div className="mt-3 rounded-md border border-border bg-secondary/50 p-3 text-sm">
                                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  <StickyNote className="h-3 w-3" /> Note
                                </div>
                                <p className="whitespace-pre-wrap text-foreground">{item.note}</p>
                              </div>
                            ) : null}

                            <div className="mt-3 flex flex-wrap gap-2">
                              {!isEditing && (
                                <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                                  <StickyNote className="mr-1.5 h-3.5 w-3.5" />
                                  {item.note ? "Edit note" : "Add note"}
                                </Button>
                              )}
                              {item.href && (
                                <Link to={item.href}>
                                  <Button size="sm" variant="ghost">Open</Button>
                                </Link>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeItem(item.id)}
                                className="ml-auto text-destructive hover:text-destructive"
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        <Card className="mt-8 p-5">
          <h2 className="mb-1 font-heading text-base font-semibold text-foreground">How to add bookmarks</h2>
          <p className="text-sm text-muted-foreground">
            Any part of the app can save here by pushing an item into <code className="rounded bg-secondary px-1">localStorage["heartify.bookmarks.v1"]</code>.
            Reader pages will surface a bookmark button as we roll it out per surface.
          </p>
        </Card>
      </main>
    </div>
  );
};

export default Bookmarks;
