import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useFavorites } from "@/hooks/useFavorites";
import { Loader2, Volume2, VolumeX, Heart, Share2, ShieldCheck, Sprout, Play } from "lucide-react";
import { toast } from "sonner";

const PAGE = 12;

interface Short {
  video_id: string;
  title: string;
  channel_id: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
  category: string | null;
  duration_seconds: number | null;
  halal_score: number | null;
  content_language: string | null;
}

/**
 * Shorts — vertical short-form reel of *strictly* moderated halal reminders.
 *
 * Every item comes from `get_shorts_feed`, which only returns videos that
 * passed text moderation AND the visual safety sweep (`visual_state = 'clean'`)
 * — the stage that rejects music, instruments and non-mahram visuals. Nothing
 * unchecked or flagged can reach this surface.
 *
 * Deliberately *not* an infinite dopamine loop: after every 10 shorts the feed
 * inserts a pause card, and finishing a short queues the "was this worth it?"
 * benefit label instead of counting watch time.
 */
export default function Shorts() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const [muted, setMuted] = useState(true);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelled = useRef<Set<string>>(new Set());
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["shorts-feed", locale],
    initialPageParam: 0,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("get_shorts_feed", {
        _limit: PAGE,
        _offset: pageParam as number,
        _lang: null,
        _min_seconds: 10,
        _max_seconds: 120,
      });
      if (error) throw error;
      return (data as unknown as Short[]) ?? [];
    },
    getNextPageParam: (last, all) => (last.length < PAGE ? undefined : all.length * PAGE),
  });

  const shorts = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages.flat() ?? []).filter((s) =>
      seen.has(s.video_id) ? false : (seen.add(s.video_id), true),
    );
  }, [data]);

  // Queue the T+0 benefit label once a short has been on screen long enough
  // to have actually been watched. This is the ranker's ground truth.
  const markWatched = useCallback(
    (s: Short) => {
      if (!user || labelled.current.has(s.video_id)) return;
      labelled.current.add(s.video_id);
      void supabase.rpc("queue_benefit_label_now", {
        _video_id: s.video_id,
        _video_title: s.title ?? null,
      });
    },
    [user],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { root: el, threshold: [0.6] },
    );
    el.querySelectorAll<HTMLElement>("[data-short]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [shorts.length]);

  // Prefetch the next page a few cards ahead of the viewport.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && active >= shorts.length - 4) void fetchNextPage();
  }, [active, shorts.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Watch-duration heuristic: the active short counts as watched after 15s.
  useEffect(() => {
    const s = shorts[active];
    if (!s) return;
    const t = window.setTimeout(() => markWatched(s), 15_000);
    return () => window.clearTimeout(t);
  }, [active, shorts, markWatched]);

  const share = async (s: Short) => {
    const url = `${window.location.origin}/watch/${s.video_id}`;
    try {
      if (navigator.share) await navigator.share({ title: s.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SEO
        path="/shorts"
        title="Shorts — quick halal reminders under 2 minutes | Heartify"
        description="Vertical short-form halal reminders, every one visually and textually moderated. No music, no haram imagery — swipe for a minute of benefit."
      />
      <Navbar />
      <h1 className="sr-only">Halal Shorts — Quick Daily Reminders</h1>

      <div className="fixed end-4 top-20 z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute shorts" : "Mute shorts"}
          className="min-h-11 min-w-11 rounded-pill bg-foreground/10 p-2 backdrop-blur transition-colors hover:bg-foreground/20"
        >
          {muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
          <span className="sr-only">Loading shorts</span>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="mx-auto h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] max-w-[420px] snap-y snap-mandatory overflow-y-scroll bg-black"
        >
          {shorts.map((s, i) => {
            const isActive = i === active;
            const isEmbeddable = /^[a-zA-Z0-9_-]{11}$/.test(s.video_id);
            const pause = i > 0 && i % 10 === 0;
            return (
              <div key={s.video_id}>
                {pause && (
                  <section className="flex h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] snap-start snap-always flex-col items-center justify-center gap-3 bg-black px-8 text-center text-white">
                    <Sprout className="h-8 w-8 text-primary" aria-hidden />
                    <h2 className="text-lg font-semibold">That&apos;s 10 reminders</h2>
                    <p className="text-sm text-white/70">
                      Take one and act on it. Benefit is measured by what you carry away, not by how
                      long you scroll.
                    </p>
                    <Link
                      to="/today"
                      className="mt-2 rounded-pill bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
                    >
                      Open today&apos;s dose
                    </Link>
                  </section>
                )}
                <section
                  data-short
                  data-idx={i}
                  className="relative h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] snap-start snap-always"
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    {isActive && isEmbeddable ? (
                      <iframe
                        title={s.title}
                        src={`https://www.youtube-nocookie.com/embed/${s.video_id}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${s.video_id}&modestbranding=1&rel=0&playsinline=1&controls=0`}
                        allow="autoplay; encrypted-media; picture-in-picture"
                        className="aspect-[9/16] h-full w-full border-0"
                      />
                    ) : (
                      <>
                        {s.thumbnail_url && (
                          <img
                            src={s.thumbnail_url}
                            alt={s.title}
                            loading="lazy"
                            className="h-full w-full object-cover opacity-60"
                          />
                        )}
                        <Play className="absolute h-12 w-12 text-white/80" aria-hidden />
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="absolute bottom-28 end-3 z-20 flex flex-col items-center gap-4 text-white">
                    <button
                      type="button"
                      onClick={() =>
                        toggleFavorite.mutate({
                          videoId: s.video_id,
                          title: s.title,
                          channel: s.channel_title ?? "",
                          thumbnail: s.thumbnail_url ?? "",
                        })
                      }
                      aria-label={isFavorite(s.video_id) ? "Remove from favorites" : "Save to favorites"}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-pill bg-white/10 backdrop-blur hover:bg-white/20"
                    >
                      <Heart
                        className={`h-5 w-5 ${isFavorite(s.video_id) ? "fill-current text-primary" : ""}`}
                        aria-hidden
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => void share(s)}
                      aria-label="Share this short"
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-pill bg-white/10 backdrop-blur hover:bg-white/20"
                    >
                      <Share2 className="h-5 w-5" aria-hidden />
                    </button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-10 space-y-1.5 bg-gradient-to-t from-black/85 to-transparent p-4 pb-8 text-white">
                    <p className="inline-flex items-center gap-1 text-micro font-medium uppercase tracking-wide text-white/70">
                      <ShieldCheck className="h-3 w-3 text-primary" aria-hidden />
                      Moderated · {s.channel_title ?? "Heartify"}
                    </p>
                    <h2 className="line-clamp-2 text-base font-semibold">
                      <Link to={`/watch/${s.video_id}`} className="hover:underline">
                        {s.title}
                      </Link>
                    </h2>
                    {s.duration_seconds ? (
                      <p className="text-micro text-white/60">{s.duration_seconds}s</p>
                    ) : null}
                  </div>
                </section>
              </div>
            );
          })}

          {isFetchingNextPage && (
            <div className="flex h-24 items-center justify-center bg-black">
              <Loader2 className="h-5 w-5 animate-spin text-white/60" aria-hidden />
            </div>
          )}

          {shorts.length === 0 && (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/60">
              No shorts have cleared moderation yet. Check back soon.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
