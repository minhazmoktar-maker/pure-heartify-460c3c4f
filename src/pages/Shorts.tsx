import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { useYouTubeVideos } from "@/hooks/useYouTubeVideos";
import { Loader2, Volume2, VolumeX } from "lucide-react";

export default function Shorts() {
  const { data: videos, isLoading } = useYouTubeVideos("Reminders");
  const [muted, setMuted] = useState(true);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Bias toward short-form (≤60s) — we don't have duration in the model,
  // so we prefer titles that read as short-form reminders.
  const shorts = useMemo(() => {
    if (!videos) return [];
    const shortish = videos.filter((v) =>
      /(shorts?|60 ?sec|1[- ]?min|reminder|quick|daily)/i.test(v.title),
    );
    return (shortish.length >= 6 ? shortish : videos).slice(0, 40);
  }, [videos]);

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

  return (
    <div className="min-h-dvh bg-black text-white">
      <SEO
        path="/shorts"
        title="Shorts — quick halal reminders under 60s | Heartify"
        description="Vertical short-form halal reminders. Swipe to keep your heart softened in under a minute."
      />
      <Navbar />
      <div className="fixed right-4 top-20 z-30">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute" : "Mute"}
          className="rounded-full bg-white/10 p-2 backdrop-blur hover:bg-white/20"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      ) : (
        <div
          ref={containerRef}
          className="mx-auto h-[calc(100dvh-4rem)] max-w-[420px] snap-y snap-mandatory overflow-y-scroll"
        >
          {shorts.map((v, i) => {
            const isActive = i === active;
            const isEmbeddable = /^[a-zA-Z0-9_-]{11}$/.test(v.id);
            return (
              <section
                key={v.id + i}
                data-short
                data-idx={i}
                className="relative h-[calc(100dvh-4rem)] snap-start snap-always"
              >
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  {isActive && isEmbeddable ? (
                    <iframe
                      title={v.title}
                      src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${v.id}&modestbranding=1&rel=0&playsinline=1&controls=0`}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      className="aspect-[9/16] h-full w-full border-0"
                    />
                  ) : (
                    <img
                      src={v.thumbnailUrl}
                      alt={v.title}
                      loading="lazy"
                      className="h-full w-full object-cover opacity-70"
                    />
                  )}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 space-y-1 bg-gradient-to-t from-black/80 to-transparent p-4 pb-8">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                    {v.channelTitle}
                  </p>
                  <h2 className="line-clamp-3 text-base font-semibold">{v.title}</h2>
                </div>
              </section>
            );
          })}
          {shorts.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-white/60">
              No shorts available right now.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
