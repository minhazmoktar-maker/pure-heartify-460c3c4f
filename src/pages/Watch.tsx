import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { recordRecentTopic } from "@/lib/recentTopics";
import { ArrowLeft, ChevronRight, Heart, Play, ShieldCheck } from "lucide-react";
import TrustBadges from "@/components/TrustBadges";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import { AdminVideoRemoveButton } from "@/components/AdminVideoRemoveButton";
import { ReportButton } from "@/components/ReportButton";
import CommentThread from "@/components/CommentThread";
import AddToPlaylistDialog from "@/components/AddToPlaylistDialog";
import NotInterestedMenu from "@/components/NotInterestedMenu";
import { WatchLaterButton, ShareAtTimeButton } from "@/components/WatchExtras";
import ShareImageButton from "@/components/ShareImageButton";
import SeriesRail from "@/components/SeriesRail";

import { useSeriesEpisodes } from "@/hooks/useSeriesEpisodes";

import { useYouTubeVideos } from "@/hooks/useYouTubeVideos";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { YouTubeVideo } from "@/services/youtube";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { diag, localDateISO } from "@/lib/diagnostics";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompleteDoseVideo } from "@/hooks/useDailyDose";
import { growth } from "@/lib/growthEvents";
import { triggerIfDelightful } from "@/lib/inAppReview";
import { celebrateSmall, celebrateBig, celebrateMilestone } from "@/lib/celebrate";
import { toast } from "sonner";

/**
 * Related-rail memory for the whole tab session.
 *
 * Related videos are excluded server-side via `exclude_ids`, so keeping this
 * set alive across watch-page navigations guarantees that watching video A
 * then video B never surfaces the same suggestions twice.
 */
const WATCH_SEEN_KEY = "heartify.watch_related_seen";
const WATCH_SEEN_CAP = 600;

const watchSessionSeen: Set<string> = (() => {
  try {
    const raw = sessionStorage.getItem(WATCH_SEEN_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
})();

function persistWatchSessionSeen() {
  try {
    // Keep the tail — the most recently surfaced ids matter most.
    if (watchSessionSeen.size > WATCH_SEEN_CAP) {
      const trimmed = Array.from(watchSessionSeen).slice(-WATCH_SEEN_CAP);
      watchSessionSeen.clear();
      for (const id of trimmed) watchSessionSeen.add(id);
    }
    sessionStorage.setItem(WATCH_SEEN_KEY, JSON.stringify(Array.from(watchSessionSeen)));
  } catch {
    /* storage unavailable — in-memory set still works */
  }
}


const Watch = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const startTimeParam = (() => {
    const sp = new URLSearchParams(location.search);
    const t = Number(sp.get("t"));
    return Number.isFinite(t) && t > 0 ? Math.floor(t) : 0;
  })();
  const stateVideo = (location.state as { video?: YouTubeVideo } | null)?.video;
  const { data: videos } = useYouTubeVideos("All");
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const completeDose = useCompleteDoseVideo();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [autoNextIn, setAutoNextIn] = useState<number | null>(null);
  const [playerActivated, setPlayerActivated] = useState(false);
  const completedRef = useRef<string | null>(null);

  const feedVideo = videos?.find((v) => v.id === videoId) ?? (stateVideo?.id === videoId ? stateVideo : undefined);

  // Deep links (shared URLs, push notifications, SEO crawlers) arrive without
  // router state and the video is usually absent from the first feed page, so
  // fall back to a direct lookup — otherwise the title stays "Loading…" and no
  // SEO/JSON-LD metadata is ever emitted for the page.
  const { data: fetchedVideo, isFetched: metaFetched } = useQuery<YouTubeVideo | null>({
    queryKey: ["watch-video", videoId],
    enabled: !!videoId && !feedVideo,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curated_videos")
        .select("video_id,title,channel_title,thumbnail_url,category,halal_score,published_at")
        .eq("video_id", videoId!)
        .eq("moderation_state", "approved")
        .eq("is_archived", false)
        .eq("is_hidden", false)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.video_id,
        title: data.title,
        videoUrl: `https://www.youtube.com/watch?v=${data.video_id}`,
        thumbnailUrl: data.thumbnail_url,
        channelTitle: data.channel_title,
        category: data.category as YouTubeVideo["category"],
        halalScore: data.halal_score,
        publishedAt: data.published_at ?? "",
      };
    },
  });

  const currentVideo = feedVideo ?? fetchedVideo ?? undefined;
  const currentCategory = (currentVideo as any)?.category;
  // Once the lookup has settled with nothing, stop showing a loading
  // placeholder — a bad/removed id must degrade to an explicit empty state.
  const metaResolved = !!currentVideo || metaFetched;




  // Cold-start signal: remember the topics played this session so the feed
  // can diversify before any server-side taste profile exists.
  useEffect(() => {
    recordRecentTopic(currentCategory);
  }, [currentCategory]);
  // Session-wide set of related ids already surfaced on ANY watch page this
  // session. Kept outside the videoId effect so navigating from one video to
  // the next never re-shows the same related videos.
  const seenRelatedIdsRef = useRef<Set<string>>(watchSessionSeen);
  const relatedQuery = useInfiniteFeed({
    category: currentCategory && currentCategory !== "All" ? currentCategory : undefined,
    limit: 12,
    sort: "fresh",
    // Distinct cache entry per watched video so two videos in the same
    // category can't render an identical related rail from cache.
    keySuffix: videoId ?? "",
    getExcludeIds: () => {
      const ids = Array.from(seenRelatedIdsRef.current);
      if (videoId) ids.push(videoId);
      return ids;
    },
  });
  const relatedVideos = (() => {
    const seen = new Set<string>();
    if (videoId) seen.add(videoId);
    const out: YouTubeVideo[] = [];
    for (const v of relatedQuery.data?.pages.flatMap((p) => p.items) ?? []) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      out.push(v);
    }
    return out;
  })();
  useEffect(() => {
    for (const v of relatedVideos) seenRelatedIdsRef.current.add(v.id);
    persistWatchSessionSeen();
  }, [relatedVideos.length]);

  const relatedSentinelRef = useInfiniteScroll(
    () => {
      if (relatedQuery.hasNextPage && !relatedQuery.isFetchingNextPage) {
        relatedQuery.fetchNextPage();
      }
    },
    !!relatedQuery.hasNextPage && !relatedQuery.isFetchingNextPage,
  );
  const isEmbeddableVideo = !!videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId);

  const series = useSeriesEpisodes(currentVideo, videos);
  const currentIndex = videos?.findIndex((v) => v.id === videoId) ?? -1;
  const feedNext = videos && currentIndex >= 0 ? videos[(currentIndex + 1) % videos.length] : null;
  // Prefer the next series episode when we're in a series — keeps viewers on-topic.
  const nextVideo = series?.next ?? feedNext;

  // Reset facade when navigating between videos
  useEffect(() => {
    setPlayerActivated(false);
    setShowOverlay(false);
    setAutoNextIn(null);
    completedRef.current = null;
  }, [videoId]);

  // Autoplay countdown once overlay appears
  useEffect(() => {
    if (!showOverlay || !nextVideo) return;
    setAutoNextIn(5);
    const iv = setInterval(() => {
      setAutoNextIn((n) => {
        if (n === null) return null;
        if (n <= 1) {
          clearInterval(iv);
          navigate(`/watch/${nextVideo.id}`, { replace: true });
          return null;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [showOverlay, nextVideo, navigate]);

  // Credit the streak after 30s of active viewing, even if the user navigates
  // away before the video ends. record_streak_activity is idempotent per day.
  useEffect(() => {
    if (!user || !videoId || !playerActivated) return;
    const t = setTimeout(() => {
      const clientDate = localDateISO();
      diag("streak", "rpc_attempt", { source: "watch_30s", videoId, clientDate });
      void supabase
        .rpc("record_streak_activity", { _client_date: clientDate })
        .then(({ data, error }) => {
          diag("streak", error ? "rpc_error" : "rpc_ok", {
            source: "watch_30s",
            clientDate,
            ...(error ? { code: error.code, message: error.message } : { result: data }),
          });
        });
    }, 30_000);
    return () => clearTimeout(t);
  }, [user, videoId, playerActivated]);

  // Track watch history + first-play growth event
  useEffect(() => {
    if (!user || !videoId || !currentVideo) return;
    supabase.from("watch_history").insert({
      user_id: user.id,
      video_id: videoId,
      video_title: currentVideo.title,
      thumbnail_url: currentVideo.thumbnailUrl,
    }).then(() => {});
    growth.firstVideoPlayed(videoId);
  }, [user, videoId, currentVideo]);

  // Listen for YouTube iframe API messages to detect video end
  useEffect(() => {
    if (!playerActivated) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === "string") {
          const data = JSON.parse(event.data);
          // YouTube iframe API sends playerState: 0 when video ends
          if (data?.event === "onStateChange" && data?.info === 0) {
            setShowOverlay(true);
            triggerIfDelightful();
            // Mark dose video complete (idempotent server-side)
            if (user && videoId && completedRef.current !== videoId) {
              completedRef.current = videoId;
              completeDose.mutate(videoId, {
                onSuccess: (res) => {
                  // Fire the RPC that also handles freezes, milestones, badges, and
                  // in-app notifications. Idempotent per user/day.
                  {
                    const clientDate = localDateISO();
                    diag("streak", "rpc_attempt", { source: "dose_complete", videoId, clientDate });
                    void supabase
                      .rpc("record_streak_activity", { _client_date: clientDate })
                      .then(({ data, error }) => {
                        diag("streak", error ? "rpc_error" : "rpc_ok", {
                          source: "dose_complete",
                          clientDate,
                          ...(error ? { code: error.code, message: error.message } : { result: data }),
                        });
                      });
                  }
                  // Small confetti + haptic on every dose video completion
                  celebrateSmall();
                  if (res?.justCompleted) {
                    // Big celebration when the whole day's dose is done
                    celebrateBig();
                    toast.success("Alhamdulillah 🌿 Daily Dose complete", {
                      description: `Streak: ${res.streak?.current_streak ?? 1} day${(res.streak?.current_streak ?? 1) === 1 ? "" : "s"}`,
                      duration: 6000,
                    });
                  }
                  if (res?.milestone) {
                    celebrateMilestone(res.milestone);
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
  }, [videoId, user, completeDose, playerActivated]);

  const handleNext = () => {
    if (nextVideo) {
      setShowOverlay(false);
      navigate(`/watch/${nextVideo.id}`, { replace: true });
    }
  };

  const liked = videoId ? isFavorite(videoId) : false;

  const toAbsoluteUrl = (value: string) => {
    if (!value) return "https://pure-heartify.lovable.app/placeholder.svg";
    if (/^https?:\/\//i.test(value)) return value;
    return `https://pure-heartify.lovable.app${value.startsWith("/") ? value : `/${value}`}`;
  };

  const handleBookmark = () => {
    if (!currentVideo || !videoId) return;
    toggleFavorite.mutate({
      videoId,
      title: currentVideo.title,
      channel: currentVideo.channelTitle,
      thumbnail: currentVideo.thumbnailUrl,
    });
  };

  return (
    <div className="min-h-dvh bg-background">
      {currentVideo && videoId && (
        <SEO
          title={`${currentVideo.title} · Heartify`}
          description={`Watch "${currentVideo.title}" by ${currentVideo.channelTitle} — curated halal content on Heartify.`}
          path={`/watch/${videoId}`}
          image={toAbsoluteUrl(currentVideo.thumbnailUrl)}
          type="video.other"
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: currentVideo.title,
            description: `Curated halal video by ${currentVideo.channelTitle}.`,
            thumbnailUrl: [toAbsoluteUrl(currentVideo.thumbnailUrl)],
            uploadDate: currentVideo.publishedAt || new Date().toISOString(),
            url: `https://pure-heartify.lovable.app/watch/${videoId}`,
            ...(isEmbeddableVideo
              ? { embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}` }
              : { contentUrl: currentVideo.videoUrl }),
            publisher: {
              "@type": "Organization",
              name: "Heartify",
              url: "https://pure-heartify.lovable.app/",
            },
          }}
        />
      )}
      <Navbar />


      <div className="mx-auto max-w-[1800px] px-4 py-4 md:px-6 lg:flex lg:gap-6">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/");
            }}
            className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {isEmbeddableVideo ? (
            <div
              className="relative aspect-video w-full overflow-hidden rounded-card bg-black"
              style={{ viewTransitionName: `video-${videoId}` } as React.CSSProperties}
            >
              {playerActivated ? (
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1&iv_load_policy=3&disablekb=0&fs=1&enablejsapi=1${startTimeParam ? `&start=${startTimeParam}` : ""}&origin=${window.location.origin}`}
                  title={currentVideo?.title ?? "Video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="eager"
                  className="absolute inset-0 h-full w-full border-0"
                  onError={() => {
                    void import("@/lib/alerts").then(({ reportAlert }) =>
                      reportAlert({
                        kind: "watch_iframe_error",
                        severity: "error",
                        message: `Watch iframe failed to load for video ${videoId}`,
                        context: { videoId, title: currentVideo?.title },
                      }),
                    );
                  }}
                />
              ) : (
                // Lite-YouTube facade: defers ~1.5MB of player JS until user intent.
                <button
                  type="button"
                  onClick={() => setPlayerActivated(true)}
                  aria-label={`Play ${currentVideo?.title ?? "video"}`}
                  className="group absolute inset-0 flex items-center justify-center overflow-hidden"
                >
                  {videoId && (
                    <img
                      src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                      alt={currentVideo ? `${currentVideo.title} — video thumbnail from ${currentVideo.channelTitle}` : "Video preview thumbnail"}
                      width={1280}
                      height={720}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                      {...({ fetchpriority: "high" } as Record<string, string>)}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="relative flex h-16 w-24 items-center justify-center rounded-card bg-red-600/90 shadow-2xl transition-transform group-hover:scale-110">
                    <Play className="h-8 w-8 fill-white text-white" />
                  </div>
                </button>
              )}
              {/* Overlay to block YouTube end-screen suggestions */}
              {showOverlay && nextVideo && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur-sm">
                  <p className="text-micro font-medium uppercase tracking-wide text-muted-foreground">Up Next</p>
                  <div className="w-full max-w-md px-4">
                    <img
                      src={nextVideo.thumbnailUrl}
                      alt={`Up next: ${nextVideo.title} by ${nextVideo.channelTitle}`}
                      className="aspect-video w-full rounded-card object-cover"
                    />
                    <h3 className="mt-3 line-clamp-2 text-center text-sm font-semibold text-foreground">{nextVideo.title}</h3>
                    <p className="mt-1 text-center text-micro text-muted-foreground">{nextVideo.channelTitle}</p>
                  </div>
                  <button
                    onClick={handleNext}
                    className="mt-2 flex items-center gap-2 rounded-pill bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {autoNextIn !== null ? `Play now (${autoNextIn})` : "Play Now"}
                  </button>
                  <button
                    onClick={() => { setAutoNextIn(null); setShowOverlay(false); }}
                    className="text-micro text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Cancel autoplay & replay
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center rounded-card border border-border bg-card px-6 text-center">
              <p className="text-heading font-semibold text-foreground">This video isn't available for in-app playback.</p>
              <p className="mt-2 text-sm text-muted-foreground">Try searching for it on the Browse tab.</p>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <h1 className="text-heading font-bold text-foreground md:text-heading">
              {currentVideo?.title ?? (metaResolved ? "Video unavailable" : "Loading…")}
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
                  {videoId && (
                    <Link
                      to={`/verify/${videoId}`}
                      className="inline-flex items-center gap-1 rounded-pill border border-border px-2.5 py-1 text-micro font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="See the reviewer chain, tier, and public attestation for this video"
                    >
                      <ShieldCheck className="h-3 w-3 text-primary" />
                      Verify moderation
                    </Link>
                  )}
                  <button
                    onClick={handleBookmark}
                    className="inline-flex items-center gap-1 rounded-pill border border-border px-3 py-1 text-micro font-medium transition-colors hover:bg-accent"
                  >
                    <Heart className={`h-3.5 w-3.5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                    {liked ? "Bookmarked" : "Bookmark"}
                  </button>
                  {videoId && (
                    <ReportButton
                      videoId={videoId}
                      videoTitle={currentVideo.title}
                      channelTitle={currentVideo.channelTitle}
                    />
                  )}
                  {videoId && <AddToPlaylistDialog videoId={videoId} />}
                  {videoId && <WatchLaterButton videoId={videoId} />}
                  {videoId && <ShareAtTimeButton videoId={videoId} />}
                  {videoId && currentVideo && (
                    <ShareImageButton
                      input={{
                        variant: "video",
                        kicker: "Watching on Heartify",
                        translation: currentVideo.title,
                        attribution: `— ${currentVideo.channelTitle}`,
                      }}
                      meta={{
                        title: currentVideo.title,
                        text: `${currentVideo.title} · Heartify`,
                        url: `https://pure-heartify.lovable.app/watch/${videoId}`,
                      }}
                      label="Share image"
                    />
                  )}
                  {videoId && <NotInterestedMenu videoId={videoId} />}

                  {videoId && <AdminVideoRemoveButton videoId={videoId} title={currentVideo.title} />}


                </>
              )}
            </div>
          </div>

          {nextVideo && (
            <button
              onClick={handleNext}
              className="mt-4 flex w-full items-center justify-between rounded-card border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
            >
              <div className="min-w-0">
                <p className="text-micro font-medium text-muted-foreground">Up next</p>
                <p className="truncate text-sm font-semibold text-foreground">{nextVideo.title}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          )}
          {series && <SeriesRail series={series} className="mt-4" />}
          {videoId && <CommentThread videoId={videoId} />}
        </div>


        <aside className="mt-6 shrink-0 lg:mt-0 lg:w-[380px] xl:w-[420px]">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            More Halal Content
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {relatedVideos.map((video, index) => (
              <YouTubeVideoCard key={`${video.id}-${index}`} video={video} index={index} />
            ))}
          </div>
          <div ref={relatedSentinelRef} aria-hidden className="h-10" />
          {relatedQuery.isFetchingNextPage && (
            <p className="mt-2 text-center text-xs text-muted-foreground">Loading more…</p>
          )}
          {!relatedQuery.hasNextPage && relatedVideos.length > 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">You've reached the end</p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Watch;
