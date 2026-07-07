import { useState, useMemo } from "react";
import { Crown, Sparkles, Download, Radio, Headphones, BookOpen, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import PlaylistCard from "@/components/PlaylistCard";
import TrackRow from "@/components/TrackRow";
import { playlists, tracks, audioCategories, type AudioCategory } from "@/data/audio";
import { cn } from "@/lib/utils";

const PREMIUM_BENEFITS = [
  { icon: Radio, title: "Ad-free listening", desc: "Uninterrupted Quran, nasheeds and lectures." },
  { icon: BookOpen, title: "Exclusive lectures", desc: "Full tafseer series from top scholars." },
  { icon: Download, title: "Offline downloads", desc: "Save any track for travel or airplane mode." },
  { icon: Headphones, title: "Studio-quality audio", desc: "320 kbps high-fidelity streaming." },
  { icon: ShieldCheck, title: "Verified halal library", desc: "Every track manually audited." },
  { icon: Sparkles, title: "Premium-only playlists", desc: "Ramadan mixes, deep-dive tafseer." },
];

const AudioSection = () => {
  const { isPremiumUser, togglePremium, playQueue } = usePlayer();
  const [audioCat, setAudioCat] = useState<AudioCategory>("All");

  const filteredTracks = useMemo(
    () => (audioCat === "All" ? tracks : tracks.filter((t) => t.category === audioCat)),
    [audioCat]
  );

  const playAll = () => {
    const q = filteredTracks.filter((t) => !t.isPremium || isPremiumUser);
    if (q.length > 0) playQueue(q, 0);
  };

  return (
    <section className="mx-auto max-w-[1800px] px-4 py-8 md:px-6">
      {/* Premium banner */}
      {!isPremiumUser && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-2xl bg-gradient-hero p-6 md:p-8"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-gold" />
                  <h2 className="font-heading text-xl font-bold text-cream">HalalTube Premium</h2>
                </div>
                <p className="mt-1 text-sm text-cream/70">
                  Everything free, plus exclusive lectures, ad-free playback and offline downloads.
                </p>
              </div>
              <button
                onClick={togglePremium}
                className="shrink-0 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-accent-foreground shadow-lg transition-all hover:brightness-110"
              >
                <Sparkles className="mr-1.5 inline h-4 w-4" />
                Try Premium Free
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PREMIUM_BENEFITS.map((b) => (
                <div key={b.title} className="flex items-start gap-2.5 rounded-lg bg-background/10 p-3 backdrop-blur">
                  <b.icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div>
                    <p className="text-xs font-semibold text-cream">{b.title}</p>
                    <p className="text-[11px] text-cream/70">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {isPremiumUser && (
        <div className="mb-6 flex items-center gap-2">
          <Crown className="h-5 w-5 text-gold" />
          <span className="text-sm font-semibold text-gold">Premium Active</span>
          <button onClick={togglePremium} className="ml-2 text-xs text-muted-foreground underline">
            Switch to Free
          </button>
        </div>
      )}

      {/* Playlists */}
      <h2 className="mb-4 font-heading text-xl font-bold text-foreground">Featured Playlists</h2>
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {playlists.map((pl, i) => (
          <PlaylistCard key={pl.id} playlist={pl} index={i} />
        ))}
      </div>

      {/* Tracks */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-foreground">All Tracks</h2>
        <button
          onClick={playAll}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Play all
        </button>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {audioCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setAudioCat(cat)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-all",
              audioCat === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-muted"
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="space-y-0.5">
        {filteredTracks.map((track, i) => (
          <TrackRow key={track.id} track={track} index={i} queue={filteredTracks} />
        ))}
      </div>
    </section>
  );
};

export default AudioSection;
