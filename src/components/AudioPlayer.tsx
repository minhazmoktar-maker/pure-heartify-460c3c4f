import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Crown, Shuffle, Repeat, Repeat1, Loader2, Gauge, Hand,
} from "lucide-react";
import { useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ReportAudioDialog from "@/components/ReportAudioDialog";

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

const AudioPlayer = () => {
  const {
    currentTrack, isPlaying, isBuffering, togglePlay, next, prev,
    progress, duration, seek, volume, setVolume, muted, toggleMute,
    shuffle, toggleShuffle, repeat, cycleRepeat,
    playbackRate, setPlaybackRate,
    needsUserGesture, resumePlayback, lastError,
  } = usePlayer();
  const [speedOpen, setSpeedOpen] = useState(false);

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-card/95 backdrop-blur-xl shadow-[0_-8px_24px_-12px_hsl(var(--foreground)/0.25)]"
          role="region"
          aria-label="Now playing"
        >
          <div className="mx-auto grid h-[88px] max-w-[1800px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 md:px-6">
            {/* Left — track meta */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-14 w-14 shrink-0">
                <img src={currentTrack.cover} alt={currentTrack.title}
                  className="h-full w-full rounded-md object-cover shadow-card" />
                {isBuffering && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {currentTrack.title}
                  {currentTrack.isPremium && <Crown className="ml-1 inline h-3.5 w-3.5 text-gold" />}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentTrack.artist} · {currentTrack.language}
                </p>
              </div>
            </div>

            {/* Center — transport + progress */}
            <div className="flex w-[min(560px,60vw)] flex-col items-center gap-1.5">
              <div className="flex items-center gap-3">
                <button onClick={toggleShuffle} aria-label="Shuffle" aria-pressed={shuffle}
                  className={cn(
                    "transition-colors",
                    shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}>
                  <Shuffle className="h-4 w-4" />
                </button>
                <button onClick={prev} aria-label="Previous"
                  className="text-muted-foreground transition-colors hover:text-foreground">
                  <SkipBack className="h-4 w-4" />
                </button>
                <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60"
                  disabled={isBuffering && !isPlaying}>
                  {isBuffering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="ml-0.5 h-4 w-4" />
                  )}
                </button>
                <button onClick={next} aria-label="Next"
                  className="text-muted-foreground transition-colors hover:text-foreground">
                  <SkipForward className="h-4 w-4" />
                </button>
                <button onClick={cycleRepeat}
                  aria-label={`Repeat ${repeat}`}
                  className={cn(
                    "transition-colors",
                    repeat !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}>
                  {repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex w-full items-center gap-2">
                <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
                  {fmt(progress)}
                </span>
                <input
                  type="range" min={0} max={duration || 0} step={1} value={progress}
                  onChange={(e) => seek(Number(e.target.value))}
                  aria-label="Seek"
                  className="flex-1 accent-primary"
                />
                <span className="w-10 text-[10px] tabular-nums text-muted-foreground">
                  {fmt(duration)}
                </span>
              </div>
            </div>

            {/* Right — speed + volume */}
            <div className="flex items-center justify-end gap-3">
              <div className="relative hidden sm:block">
                <button onClick={() => setSpeedOpen((v) => !v)}
                  aria-label={`Playback speed ${playbackRate}x`}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary">
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{playbackRate}×</span>
                </button>
                {speedOpen && (
                  <div className="absolute bottom-full right-0 mb-2 flex flex-col overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg">
                    {SPEEDS.map((s) => (
                      <button key={s} onClick={() => { setPlaybackRate(s); setSpeedOpen(false); }}
                        className={cn(
                          "rounded-md px-3 py-1 text-left text-xs tabular-nums",
                          playbackRate === s
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-secondary",
                        )}>
                        {s}×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}
                  className="text-muted-foreground transition-colors hover:text-foreground">
                  {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                  className="w-24 accent-primary"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AudioPlayer;
