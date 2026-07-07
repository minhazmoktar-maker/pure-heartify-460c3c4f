import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import type { Track } from "@/data/audio";
import { toast } from "sonner";

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isPremiumUser: boolean;
  progress: number;
  duration: number;
  volume: number;
  play: (track: Track, queue?: Track[]) => void;
  playQueue: (queue: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  togglePremium: () => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "metadata";
  }

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // When currentTrack changes, load & play
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    if (a.src !== currentTrack.url) {
      a.src = currentTrack.url;
    }
    a.play().catch((err) => {
      console.warn("Playback blocked or failed:", err);
      toast.error("Couldn't start audio", { description: err?.message ?? "Browser blocked playback" });
      setIsPlaying(false);
    });
  }, [currentTrack]);

  // Play/pause sync
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    if (isPlaying) a.play().catch(() => setIsPlaying(false));
    else a.pause();
  }, [isPlaying, currentTrack]);

  // Progress/duration listeners
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => {
      // Auto-advance
      setIsPlaying(false);
      const idx = queue.findIndex((t) => t.id === currentTrack?.id);
      if (idx >= 0 && idx < queue.length - 1) {
        const nxt = queue[idx + 1];
        if (!nxt.isPremium || isPremiumUser) setCurrentTrack(nxt);
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [queue, currentTrack, isPremiumUser]);

  const play = useCallback((track: Track, newQueue?: Track[]) => {
    if (track.isPremium && !isPremiumUser) {
      toast("Premium track", { description: "Unlock Premium to listen to this track." });
      return;
    }
    if (newQueue) setQueue(newQueue);
    else if (queue.length === 0) setQueue([track]);
    setCurrentTrack(track);
    setIsPlaying(true);
  }, [isPremiumUser, queue.length]);

  const playQueue = useCallback((newQueue: Track[], startIndex = 0) => {
    const first = newQueue[startIndex];
    if (!first) return;
    play(first, newQueue);
  }, [play]);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying((p) => !p);
  }, [currentTrack]);

  const next = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    for (let i = idx + 1; i < queue.length; i++) {
      const t = queue[i];
      if (!t.isPremium || isPremiumUser) { setCurrentTrack(t); setIsPlaying(true); return; }
    }
  }, [currentTrack, queue, isPremiumUser]);

  const prev = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const a = audioRef.current;
    if (a && a.currentTime > 3) { a.currentTime = 0; return; }
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    for (let i = idx - 1; i >= 0; i--) {
      const t = queue[i];
      if (!t.isPremium || isPremiumUser) { setCurrentTrack(t); setIsPlaying(true); return; }
    }
  }, [currentTrack, queue, isPremiumUser]);

  const seek = useCallback((seconds: number) => {
    const a = audioRef.current;
    if (a) a.currentTime = seconds;
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);

  const togglePremium = useCallback(() => {
    setIsPremiumUser((p) => {
      const next = !p;
      toast.success(next ? "Premium unlocked ✨" : "Switched to Free");
      return next;
    });
  }, []);

  return (
    <PlayerContext.Provider value={{
      currentTrack, queue, isPlaying, isPremiumUser, progress, duration, volume,
      play, playQueue, togglePlay, next, prev, seek, setVolume, togglePremium,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
