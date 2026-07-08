import {
  createContext, useContext, useState, useRef, useEffect, useCallback,
  useMemo, type ReactNode,
} from "react";
import type { Track } from "@/data/audio";
import { trackById } from "@/data/audio";
import { toast } from "sonner";

export type RepeatMode = "off" | "all" | "one";

const RECENT_KEY = "heartify.audio.recent.v1";
const RESUME_KEY = "heartify.audio.resume.v1";
const PLAY_COUNT_KEY = "heartify.audio.plays.v1";
const MAX_RECENT = 20;

interface RecentEntry {
  id: string;
  at: number;
  progress: number;
}
type PlayCounts = Record<string, number>;

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isBuffering: boolean;
  isPremiumUser: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  playbackRate: number;
  recent: Track[];
  playCounts: PlayCounts;
  play: (track: Track, queue?: Track[]) => void;
  playQueue: (queue: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setPlaybackRate: (rate: number) => void;
  togglePremium: () => void;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
};

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>(() =>
    readJson<RecentEntry[]>(RECENT_KEY, []),
  );
  const [playCounts, setPlayCounts] = useState<PlayCounts>(() =>
    readJson<PlayCounts>(PLAY_COUNT_KEY, {}),
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryRef = useRef(0);
  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "metadata";
    audioRef.current.crossOrigin = "anonymous";
  }

  // Volume + mute sync
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted]);

  // Playback rate sync
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = playbackRate;
  }, [playbackRate, currentTrack]);

  // Persist recent + counts
  useEffect(() => writeJson(RECENT_KEY, recentEntries), [recentEntries]);
  useEffect(() => writeJson(PLAY_COUNT_KEY, playCounts), [playCounts]);

  const recordRecent = useCallback((track: Track) => {
    setRecentEntries((prev) => {
      const filtered = prev.filter((r) => r.id !== track.id);
      return [{ id: track.id, at: Date.now(), progress: 0 }, ...filtered].slice(
        0, MAX_RECENT,
      );
    });
    setPlayCounts((prev) => ({ ...prev, [track.id]: (prev[track.id] ?? 0) + 1 }));
  }, []);

  // Load/play when currentTrack changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    if (currentTrack.comingSoon || !currentTrack.url) {
      setIsPlaying(false);
      return;
    }
    if (a.src !== currentTrack.url) {
      a.src = currentTrack.url;
      // Resume from stored position if same track was interrupted mid-play.
      const resume = readJson<Record<string, number>>(RESUME_KEY, {});
      const savedAt = resume[currentTrack.id];
      if (savedAt && savedAt > 5) {
        const onLoaded = () => {
          try { a.currentTime = savedAt; } catch { /* noop */ }
          a.removeEventListener("loadedmetadata", onLoaded);
        };
        a.addEventListener("loadedmetadata", onLoaded);
      }
    }
    setIsBuffering(true);
    retryRef.current = 0;
    a.play()
      .then(() => setIsBuffering(false))
      .catch((err) => {
        setIsBuffering(false);
        console.warn("Playback failed:", err);
        toast.error("Couldn't start audio", {
          description: err?.message ?? "Browser blocked playback",
        });
        setIsPlaying(false);
      });
  }, [currentTrack]);

  // Play/pause sync
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    if (isPlaying) {
      a.play().catch(() => setIsPlaying(false));
    } else {
      a.pause();
    }
  }, [isPlaying, currentTrack]);

  // Audio element event listeners
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setProgress(a.currentTime);
      // Persist resume position (throttled by browser event cadence).
      if (currentTrack) {
        const resume = readJson<Record<string, number>>(RESUME_KEY, {});
        resume[currentTrack.id] = a.currentTime;
        writeJson(RESUME_KEY, resume);
      }
    };
    const onMeta = () => setDuration(a.duration || 0);
    const onWait = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onError = () => {
      setIsBuffering(false);
      if (retryRef.current < 1 && currentTrack?.url) {
        retryRef.current += 1;
        a.load();
        a.play().catch(() => {
          toast.error("Audio unavailable", {
            description: "This track's source didn't respond. Try another.",
          });
          setIsPlaying(false);
        });
      } else {
        toast.error("Audio unavailable", {
          description: "This track's source didn't respond. Try another.",
        });
        setIsPlaying(false);
      }
    };
    const onEnd = () => {
      if (repeat === "one") {
        a.currentTime = 0;
        a.play().catch(() => setIsPlaying(false));
        return;
      }
      goNext(true);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("waiting", onWait);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("error", onError);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("waiting", onWait);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("error", onError);
      a.removeEventListener("ended", onEnd);
    };
    // goNext depends on state; we re-attach when queue/track/mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentTrack, repeat, shuffle, isPremiumUser]);

  const playableFrom = useCallback(
    (list: Track[]) =>
      list.filter((t) => !t.comingSoon && t.url && (!t.isPremium || isPremiumUser)),
    [isPremiumUser],
  );

  const goNext = useCallback(
    (auto = false) => {
      if (!currentTrack || queue.length === 0) return;
      const playable = playableFrom(queue);
      if (playable.length === 0) return;

      if (shuffle) {
        const others = playable.filter((t) => t.id !== currentTrack.id);
        const pick = others[Math.floor(Math.random() * others.length)] ?? playable[0];
        setCurrentTrack(pick);
        setIsPlaying(true);
        recordRecent(pick);
        return;
      }

      const idx = queue.findIndex((t) => t.id === currentTrack.id);
      for (let i = idx + 1; i < queue.length; i++) {
        const t = queue[i];
        if (!t.comingSoon && t.url && (!t.isPremium || isPremiumUser)) {
          setCurrentTrack(t);
          setIsPlaying(true);
          recordRecent(t);
          return;
        }
      }
      if (repeat === "all") {
        const first = playable[0];
        setCurrentTrack(first);
        setIsPlaying(true);
        recordRecent(first);
      } else if (auto) {
        setIsPlaying(false);
      }
    },
    [currentTrack, queue, shuffle, repeat, isPremiumUser, playableFrom, recordRecent],
  );

  const goPrev = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    for (let i = idx - 1; i >= 0; i--) {
      const t = queue[i];
      if (!t.comingSoon && t.url && (!t.isPremium || isPremiumUser)) {
        setCurrentTrack(t);
        setIsPlaying(true);
        recordRecent(t);
        return;
      }
    }
  }, [currentTrack, queue, isPremiumUser, recordRecent]);

  const play = useCallback(
    (track: Track, newQueue?: Track[]) => {
      if (track.comingSoon || !track.url) {
        toast("Coming soon", {
          description: "This track is being curated and will be available shortly.",
        });
        return;
      }
      if (track.isPremium && !isPremiumUser) {
        toast("Premium track", { description: "Unlock Premium to listen." });
        return;
      }
      if (newQueue) setQueue(newQueue);
      else if (queue.length === 0) setQueue([track]);
      setCurrentTrack(track);
      setIsPlaying(true);
      recordRecent(track);
    },
    [isPremiumUser, queue.length, recordRecent],
  );

  const playQueue = useCallback(
    (newQueue: Track[], startIndex = 0) => {
      const first = newQueue[startIndex];
      if (!first) return;
      play(first, newQueue);
    },
    [play],
  );

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying((p) => !p);
  }, [currentTrack]);

  const seek = useCallback((seconds: number) => {
    const a = audioRef.current;
    if (a) a.currentTime = seconds;
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
    if (v > 0) setMuted(false);
  }, []);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  const toggleShuffle = useCallback(() => {
    setShuffle((s) => {
      toast(!s ? "Shuffle on" : "Shuffle off");
      return !s;
    });
  }, []);
  const cycleRepeat = useCallback(() => {
    setRepeat((r) => {
      const nxt: RepeatMode = r === "off" ? "all" : r === "all" ? "one" : "off";
      toast(`Repeat ${nxt}`);
      return nxt;
    });
  }, []);
  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
  }, []);
  const togglePremium = useCallback(() => {
    setIsPremiumUser((p) => {
      const nxt = !p;
      toast.success(nxt ? "Premium unlocked ✨" : "Switched to Free");
      return nxt;
    });
  }, []);
  const addToQueue = useCallback(
    (track: Track) => {
      if (track.comingSoon) return;
      setQueue((q) => (q.some((t) => t.id === track.id) ? q : [...q, track]));
      toast("Added to queue", { description: track.title });
    },
    [],
  );
  const clearQueue = useCallback(() => setQueue(currentTrack ? [currentTrack] : []), [currentTrack]);

  // Media Session API — lock-screen / bluetooth-headset controls
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!currentTrack) return;
    const artwork =
      typeof currentTrack.cover === "string"
        ? [{ src: currentTrack.cover, sizes: "512x512", type: "image/jpeg" }]
        : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork,
    });
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => setIsPlaying(true));
    ms.setActionHandler("pause", () => setIsPlaying(false));
    ms.setActionHandler("previoustrack", goPrev);
    ms.setActionHandler("nexttrack", () => goNext(false));
    ms.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) seek(details.seekTime);
    });
  }, [currentTrack, goPrev, goNext, seek]);

  // Global keyboard shortcuts (ignore when typing in inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      switch (e.key) {
        case " ":
          if (currentTrack) {
            e.preventDefault();
            togglePlay();
          }
          break;
        case "ArrowRight":
          if (currentTrack && e.shiftKey) goNext(false);
          else if (currentTrack) seek(Math.min(duration, progress + 10));
          break;
        case "ArrowLeft":
          if (currentTrack && e.shiftKey) goPrev();
          else if (currentTrack) seek(Math.max(0, progress - 10));
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "s":
        case "S":
          toggleShuffle();
          break;
        case "r":
        case "R":
          cycleRepeat();
          break;
        default:
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTrack, togglePlay, goNext, goPrev, seek, progress, duration, toggleMute, toggleShuffle, cycleRepeat]);

  const recent = useMemo(
    () =>
      recentEntries
        .map((r) => trackById.get(r.id))
        .filter((t): t is Track => !!t),
    [recentEntries],
  );

  const value: PlayerState = {
    currentTrack, queue, isPlaying, isBuffering, isPremiumUser,
    progress, duration, volume, muted, shuffle, repeat, playbackRate,
    recent, playCounts,
    play, playQueue, togglePlay,
    next: () => goNext(false),
    prev: goPrev,
    seek, setVolume, toggleMute, toggleShuffle, cycleRepeat,
    setPlaybackRate, togglePremium, addToQueue, clearQueue,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};
