import { useNavigate } from "react-router-dom";
import FadeIn from "@/components/FadeIn";
import { CheckCircle2, Play, Heart } from "lucide-react";
import type { YouTubeVideo } from "@/services/youtube";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import TrustBadges from "@/components/TrustBadges";

interface YouTubeVideoCardProps {
  video: YouTubeVideo;
  index: number;
}

const YouTubeVideoCard = ({ video, index }: YouTubeVideoCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const timeAgo = formatTimeAgo(video.publishedAt);
  const liked = isFavorite(video.id);
  const isEmbeddableVideo = /^[a-zA-Z0-9_-]{11}$/.test(video.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isEmbeddableVideo) return; // non-embeddable videos can't be played
    navigate(`/watch/${video.id}`, { state: { video } });
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    toggleFavorite.mutate({
      videoId: video.id,
      title: video.title,
      channel: video.channelTitle,
      thumbnail: video.thumbnailUrl,
    });
  };

  if (!isEmbeddableVideo) return null; // hide non-embeddable fallback videos

  return (
    <FadeIn
      as="article"
      index={index}
      className="group cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative overflow-hidden rounded-xl">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          loading={index < 4 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={index < 2 ? "high" : "low"}
          width={480}
          height={270}
          className="aspect-video w-full bg-muted object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute bottom-2 left-2 right-2">
          <TrustBadges channelTitle={video.channelTitle} halalScore={video.halalScore} />
        </div>
        <span className="absolute right-2 top-2 rounded-md bg-foreground/70 px-1.5 py-0.5 text-xs font-medium text-background">
          {video.category}
        </span>
        <div className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={handleBookmark}
            aria-label={liked ? "Remove bookmark" : "Bookmark video"}
            className="rounded-full bg-background/80 p-1.5 backdrop-blur-sm transition-colors hover:bg-background"
            title={liked ? "Remove bookmark" : "Bookmark"}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`} />
          </button>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-10 w-10 fill-primary-foreground text-primary-foreground drop-shadow-lg" />
        </div>
      </div>

      <div className="mt-3 flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {video.channelTitle[0]}
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {video.title}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span>{video.channelTitle}</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
          </div>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
      </div>
    </FadeIn>
  );
};

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? "s" : ""} ago`;
}

export default YouTubeVideoCard;
