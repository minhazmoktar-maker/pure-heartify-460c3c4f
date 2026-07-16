import FadeIn from "@/components/FadeIn";
import { CheckCircle2, Clock } from "lucide-react";
import type { Video } from "@/data/videos";

interface VideoCardProps {
  video: Video;
  index: number;
}

const VideoCard = ({ video, index }: VideoCardProps) => {
  return (
    <FadeIn
      as="article"
      index={index}
      className="card-interactive group cursor-pointer rounded-card"
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden rounded-card">
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          width={896}
          height={512}
          className="aspect-video w-full object-cover transition-transform duration-short group-hover:scale-105"
        />
        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-card bg-foreground/80 px-1.5 py-0.5 text-micro font-medium text-background">
          <Clock className="h-3 w-3" />
          {video.duration}
        </span>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Info */}
      <div className="mt-3 flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-primary text-micro font-bold text-primary-foreground">
          {video.channel[0]}
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-micro text-muted-foreground">
            <span>{video.channel}</span>
            {video.verified && (
              <CheckCircle2 className="h-3.5 w-3.5 text-gold" />
            )}
          </div>
          <p className="text-micro text-muted-foreground">
            {video.views} · {video.uploadedAt}
          </p>
        </div>
      </div>
    </FadeIn>
  );
};

export default VideoCard;
