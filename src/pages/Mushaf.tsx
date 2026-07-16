import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

const MAX_PAGE = 604;
// NOTE: searchtruth.com currently returns text/html for .jpg paths which
// triggers browser ORB and blocks the request. Tracked as a remaining issue —
// requires migrating to a self-hosted mushaf image set (KFGQPC) served from
// Supabase storage. See docs.
const pageImage = (n: number) =>
  `https://www.searchtruth.com/quran/images1/${String(n).padStart(3, "0")}.jpg`;

// Public per-page audio (Al-Afasy) — 604 pages, MP3.
// This URL pattern is widely mirrored; fallback UI shows a message if it fails.
const pageAudio = (n: number) =>
  `https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/${String(n).padStart(3, "0")}.mp3`;

export default function Mushaf() {
  const params = useParams<{ page?: string }>();
  const navigate = useNavigate();
  const page = Math.min(MAX_PAGE, Math.max(1, Number(params.page ?? 1) || 1));
  const [playing, setPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    audioEl?.pause();
    setPlaying(false);
    setAudioError(false);
    const a = new Audio(pageAudio(page));
    a.preload = "none";
    a.onended = () => setPlaying(false);
    a.onerror = () => {
      setAudioError(true);
      setPlaying(false);
    };
    setAudioEl(a);
    return () => {
      a.pause();
      a.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const goto = (n: number) => navigate(`/mushaf/${Math.min(MAX_PAGE, Math.max(1, n))}`);

  const toggle = () => {
    if (!audioEl) return;
    if (playing) {
      audioEl.pause();
      setPlaying(false);
    } else {
      audioEl.play().then(() => setPlaying(true)).catch(() => setAudioError(true));
    }
  };

  return (
    <>
      <SEO
        path={`/mushaf/${page}`}
        title={`Mushaf — Page ${page} of 604 | Heartify`}
        description={`Read Qur'an page ${page} in the Madani mushaf. Tap to play recitation by Mishary Rashid Al-Afasy.`}
      />
      <Navbar />
      <PageHeader
        title="Mushaf"
        subtitle={`Page ${page} of ${MAX_PAGE} — Madani script`}
      />
      <div className="container mx-auto max-w-3xl px-4 pb-16">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => goto(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Prev
          </Button>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={MAX_PAGE}
              value={page}
              onChange={(e) => goto(Number(e.target.value))}
              className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm"
              aria-label="Page number"
            />
            <Button
              onClick={toggle}
              size="sm"
              variant={playing ? "secondary" : "default"}
              disabled={audioError}
              aria-label={playing ? "Pause recitation" : "Play recitation"}
            >
              {playing ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
              {playing ? "Pause" : "Play"}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => goto(page + 1)} disabled={page >= MAX_PAGE}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <button
          type="button"
          onClick={toggle}
          className="block w-full overflow-hidden rounded-card border border-border bg-card shadow-sm"
          aria-label="Tap to play recitation"
        >
          <img
            key={page}
            src={pageImage(page)}
            alt={`Qur'an mushaf page ${page}`}
            loading="lazy"
            className="w-full"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "0.4";
            }}
          />
        </button>
        {audioError && (
          <p className="mt-3 text-center text-micro text-muted-foreground">
            Recitation audio unavailable for this page. Try opening the surah page for full audio.
          </p>
        )}
      </div>
    </>
  );
}
