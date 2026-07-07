import { Play, Crown, Lock } from "lucide-react";
import { motion } from "framer-motion";
import type { Track } from "@/data/audio";
import { usePlayer } from "@/contexts/PlayerContext";
import { cn } from "@/lib/utils";

interface TrackRowProps {
  track: Track;
  index: number;
  queue?: Track[];
}

const TrackRow = ({ track, index, queue }: TrackRowProps) => {
  const { play, isPremiumUser, currentTrack, isPlaying } = usePlayer();
  const isActive = currentTrack?.id === track.id;
  const isLocked = track.isPremium && !isPremiumUser;

  const handlePlay = () => {
    if (isLocked) return;
    const q = queue?.filter((t) => !t.isPremium || isPremiumUser);
    play(track, q && q.length > 0 ? q : undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => !isLocked && (e.key === "Enter" || e.key === " ") && handlePlay()}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        isActive ? "bg-primary/10" : "hover:bg-secondary",
        isLocked && "opacity-60 cursor-not-allowed"
      )}
    >
      <span className="w-6 text-center text-xs text-muted-foreground group-hover:hidden">
        {index + 1}
      </span>
      <span className="hidden w-6 text-center group-hover:block">
        {isLocked ? (
          <Lock className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Play className="mx-auto h-3.5 w-3.5 text-primary" />
        )}
      </span>

      <img src={track.cover} alt={track.album} className="h-10 w-10 rounded object-cover" loading="lazy" />

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", isActive ? "text-primary" : "text-foreground")}>
          {track.title}
          {track.isPremium && <Crown className="ml-1.5 inline h-3 w-3 text-gold" />}
        </p>
        <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
      </div>

      <span className="hidden text-xs text-muted-foreground sm:block">{track.plays} plays</span>
      <span className="text-xs text-muted-foreground">{track.duration}</span>
    </motion.div>
  );
};

export default TrackRow;
