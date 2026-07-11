import {
  createContext, useContext, useState, useRef, useEffect, useCallback,
  useMemo, type ReactNode,
} from "react";
import type { Track } from "@/data/audio";
import { trackById } from "@/data/audio";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlement } from "@/hooks/useEntitlement";
import {
  detectPlatform, isIOS, isAndroid,
  persistPositionRemote, useCrossDevicePlayback,
} from "@/hooks/useCrossDevicePlayback";

export type RepeatMode = "off" | "all" | "one";

const RECENT_KEY = "heartify.audio.recent.v1";
const RESUME_KEY = "heartify.audio.resume.v1";
const PLAY_COUNT_KEY = "heartify.audio.plays.v1";
const MAX_RECENT = 20;

interface RecentEntry { id: string; at: number; progress: number; }
type PlayCounts = Record<string, number>;
export interface PlaybackError {
  code: string;
  message: string;
  when: number;
  trackId: string;
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isBuffering: boolean;
  isPremiumUser: boolean;
  isPremiumLoading: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  playbackRate: number;
  /** True while playing a gated 30s preview for a non-entitled listener. */
  isPreview: boolean;
  /** Fixed length (s) of gated previews. */
  previewCapSeconds: number;
  recent: Track[];
  playCounts: PlayCounts;
  lastError: PlaybackError | null;
  needsUserGesture: boolean;
  resumePlayback: () => void;
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
  /** Deprecated no-op kept for backwards compatibility. Entitlements are now server-driven. */
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
  } catch { return fallback; }
};
const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
};

/** Human-readable code from an HTMLMediaElement error. */
const mediaErrorCode = (a: HTMLAudioElement | null): string => {
  const e = a?.error;
  if (!e) return "unknown";
  switch (e.code) {
    case MediaError.MEDIA_ERR_ABORTED: return "aborted";
    case MediaError.MEDIA_ERR_NETWORK: return "network";
    case MediaError.MEDIA_ERR_DECODE:  return "decode";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: return "src_unsupported";
    default: return "unknown";
  }
};

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isPremium: isPremiumUser, loading: isPremiumLoading } = useEntitlement();
  useCrossDevicePlayback();

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [lastError, setLastError] = useState<PlaybackError | null>(null);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>(() =>
    readJson<RecentEntry[]>(RECENT_KEY, []),
  );
  const [playCounts, setPlayCounts] = useState<PlayCounts>(() =>
    readJson<PlayCounts>(PLAY_COUNT_KEY, {}),
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryRef = useRef(0);
  const lastRemoteSaveRef = useRef<number>(0);
  /** When set, current playback is a 30s premium sample for a non-entitled user. */
  const previewCapRef = useRef<number | null>(null);
  const platform = useMemo(() => detectPlatform(), []);
  const mobile = useMemo(() => isIOS() || isAndroid(), []);

  const PREVIEW_SECONDS = 30;

  // Lazily construct audio element. iOS Safari REQUIRES construction inside
  // a user-gesture path AND `preload="none"` to avoid the "delay until user
  // interaction" behaviour that leaves the element in an indefinite waiting
  // state on cellular. `playsinline` prevents fullscreen takeover.
  if (!audioRef.current && typeof Audio !== "undefined") {
    const a = new Audio();
    a.preload = isIOS() ? "none" : "metadata";
    a.crossOrigin = "anonymous";
    // These attributes are ignored on <audio> but keep parity with <video>
    // clones and future casting integrations.
    (a as any).playsInline = true;
    a.setAttribute("playsinline", "");
    a.setAttribute("webkit-playsinline", "");
    audioRef.current = a;
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = playbackRate;
  }, [playbackRate, currentTrack]);

  useEffect(() => writeJson(RECENT_KEY, recentEntries), [recentEntries]);
  useEffect(() => writeJson(PLAY_COUNT_KEY, playCounts), [playCounts]);

  const recordRecent = useCallback((track: Track) => {
    setRecentEntries((prev) => {
      const filtered = prev.filter((r) => r.id !== track.id);
      return [{ id: track.id, at: Date.now(), progress: 0 }, ...filtered].slice(0, MAX_RECENT);
    });
    setPlayCounts((prev) => ({ ...prev, [track.id]: (prev[track.id] ?? 0) + 1 }));
  }, []);

  /** Attempt play(); handle autoplay-policy rejections gracefully. */
  const attemptPlay = useCallback(async (a: HTMLAudioElement) => {
    try {
      await a.play();
      setNeedsUserGesture(false);
      setIsBuffering(false);
    } catch (err: any) {
      setIsBuffering(false);
      // NotAllowedError = autoplay policy. Surface a "tap to play" affordance
      // instead of a scary toast; the user gesture button will retry.
      if (err?.name === "NotAllowedError") {
        setNeedsUserGesture(true);
        setIsPlaying(false);
        return;
      }
      console.warn("Playback failed:", err);
      setLastError({
        code: err?.name ?? "PlayError",
        message: err?.message ?? "Playback failed",
        when: Date.now(),
        trackId: currentTrack?.id ?? "",
      });
      toast.error("Couldn't start audio", {
        description: err?.message ?? "Browser blocked playback",
      });
      setIsPlaying(false);
    }
  }, [currentTrack]);

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
      // iOS Safari won't fire loadedmetadata until it actually starts loading,
      // so call load() explicitly. Harmless on other browsers.
      try { a.load(); } catch { /* noop */ }

      // Restore resume position (local first — remote is merged into local by
      // useCrossDevicePlayback).
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
    attemptPlay(a);
  }, [currentTrack, attemptPlay]);

  // Play/pause sync
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    if (isPlaying) {
      attemptPlay(a);
    } else {
      a.pause();
    }
  }, [isPlaying, currentTrack, attemptPlay]);

  // Merge remote positions once they arrive (fires after login).
  useEffect(() => {
    const onHydrate = () => {
      // If we're currently playing and there's a newer remote position, jump.
      const a = audioRef.current;
      if (!a || !currentTrack) return;
      const resume = readJson<Record<string, number>>(RESUME_KEY, {});
      const savedAt = resume[currentTrack.id];
      if (savedAt && Math.abs(savedAt - a.currentTime) > 15) {
        try { a.currentTime = savedAt; } catch { /* noop */ }
        toast("Resumed from your other device", {
          description: currentTrack.title,
        });
      }
    };
    window.addEventListener("heartify:resume-hydrated", onHydrate);
    return () => window.removeEventListener("heartify:resume-hydrated", onHydrate);
  }, [currentTrack]);

  // Audio element event listeners
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const saveLocal = (pos: number) => {
      if (!currentTrack) return;
      const resume = readJson<Record<string, number>>(RESUME_KEY, {});
      resume[currentTrack.id] = pos;
      writeJson(RESUME_KEY, resume);
    };

    // Throttled remote save (every 15s of playback OR on pause/end).
    const maybeSaveRemote = (pos: number, force = false) => {
      if (!user || !currentTrack) return;
      const now = Date.now();
      if (!force && now - lastRemoteSaveRef.current < 15_000) return;
      lastRemoteSaveRef.current = now;
      persistPositionRemote(user.id, currentTrack.id, pos, a.duration || null).catch(() => {
        /* offline / RLS — silent */
      });
    };

    let lastPos = 0;
    const onTime = () => {
      // On some Android WebViews `currentTime` momentarily drops to 0 when the
      // buffer wraps. Ignore that spurious zero to keep the seek bar smooth.
      if (a.currentTime === 0 && lastPos > 1 && !a.seeking) return;
      lastPos = a.currentTime;
      setProgress(a.currentTime);
      saveLocal(a.currentTime);
      maybeSaveRemote(a.currentTime);
      // Enforce the 30s premium sample cap for non-entitled listeners.
      const cap = previewCapRef.current;
      if (cap != null && a.currentTime >= cap) {
        a.pause();
        setIsPlaying(false);
        previewCapRef.current = null;
        setIsPreview(false);
        window.dispatchEvent(new CustomEvent("heartify:preview-cap-reached", {
          detail: { title: currentTrack?.title, trackId: currentTrack?.id },
        }));
      }
    };
    const onMeta = () => setDuration(a.duration || 0);
    const onWait = () => setIsBuffering(true);
    const onPlaying = () => { setIsBuffering(false); setNeedsUserGesture(false); };
    const onPause = () => maybeSaveRemote(a.currentTime, true);
    const onStalled = () => {
      // On mobile, stalled often self-recovers within a couple seconds. Nudge
      // the pipeline instead of failing hard.
      if (mobile && retryRef.current < 2) {
        retryRef.current += 1;
        try { a.load(); a.play().catch(() => { /* handled by onError */ }); } catch { /* noop */ }
      }
    };
    const onError = () => {
      setIsBuffering(false);
      const code = mediaErrorCode(a);
      const err: PlaybackError = {
        code, message: `Audio error (${code})`,
        when: Date.now(), trackId: currentTrack?.id ?? "",
      };
      setLastError(err);
      if (retryRef.current < 1 && currentTrack?.url) {
        retryRef.current += 1;
        try { a.load(); a.play().catch(() => finalizeError()); } catch { finalizeError(); }
      } else {
        finalizeError();
      }
      function finalizeError() {
        toast.error("Audio unavailable", {
          description: "This track's source didn't respond. Try another or report the issue.",
        });
        setIsPlaying(false);
      }
    };
    const onEnd = () => {
      maybeSaveRemote(a.duration ?? a.currentTime, true);
      // Clear this track from resume so it doesn't re-seek to the end next time.
      const resume = readJson<Record<string, number>>(RESUME_KEY, {});
      if (currentTrack) { delete resume[currentTrack.id]; writeJson(RESUME_KEY, resume); }
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
    a.addEventListener("pause", onPause);
    a.addEventListener("stalled", onStalled);
    a.addEventListener("suspend", onStalled);
    a.addEventListener("error", onError);
    a.addEventListener("ended", onEnd);

    // Save-on-hidden: iOS aggressively suspends background tabs.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") maybeSaveRemote(a.currentTime, true);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("waiting", onWait);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("stalled", onStalled);
      a.removeEventListener("suspend", onStalled);
      a.removeEventListener("error", onError);
      a.removeEventListener("ended", onEnd);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentTrack, repeat, shuffle, isPremiumUser, mobile, user]);

  const playableFrom = useCallback(
    (list: Track[]) => list.filter((t) => !t.comingSoon && t.url && (!t.isPremium || isPremiumUser)),
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
        setCurrentTrack(pick); setIsPlaying(true); recordRecent(pick);
        return;
      }
      const idx = queue.findIndex((t) => t.id === currentTrack.id);
      for (let i = idx + 1; i < queue.length; i++) {
        const t = queue[i];
        if (!t.comingSoon && t.url && (!t.isPremium || isPremiumUser)) {
          setCurrentTrack(t); setIsPlaying(true); recordRecent(t); return;
        }
      }
      if (repeat === "all") {
        const first = playable[0];
        setCurrentTrack(first); setIsPlaying(true); recordRecent(first);
      } else if (auto) {
        setIsPlaying(false);
      }
    },
    [currentTrack, queue, shuffle, repeat, isPremiumUser, playableFrom, recordRecent],
  );

  const goPrev = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const a = audioRef.current;
    if (a && a.currentTime > 3) { a.currentTime = 0; return; }
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    for (let i = idx - 1; i >= 0; i--) {
      const t = queue[i];
      if (!t.comingSoon && t.url && (!t.isPremium || isPremiumUser)) {
        setCurrentTrack(t); setIsPlaying(true); recordRecent(t); return;
      }
    }
  }, [currentTrack, queue, isPremiumUser, recordRecent]);

  const play = useCallback(
    (track: Track, newQueue?: Track[]) => {
      if (track.comingSoon || !track.url) {
        toast("Coming soon", { description: "This track is being curated and will be available shortly." });
        return;
      }
      if (track.isPremium && !isPremiumUser) {
        // Instead of blocking, offer a 30-second sample. The full source URL
        // is still fetched — real bitstream protection lives at the CDN /
        // signed-URL layer for entitled sessions. This surface just gives
        // browsing users an audition before the paywall.
        previewCapRef.current = PREVIEW_SECONDS;
        setIsPreview(true);
        toast("30-second preview", {
          description: `Sampling "${track.title}" — upgrade to hear the full recitation.`,
        });
      } else {
        previewCapRef.current = null;
        setIsPreview(false);
      }
      // iOS: warm up the element inside the user gesture. Setting src + calling
      // play() synchronously is what earns the media element its autoplay
      // permission for later programmatic play() calls.
      const a = audioRef.current;
      if (a && isIOS()) {
        try {
          if (a.src !== track.url) a.src = track.url;
          a.load();
        } catch { /* noop */ }
      }
      if (newQueue) setQueue(newQueue);
      else if (queue.length === 0) setQueue([track]);
      setCurrentTrack(track);
      setIsPlaying(true);
      setNeedsUserGesture(false);
      recordRecent(track);
    },
    [isPremiumUser, queue.length, recordRecent],
  );

  const playQueue = useCallback((newQueue: Track[], startIndex = 0) => {
    const first = newQueue[startIndex];
    if (!first) return;
    play(first, newQueue);
  }, [play]);

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
    setShuffle((s) => { toast(!s ? "Shuffle on" : "Shuffle off"); return !s; });
  }, []);
  const cycleRepeat = useCallback(() => {
    setRepeat((r) => {
      const nxt: RepeatMode = r === "off" ? "all" : r === "all" ? "one" : "off";
      toast(`Repeat ${nxt}`); return nxt;
    });
  }, []);
  const setPlaybackRate = useCallback((rate: number) => setPlaybackRateState(rate), []);
  const togglePremium = useCallback(() => {
    // Client-side premium toggling is gone. Entitlements are granted server-side
    // by an admin (or, later, by a payment webhook). Keep the function so old
    // call sites don't crash while we migrate the UI.
    toast("Premium is now billing-based", {
      description: "Ask an admin for access, or wait for the upgrade flow.",
    });
  }, []);
  const addToQueue = useCallback((track: Track) => {
    if (track.comingSoon) return;
    setQueue((q) => (q.some((t) => t.id === track.id) ? q : [...q, track]));
    toast("Added to queue", { description: track.title });
  }, []);
  const clearQueue = useCallback(() => setQueue(currentTrack ? [currentTrack] : []), [currentTrack]);

  const resumePlayback = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setNeedsUserGesture(false);
    setIsPlaying(true);
    a.play().catch(() => setNeedsUserGesture(true));
  }, []);

  // Media Session
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!currentTrack) return;
    const artwork = typeof currentTrack.cover === "string"
      ? [{ src: currentTrack.cover, sizes: "512x512", type: "image/jpeg" }]
      : [];
    (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
      title: currentTrack.title, artist: currentTrack.artist,
      album: currentTrack.album, artwork,
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

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      switch (e.key) {
        case " ":
          if (currentTrack) { e.preventDefault(); togglePlay(); } break;
        case "ArrowRight":
          if (currentTrack && e.shiftKey) goNext(false);
          else if (currentTrack) seek(Math.min(duration, progress + 10));
          break;
        case "ArrowLeft":
          if (currentTrack && e.shiftKey) goPrev();
          else if (currentTrack) seek(Math.max(0, progress - 10));
          break;
        case "m": case "M": toggleMute(); break;
        case "s": case "S": toggleShuffle(); break;
        case "r": case "R": cycleRepeat(); break;
        default:
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTrack, togglePlay, goNext, goPrev, seek, progress, duration, toggleMute, toggleShuffle, cycleRepeat]);

  const recent = useMemo(
    () => recentEntries.map((r) => trackById.get(r.id)).filter((t): t is Track => !!t),
    [recentEntries],
  );

  // Suppress unused warning for platform (used inside effects & remote save).
  void platform;

  const value: PlayerState = {
    currentTrack, queue, isPlaying, isBuffering, isPremiumUser, isPremiumLoading,
    progress, duration, volume, muted, shuffle, repeat, playbackRate,
    isPreview, previewCapSeconds: PREVIEW_SECONDS,
    recent, playCounts, lastError, needsUserGesture, resumePlayback,
    play, playQueue, togglePlay,
    next: () => goNext(false),
    prev: goPrev,
    seek, setVolume, toggleMute, toggleShuffle, cycleRepeat,
    setPlaybackRate, togglePremium, addToQueue, clearQueue,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};
