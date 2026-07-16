import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SamplePreviewPlayerProps {
  /** Full audio URL of the premium track. */
  src: string;
  /** How many seconds of preview to allow (default 30). */
  seconds?: number;
  label?: string;
  className?: string;
  /** Fired when the preview hits the cap so the parent can surface an upgrade prompt. */
  onCapReached?: () => void;
}

/**
 * Client-side sample player. Auto-stops at `seconds` so non-premium listeners
 * get a taste. The real audio URL still requires an entitled session to fetch
 * the full track from the CDN — this is an audition tool, not a bypass.
 */
export default function SamplePreviewPlayer({
  src, seconds = 30, label = "Preview", className, onCapReached,
}: SamplePreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setProgress(Math.min(1, el.currentTime / seconds));
      if (el.currentTime >= seconds) {
        el.pause();
        el.currentTime = 0;
        setPlaying(false);
        setProgress(1);
        onCapReached?.();
      }
    };
    const onEnd = () => { setPlaying(false); setProgress(0); };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, [seconds, onCapReached]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button" size="sm" variant="outline"
        onClick={toggle}
        aria-label={playing ? `Pause ${label}` : `Play ${seconds}-second ${label}`}
        className="h-8 gap-1.5 rounded-pill"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        <span className="text-micro">{playing ? "Pause" : `${seconds}s ${label}`}</span>
      </Button>
      <div className="relative h-1 flex-1 overflow-hidden rounded-pill bg-muted" aria-hidden>
        <div
          className="h-full rounded-pill bg-[hsl(var(--gold))] transition-[width] duration-short"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <audio ref={audioRef} src={src} preload="none" />
    </div>
  );
}
