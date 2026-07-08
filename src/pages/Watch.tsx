import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Heart, Play } from "lucide-react";
import TrustBadges from "@/components/TrustBadges";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import { AdminVideoRemoveButton } from "@/components/AdminVideoRemoveButton";
import { useYouTubeVideos } from "@/hooks/useYouTubeVideos";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompleteDoseVideo } from "@/hooks/useDailyDose";
import { growth } from "@/lib/growthEvents";
import { triggerIfDelightful } from "@/lib/inAppReview";
import { toast } from "sonner";

const Watch = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { data: videos } = useYouTubeVideos("All");
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const completeDose = useCompleteDoseVideo();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const completedRef = useRef<string | null>(null);

  const currentVideo = videos?.find((v) => v.id === videoId);
  const relatedVideos = videos?.filter((v) => v.id !== videoId).slice(0, 8) ?? [];
  const isEmbeddableVideo = !!videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId);

  const currentIndex = videos?.findIndex((v) => v.id === videoId) ?? -1;
  const nextVideo = videos && currentIndex >= 0 ? videos[(currentIndex + 1) % videos.length] : null;

  // Track watch history
  useEffect(() => {
    if (!user || !videoId || !currentVideo) return;
    supabase.from("watch_history").insert({
      user_id: user.id,
      video_id: videoId,
      video_title: currentVideo.title,
      thumbnail_url: currentVideo.thumbnailUrl,
    }).then(() => {});
  }, [user, videoId, currentVideo]);

  // Listen for YouTube iframe API messages to detect video end
  useEffect(() => {
    setShowOverlay(false);
    completedRef.current = null;

    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === "string") {
          const data = JSON.parse(event.data);
          // YouTube iframe API sends playerState: 0 when video ends
          if (data?.event === "onStateChange" && data?.info === 0) {
            setShowOverlay(true);
            // Mark dose video complete (idempotent server-side)
            if (user && videoId && completedRef.current !== videoId) {
              completedRef.current = videoId;
              completeDose.mutate(videoId, {
                onSuccess: (res) => {
                  if (res?.justCompleted) {
                    toast.success("Alhamdulillah 🌿 Daily Dose complete", {
                      description: `Streak: ${res.streak?.current_streak ?? 1} day${(res.streak?.current_streak ?? 1) === 1 ? "" : "s"}`,
                      duration: 6000,
                    });
                  }
                  if (res?.milestone) {
                    toast(`🌟 ${res.milestone}-day milestone reached!`, {
                      description: "Keep going — small daily steps, big transformation.",
                      duration: 8000,
                    });
                  }
                },
              });
            }
          }
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [videoId, user, completeDose]);

  const handleNext = () => {
    if (nextVideo) {
      setShowOverlay(false);
      navigate(`/watch/${nextVideo.id}`, { replace: true });
    }
  };

  const liked = videoId ? isFavorite(videoId) : false;

  const handleBookmark = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!currentVideo || !videoId) return;
    toggleFavorite.mutate({
      videoId,
      title: currentVideo.title,
      channel: currentVideo.channelTitle,
      thumbnail: currentVideo.thumbnailUrl,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-[1800px] px-4 py-4 md:px-6 lg:flex lg:gap-6">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => navigate("/")}
            className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to browse
          </button>

          {isEmbeddableVideo ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                ref={iframeRef}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1&iv_load_policy=3&disablekb=0&fs=1&enablejsapi=1&origin=${window.location.origin}`}
                title={currentVideo?.title ?? "Video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
              {/* Overlay to block YouTube end-screen suggestions */}
              {showOverlay && nextVideo && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Up Next</p>
                  <div className="w-full max-w-md px-4">
                    <img
                      src={nextVideo.thumbnailUrl}
                      alt={nextVideo.title}
                      className="aspect-video w-full rounded-lg object-cover"
                    />
                    <h3 className="mt-3 line-clamp-2 text-center text-sm font-semibold text-foreground">{nextVideo.title}</h3>
                    <p className="mt-1 text-center text-xs text-muted-foreground">{nextVideo.channelTitle}</p>
                  </div>
                  <button
                    onClick={handleNext}
                    className="mt-2 flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Play Now
                  </button>
                  <button
                    onClick={() => setShowOverlay(false)}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Replay current video
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-border bg-card px-6 text-center">
              <p className="text-lg font-semibold text-foreground">This video isn't available for in-app playback.</p>
              <p className="mt-2 text-sm text-muted-foreground">Try searching for it on the Browse tab.</p>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <h1 className="text-lg font-bold text-foreground md:text-xl">
              {currentVideo?.title ?? "Loading…"}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {currentVideo && (
                <>
                  <span className="font-medium text-foreground">{currentVideo.channelTitle}</span>
                  <TrustBadges
                    channelTitle={currentVideo.channelTitle}
                    halalScore={currentVideo.halalScore}
                    category={currentVideo.category}
                    size="md"
                  />
                  <button
                    onClick={handleBookmark}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent"
                  >
                    <Heart className={`h-3.5 w-3.5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                    {liked ? "Bookmarked" : "Bookmark"}
                  </button>
                  {videoId && <AdminVideoRemoveButton videoId={videoId} title={currentVideo.title} />}
                </>
              )}
            </div>
          </div>

          {nextVideo && (
            <button
              onClick={handleNext}
              className="mt-4 flex w-full items-center justify-between rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Up next</p>
                <p className="truncate text-sm font-semibold text-foreground">{nextVideo.title}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          )}
        </div>

        <aside className="mt-6 shrink-0 lg:mt-0 lg:w-[380px] xl:w-[420px]">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            More Halal Content
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {relatedVideos.map((video, index) => (
              <YouTubeVideoCard key={video.id} video={video} index={index} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Watch;
