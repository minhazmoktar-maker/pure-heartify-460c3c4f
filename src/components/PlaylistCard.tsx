import { Crown, Lock, Play } from "lucide-react";
import FadeIn from "@/components/FadeIn";
import SmartImage from "@/components/SmartImage";
import type { Playlist } from "@/data/audio";
import { tracks as allTracks } from "@/data/audio";
import { usePlayer } from "@/contexts/PlayerContext";
import { cn } from "@/lib/utils";

interface PlaylistCardProps {
  playlist: Playlist;
  index: number;
}

const PlaylistCard = ({ playlist, index }: PlaylistCardProps) => {
  const { isPremiumUser, playQueue } = usePlayer();
  const isLocked = playlist.isPremium && !isPremiumUser;

  const queueForPlaylist = () => {
    if (playlist.trackIds) {
      return allTracks.filter((t) => playlist.trackIds!.includes(t.id));
    }
    if (playlist.category) {
      return allTracks.filter((t) => t.category === playlist.category);
    }
    return allTracks;
  };

  const handlePlay = () => {
    if (isLocked) return;
    const q = queueForPlaylist().filter((t) => !t.isPremium || isPremiumUser);
    if (q.length > 0) playQueue(q, 0);
  };

  return (
    <FadeIn
      index={index}
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      aria-label={`Play ${playlist.title}${isLocked ? " (locked)" : ""}`}
      onKeyDown={(e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), handlePlay())}
      className={cn(
        "card-interactive group cursor-pointer overflow-hidden rounded-xl bg-card shadow-card",
        isLocked && "opacity-70 cursor-not-allowed hover:translate-y-0 hover:shadow-card"
      )}
    >
      <div className="relative aspect-square overflow-hidden">
        <img src={playlist.cover} alt={playlist.title} loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        {isLocked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
            <Lock className="h-8 w-8 text-background" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition-all group-hover:bg-foreground/25 group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg">
              <Play className="ml-0.5 h-5 w-5 fill-primary-foreground text-primary-foreground" />
            </div>
          </div>
        )}
        {playlist.isPremium && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
            <Crown className="h-3 w-3" />
            PREMIUM
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-foreground">{playlist.title}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{playlist.description}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{playlist.trackCount} tracks</p>
      </div>
    </FadeIn>
  );
};

export default PlaylistCard;
