import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Play, MapPin, Mic2, BookOpen, ChevronLeft, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { usePlayer } from "@/contexts/PlayerContext";
import { RECITERS, reciterHasAudio, reciterQuranTracks } from "@/data/reciterCatalog";
import { reciterById } from "@/data/reciters";
import { SURAHS } from "@/data/surahs";
import { SPEAKERS, speakerSearchPath } from "@/data/speakers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * The Listen destination.
 *
 * Structure:
 *   • Reciters rail — every requested Qari; playable ones stream the whole
 *     Qur'an from mp3quran.net, unavailable ones show as "Coming soon" so
 *     the UI never plays the wrong recording.
 *   • Reciter detail panel — 114-surah picker + "Play whole Qur'an" CTA.
 *   • Speakers rail — every requested da'ee; each card deep-links to the
 *     halal-first search pipeline scoped to reviewed lectures.
 */
export default function Listen() {
  const { playQueue, currentTrack } = usePlayer();
  const [selectedReciterId, setSelectedReciterId] = useState<string | null>(null);
  const [tab, setTab] = useState<"reciters" | "scholars">("reciters");
  const [reciterQuery, setReciterQuery] = useState("");
  const [speakerQuery, setSpeakerQuery] = useState("");


  const selectedReciter = selectedReciterId ? reciterById(selectedReciterId) : null;
  const surahTracks = useMemo(
    () => (selectedReciterId ? reciterQuranTracks(selectedReciterId) : []),
    [selectedReciterId],
  );

  const filteredReciters = useMemo(() => {
    const q = reciterQuery.trim().toLowerCase();
    if (!q) return RECITERS;
    return RECITERS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q),
    );
  }, [reciterQuery]);

  const filteredSpeakers = useMemo(() => {
    const q = speakerQuery.trim().toLowerCase();
    if (!q) return SPEAKERS;
    return SPEAKERS.filter((s) => s.name.toLowerCase().includes(q));
  }, [speakerQuery]);

  const playWholeQuran = (reciterId: string) => {
    const tracks = reciterQuranTracks(reciterId);
    if (tracks.length === 0) {
      toast.info("This reciter's recording is being verified. Coming soon.");
      return;
    }
    playQueue(tracks, 0);
    toast.success(`Playing the whole Qur'an — ${tracks[0].artist}`);
  };

  const playSurah = (reciterId: string, surahIndex: number) => {
    const tracks = reciterQuranTracks(reciterId);
    if (tracks.length === 0) return;
    playQueue(tracks, surahIndex);
  };

  return (
    <>
      <SEO
        title="Listen — Qur'an & Halal Lectures"
        description="Stream the whole Qur'an from the world's most beloved reciters and browse reviewed lectures from over 100 trusted scholars, all halal-first."
        path="/listen"
      />
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-4 md:px-6 md:pt-8">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Mic2 className="h-3.5 w-3.5" />
            Listen
          </div>
          <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">
            The whole Qur'an. Trusted voices. Zero noise.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Pick a reciter to play all 114 surahs, or browse over one hundred
            scholars whose lectures are reviewed through Heartify's halal-first
            pipeline.
          </p>
        </header>

        {selectedReciter ? (
          <ReciterDetail
            reciter={selectedReciter}
            tracks={surahTracks}
            currentId={currentTrack?.id ?? null}
            onBack={() => setSelectedReciterId(null)}
            onPlayAll={() => playWholeQuran(selectedReciter.id)}
            onPlaySurah={(idx) => playSurah(selectedReciter.id, idx)}
          />
        ) : (
          <>
            {/* ==================== RECITERS ==================== */}
            <section aria-labelledby="reciters-heading" className="mb-14">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="reciters-heading" className="font-heading text-2xl font-bold">
                    Qur'an Reciters
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {RECITERS.length} reciters • full mus'haf • streaming from
                    mp3quran.net
                  </p>
                </div>
                <input
                  type="search"
                  value={reciterQuery}
                  onChange={(e) => setReciterQuery(e.target.value)}
                  placeholder="Search reciters or cities"
                  className="min-h-[44px] w-full max-w-xs rounded-pill border border-border bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredReciters.map((r) => {
                  const playable = reciterHasAudio(r);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedReciterId(r.id)}
                        className={cn(
                          "group flex h-full w-full flex-col rounded-card border bg-card p-4 text-left transition-colors",
                          "min-h-[128px] pressable",
                          "hover:border-primary/50 hover:bg-card/80",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Mic2 className="h-5 w-5" />
                          </div>
                          {playable ? (
                            <span className="rounded-pill bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                              ✓ Full Qur'an
                            </span>
                          ) : (
                            <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Coming soon
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex-1">
                          <p className="line-clamp-2 font-semibold leading-tight">
                            {r.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" aria-hidden />
                            {r.location}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "mt-3 inline-flex items-center gap-1 text-xs font-medium",
                            playable ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          <Play className="h-3 w-3" aria-hidden />
                          {playable ? "Open & listen" : "View details"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* ==================== SPEAKERS ==================== */}
            <section aria-labelledby="speakers-heading">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="speakers-heading" className="font-heading text-2xl font-bold">
                    Lectures by Speaker
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {SPEAKERS.length} scholars • reviewed lectures only • halal-first
                  </p>
                </div>
                <input
                  type="search"
                  value={speakerQuery}
                  onChange={(e) => setSpeakerQuery(e.target.value)}
                  placeholder="Search speakers"
                  className="min-h-[44px] w-full max-w-xs rounded-pill border border-border bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredSpeakers.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={speakerSearchPath(s.name)}
                      className={cn(
                        "group flex h-full min-h-[80px] items-center gap-3 rounded-card border bg-card p-3 transition-colors",
                        "hover:border-primary/50 hover:bg-card/80 pressable",
                      )}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium leading-tight">
                          {s.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Reviewed lectures →
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}

// ------------------ Reciter detail (114 surahs) ------------------

interface ReciterDetailProps {
  reciter: ReturnType<typeof reciterById> & {};
  tracks: ReturnType<typeof reciterQuranTracks>;
  currentId: string | null;
  onBack: () => void;
  onPlayAll: () => void;
  onPlaySurah: (index: number) => void;
}

function ReciterDetail({
  reciter,
  tracks,
  currentId,
  onBack,
  onPlayAll,
  onPlaySurah,
}: ReciterDetailProps) {
  if (!reciter) return null;
  const hasAudio = tracks.length > 0;

  return (
    <section aria-labelledby="reciter-detail">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 rounded-pill px-3 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All reciters
      </button>

      <div className="mb-6 flex flex-col gap-4 rounded-card border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="reciter-detail" className="font-heading text-2xl font-bold">
            {reciter.name}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {reciter.location}
          </p>
        </div>
        <button
          type="button"
          onClick={onPlayAll}
          disabled={!hasAudio}
          className={cn(
            "inline-flex min-h-[48px] items-center gap-2 rounded-pill px-6 text-sm font-bold shadow-card-hover transition-transform",
            hasAudio
              ? "bg-primary text-primary-foreground hover:scale-[1.02]"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          <Play className="h-4 w-4" />
          {hasAudio ? "Play whole Qur'an" : "Recording coming soon"}
        </button>
      </div>

      {!hasAudio ? (
        <div className="rounded-card border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          <Clock className="mx-auto mb-2 h-6 w-6" />
          We're still verifying a halal public mount for this reciter. As soon
          as one is confirmed, all 114 surahs will play here.
        </div>
      ) : (
        <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {SURAHS.map((s, i) => {
            const t = tracks[i];
            const isActive = t && currentId === t.id;
            return (
              <li key={s.number}>
                <button
                  type="button"
                  onClick={() => onPlaySurah(i)}
                  className={cn(
                    "flex w-full min-h-[52px] items-center gap-3 rounded-card px-3 py-2 text-left transition-colors",
                    "hover:bg-card pressable",
                    isActive && "bg-primary/10",
                  )}
                >
                  <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {s.number.toString().padStart(3, "0")}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium leading-tight">
                      {s.nameEn}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {s.ayahs} āyāt
                    </span>
                  </span>
                  <span
                    className="font-quran text-lg leading-none text-foreground/80"
                    dir="rtl"
                    lang="ar"
                  >
                    {s.nameAr}
                  </span>
                  <Play
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
