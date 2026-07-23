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
            <div
              role="tablist"
              aria-label="Listen categories"
              className="mb-6 flex gap-2"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "reciters"}
                onClick={() => setTab("reciters")}
                className={cn(
                  "flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-card text-sm font-semibold transition-colors",
                  tab === "reciters"
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card text-muted-foreground hover:bg-card/80 hover:text-foreground",
                )}
              >
                <Mic2 className="h-4 w-4" aria-hidden />
                Reciters
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "scholars"}
                onClick={() => setTab("scholars")}
                className={cn(
                  "flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-card text-sm font-semibold transition-colors",
                  tab === "scholars"
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card text-muted-foreground hover:bg-card/80 hover:text-foreground",
                )}
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                Scholars
              </button>
            </div>

            {tab === "reciters" ? (
              <RecitersSection
                reciters={filteredReciters}
                onSelect={setSelectedReciterId}
                query={reciterQuery}
                onQueryChange={setReciterQuery}
              />
            ) : (
              <SpeakersSection
                speakers={filteredSpeakers}
                query={speakerQuery}
                onQueryChange={setSpeakerQuery}
              />
            )}
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
