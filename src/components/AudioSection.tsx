import { useState, useMemo, useDeferredValue } from "react";
import {
  Crown, Sparkles, Download, Radio, Headphones, BookOpen, ShieldCheck,
  Search, Play, ChevronRight, Clock3, Flame, ListMusic,
} from "lucide-react";
import { motion } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import PlaylistCard from "@/components/PlaylistCard";
import TrackRow from "@/components/TrackRow";
import {
  playlists, tracks, audioCategories,
  type AudioCategory, type Track, type AudioLanguage,
} from "@/data/audio";
import { cn } from "@/lib/utils";

const PREMIUM_BENEFITS = [
  { icon: Radio, title: "Ad-free listening", desc: "Uninterrupted Qur'an, nasheeds and lectures." },
  { icon: BookOpen, title: "Exclusive lectures", desc: "Full tafsir series from featured scholars." },
  { icon: Download, title: "Offline downloads", desc: "Save any track for travel or airplane mode." },
  { icon: Headphones, title: "Studio-quality audio", desc: "High-fidelity streaming, up to 320 kbps." },
  { icon: ShieldCheck, title: "Verified halal library", desc: "Every track manually audited." },
  { icon: Sparkles, title: "Premium-only playlists", desc: "Ramadan mixes, deep tafsir series." },
];

const LANGUAGES: (AudioLanguage | "Any")[] = ["Any", "Arabic", "English", "Urdu", "Mixed"];
type DurationBand = "Any" | "Short" | "Medium" | "Long";
const DURATIONS: DurationBand[] = ["Any", "Short", "Medium", "Long"];

const toSeconds = (label: string): number => {
  const parts = label.split(":").map((n) => parseInt(n, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
};
const bandFor = (label: string): DurationBand => {
  const s = toSeconds(label);
  if (s <= 5 * 60) return "Short";
  if (s <= 30 * 60) return "Medium";
  return "Long";
};

const CollectionRow = ({
  title, subtitle, items, icon: Icon,
}: {
  title: string;
  subtitle?: string;
  items: Track[];
  icon?: React.ComponentType<{ className?: string }>;
}) => {
  const { playQueue } = usePlayer();
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            {title}
          </h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <button
          onClick={() => playQueue(items.filter((t) => !t.comingSoon && t.url), 0)}
          className="hidden items-center gap-1 text-xs font-semibold text-primary hover:underline sm:inline-flex"
        >
          <Play className="h-3 w-3" />Play all
        </button>
      </div>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {items.map((t) => (
          <button
            key={t.id}
            onClick={() => playQueue(items, items.indexOf(t))}
            disabled={t.comingSoon}
            className={cn(
              "group flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-xl bg-card text-left shadow-card transition-all hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <div className="relative aspect-square overflow-hidden">
              <img src={t.cover} alt="" loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg">
                  <Play className="ml-0.5 h-4 w-4 fill-primary-foreground text-primary-foreground" />
                </span>
              </div>
              {t.isPremium && (
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                  <Crown className="h-3 w-3" />PREMIUM
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.artist}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>{t.language}</span>·<span>{t.duration}</span>
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

const AudioSection = () => {
  const { isPremiumUser, togglePremium, playQueue, recent, playCounts } = usePlayer();

  const [audioCat, setAudioCat] = useState<AudioCategory>("All");
  const [language, setLanguage] = useState<AudioLanguage | "Any">("Any");
  const [durationBand, setDurationBand] = useState<DurationBand>("Any");
  const [speaker, setSpeaker] = useState<string>("Any");
  const [rawQuery, setRawQuery] = useState("");
  const query = useDeferredValue(rawQuery.trim().toLowerCase());

  const speakerOptions = useMemo(
    () => ["Any", ...Array.from(new Set(tracks.map((t) => t.artist))).sort()],
    [],
  );

  const filteredTracks = useMemo(() => {
    return tracks.filter((t) => {
      if (audioCat !== "All" && t.category !== audioCat) return false;
      if (language !== "Any" && t.language !== language) return false;
      if (durationBand !== "Any" && bandFor(t.duration) !== durationBand) return false;
      if (speaker !== "Any" && t.artist !== speaker) return false;
      if (query) {
        const hay = `${t.title} ${t.artist} ${t.album} ${t.tags.join(" ")} ${t.description}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [audioCat, language, durationBand, speaker, query]);

  const featured = useMemo(
    () => [...tracks].filter((t) => !t.comingSoon && t.url).sort((a, b) => b.popularity - a.popularity).slice(0, 8),
    [],
  );
  const recentlyAdded = useMemo(
    () => [...tracks].filter((t) => !t.comingSoon && t.url).sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 8),
    [],
  );
  const popularThisWeek = useMemo(() => {
    const ranked = [...tracks].filter((t) => !t.comingSoon && t.url).sort((a, b) => {
      const pa = (playCounts[a.id] ?? 0) * 100 + a.popularity;
      const pb = (playCounts[b.id] ?? 0) * 100 + b.popularity;
      return pb - pa;
    });
    return ranked.slice(0, 8);
  }, [playCounts]);
  const recommendedForYou = useMemo(() => {
    // Simple heuristic: prefer categories present in `recent`, then popularity.
    const recentCats = new Set(recent.map((t) => t.category));
    return [...tracks]
      .filter((t) => !t.comingSoon && t.url && !recent.some((r) => r.id === t.id))
      .sort((a, b) => {
        const ba = recentCats.has(a.category) ? 1 : 0;
        const bb = recentCats.has(b.category) ? 1 : 0;
        if (bb !== ba) return bb - ba;
        return b.popularity - a.popularity;
      })
      .slice(0, 8);
  }, [recent]);

  const playAll = () => {
    const q = filteredTracks.filter((t) => !t.comingSoon && t.url && (!t.isPremium || isPremiumUser));
    if (q.length > 0) playQueue(q, 0);
  };

  return (
    <section className="mx-auto max-w-[1800px] px-4 py-8 md:px-6">
      {/* Premium banner */}
      {!isPremiumUser ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-10 overflow-hidden rounded-3xl bg-gradient-hero p-6 md:p-10 shadow-card-hover"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-gold" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold/80">
                    Heartify Premium
                  </span>
                </div>
                <h2 className="mt-2 font-heading text-2xl font-bold text-cream md:text-3xl">
                  A quieter, richer way to listen.
                </h2>
                <p className="mt-2 max-w-xl text-sm text-cream/70">
                  Verified halal audio. Studio-grade streaming. Offline downloads.
                  Ad-free from the first āyah to the last.
                </p>
              </div>
              <button
                onClick={togglePremium}
                className="shrink-0 rounded-full bg-gold px-6 py-3 text-sm font-bold text-accent-foreground shadow-lg transition-all hover:brightness-110 hover:scale-[1.02]"
              >
                <Sparkles className="mr-1.5 inline h-4 w-4" />
                Request Premium access
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PREMIUM_BENEFITS.map((b) => (
                <div key={b.title} className="flex items-start gap-2.5 rounded-xl bg-background/10 p-3 backdrop-blur-sm ring-1 ring-cream/10">
                  <b.icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div>
                    <p className="text-xs font-semibold text-cream">{b.title}</p>
                    <p className="text-[11px] text-cream/70">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="mb-6 flex items-center gap-2">
          <Crown className="h-5 w-5 text-gold" />
          <span className="text-sm font-semibold text-gold">Premium Active</span>
        </div>
      )}

      {/* Featured playlists */}
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Featured Collections</h2>
          <p className="text-xs text-muted-foreground">Hand-picked playlists for daily practice.</p>
        </div>
      </div>
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {playlists.map((pl, i) => (
          <PlaylistCard key={pl.id} playlist={pl} index={i} />
        ))}
      </div>

      {/* Continue listening */}
      {recent.length > 0 && (
        <CollectionRow
          title="Continue listening"
          subtitle="Pick up where you left off."
          items={recent.slice(0, 8)}
          icon={Clock3}
        />
      )}

      <CollectionRow
        title="Popular this week"
        subtitle="What the community is listening to."
        items={popularThisWeek}
        icon={Flame}
      />

      <CollectionRow
        title="Recently added"
        subtitle="Freshly curated audio."
        items={recentlyAdded}
        icon={Sparkles}
      />

      {recommendedForYou.length > 0 && (
        <CollectionRow
          title="Recommended for you"
          subtitle="Based on what you've been listening to."
          items={recommendedForYou}
          icon={ChevronRight}
        />
      )}

      {/* Browse */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListMusic className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-xl font-bold text-foreground">Browse the library</h2>
        </div>
        <button
          onClick={playAll}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
        >
          <Play className="mr-1 inline h-3 w-3" />
          Play {filteredTracks.length > 0 ? `${filteredTracks.length} tracks` : "all"}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Search Premium — title, speaker, tag…"
            className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Search Premium audio"
          />
        </label>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap gap-2">
        {audioCategories.map((cat) => (
          <button key={cat} onClick={() => setAudioCat(cat)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              audioCat === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-muted",
            )}>
            {cat}
          </button>
        ))}
      </div>
      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        <select
          value={language} onChange={(e) => setLanguage(e.target.value as AudioLanguage | "Any")}
          aria-label="Filter by language"
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none">
          {LANGUAGES.map((l) => <option key={l} value={l}>Language: {l}</option>)}
        </select>
        <select
          value={durationBand} onChange={(e) => setDurationBand(e.target.value as DurationBand)}
          aria-label="Filter by duration"
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none">
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              Duration: {d === "Short" ? "Short (≤5m)" : d === "Medium" ? "Medium (≤30m)" : d === "Long" ? "Long (30m+)" : "Any"}
            </option>
          ))}
        </select>
        <select
          value={speaker} onChange={(e) => setSpeaker(e.target.value)}
          aria-label="Filter by speaker"
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none">
          {speakerOptions.map((s) => <option key={s} value={s}>Speaker: {s}</option>)}
        </select>
      </div>

      {/* Track list */}
      {filteredTracks.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <Search className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Nothing matched your filters.</p>
          <p className="text-xs text-muted-foreground">
            Try clearing the search, switching category, or widening the language filter.
          </p>
          <button
            onClick={() => { setRawQuery(""); setAudioCat("All"); setLanguage("Any"); setDurationBand("Any"); setSpeaker("Any"); }}
            className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="space-y-0.5" role="list" aria-label="Track list">
          {filteredTracks.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} queue={filteredTracks} showAlbum />
          ))}
        </div>
      )}

      {/* Keyboard hint */}
      <p className="mt-8 text-center text-[11px] text-muted-foreground/70">
        Keyboard: <kbd className="rounded border border-border px-1">Space</kbd> play/pause ·
        <kbd className="mx-1 rounded border border-border px-1">←/→</kbd> seek 10s ·
        <kbd className="mx-1 rounded border border-border px-1">⇧</kbd> +
        <kbd className="mx-1 rounded border border-border px-1">←/→</kbd> prev/next ·
        <kbd className="mx-1 rounded border border-border px-1">M</kbd> mute ·
        <kbd className="mx-1 rounded border border-border px-1">S</kbd> shuffle ·
        <kbd className="mx-1 rounded border border-border px-1">R</kbd> repeat
      </p>
    </section>
  );
};

export default AudioSection;
