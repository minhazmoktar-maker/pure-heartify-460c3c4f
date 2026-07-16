import { Play, Pause, Crown, Lock, Clock, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { Track } from "@/data/audio";
import { usePlayer } from "@/contexts/PlayerContext";
import { cn } from "@/lib/utils";
import ReportAudioDialog from "@/components/ReportAudioDialog";
import SmartImage from "@/components/SmartImage";

interface TrackRowProps {
  track: Track;
  index: number;
  queue?: Track[];
  showAlbum?: boolean;
}

const TrackRow = ({ track, index, queue, showAlbum = false }: TrackRowProps) => {
  const { play, addToQueue, isPremiumUser, currentTrack, isPlaying } = usePlayer();
  const isActive = currentTrack?.id === track.id;
  const isLocked = track.isPremium && !isPremiumUser;
  const isComing = !!track.comingSoon;
  const disabled = isLocked || isComing;

  const handlePlay = () => {
    if (disabled) return;
    const q = queue?.filter((t) => (!t.isPremium || isPremiumUser) && !t.comingSoon);
    play(track, q && q.length > 0 ? q : undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      onClick={handlePlay}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`Play track ${index + 1}`}
      onKeyDown={(e) => !disabled && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), handlePlay())}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-card px-3 py-2.5 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isActive ? "bg-primary/10" : "hover:bg-secondary",
        disabled && "opacity-60 cursor-not-allowed hover:bg-transparent",
      )}
    >
      <span className="w-6 text-center text-micro tabular-nums text-muted-foreground group-hover:hidden">
        {isActive && isPlaying ? (
          <span className="inline-flex h-3 w-3 items-center justify-center gap-[2px]">
            <span className="h-full w-[2px] animate-pulse rounded-card bg-primary" />
            <span className="h-2/3 w-[2px] animate-pulse rounded-card bg-primary [animation-delay:120ms]" />
            <span className="h-1/2 w-[2px] animate-pulse rounded-card bg-primary [animation-delay:240ms]" />
          </span>
        ) : (
          index + 1
        )}
      </span>
      <span className="hidden w-6 text-center group-hover:block">
        {isComing ? (
          <Sparkles className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
        ) : isLocked ? (
          <Lock className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
        ) : isActive && isPlaying ? (
          <Pause className="mx-auto h-3.5 w-3.5 text-primary" />
        ) : (
          <Play className="mx-auto h-3.5 w-3.5 text-primary" />
        )}
      </span>

      <SmartImage src={track.cover} alt="" wrapperClassName="h-11 w-11 shrink-0 rounded overflow-hidden" />

      <div className="min-w-0 flex-1">
        <p className={cn(
          "truncate text-sm font-medium",
          isActive ? "text-primary" : "text-foreground",
        )}>
          {track.title}
          {track.isPremium && <Crown className="ml-1.5 inline h-3 w-3 text-gold" aria-label="Premium" />}
          {isComing && (
            <span className="ml-2 rounded-pill bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              Soon
            </span>
          )}
        </p>
        <p className="truncate text-micro text-muted-foreground">
          {track.artist}
          {showAlbum && <span className="text-muted-foreground/70"> · {track.album}</span>}
        </p>
      </div>

      <span className="hidden rounded-pill border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground md:block">
        {track.language}
      </span>
      <span className="hidden text-micro text-muted-foreground lg:block">{track.plays} plays</span>
      <button
        onClick={(e) => { e.stopPropagation(); if (!disabled) addToQueue(track); }}
        aria-label="Add to queue"
        className="hidden text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground md:inline-flex"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <span
        className="hidden opacity-0 transition-opacity group-hover:opacity-100 md:inline-flex"
        onClick={(e) => e.stopPropagation()}
      >
        <ReportAudioDialog track={track} compact />
      </span>
      <span className="flex w-14 items-center justify-end gap-1 text-micro tabular-nums text-muted-foreground">
        <Clock className="h-3 w-3 opacity-60" />{track.duration}
      </span>
    </motion.div>
  );
};

export default TrackRow;
