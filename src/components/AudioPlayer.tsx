import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Crown } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { motion, AnimatePresence } from "framer-motion";

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const AudioPlayer = () => {
  const {
    currentTrack, isPlaying, togglePlay, next, prev,
    progress, duration, seek, volume, setVolume,
  } = usePlayer();

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl"
        >
          <div className="mx-auto flex h-20 max-w-[1800px] items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <img src={currentTrack.cover} alt={currentTrack.title}
                className="h-12 w-12 shrink-0 rounded-md object-cover shadow-card" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {currentTrack.title}
                  {currentTrack.isPremium && <Crown className="ml-1 inline h-3.5 w-3.5 text-gold" />}
                </p>
                <p className="truncate text-xs text-muted-foreground">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex flex-1 max-w-lg flex-col items-center gap-1">
              <div className="flex items-center gap-4">
                <button onClick={prev} aria-label="Previous"
                  className="text-muted-foreground transition-colors hover:text-foreground">
                  <SkipBack className="h-4 w-4" />
                </button>
                <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                </button>
                <button onClick={next} aria-label="Next"
                  className="text-muted-foreground transition-colors hover:text-foreground">
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
              <div className="flex w-full items-center gap-2">
                <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">{fmt(progress)}</span>
                <input
                  type="range" min={0} max={duration || 0} step={1} value={progress}
                  onChange={(e) => seek(Number(e.target.value))}
                  aria-label="Seek"
                  className="flex-1 accent-primary"
                />
                <span className="w-8 text-[10px] tabular-nums text-muted-foreground">{fmt(duration)}</span>
              </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button onClick={() => setVolume(volume > 0 ? 0 : 0.9)} aria-label="Mute">
                {volume > 0 ? <Volume2 className="h-4 w-4 text-muted-foreground" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
              </button>
              <input
                type="range" min={0} max={1} step={0.01} value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="w-20 accent-primary"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AudioPlayer;
