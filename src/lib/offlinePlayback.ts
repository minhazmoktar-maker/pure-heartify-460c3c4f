/**
 * Offline-first playback source resolution.
 *
 * When a track has been downloaded, playback must read the Blob out of
 * IndexedDB instead of the network so it works in airplane mode, in a tunnel,
 * and while the phone is locked (the blob URL keeps feeding the same
 * <audio> element that owns the Media Session, so iOS/Android lock-screen
 * controls and Bluetooth transport commands keep working).
 */
import { getOfflineBlobUrlGated } from "@/lib/audioOffline";

export interface ResolvedSource {
  src: string;
  /** True when `src` is an object URL that the caller must revoke later. */
  offline: boolean;
}

export const RESUME_MIN_SECONDS = 5;

/**
 * Prefers the cached blob, falling back to the streaming URL. Never throws —
 * a broken cache must not break playback.
 */
export async function resolvePlaybackSource(track: {
  id: string;
  url?: string | null;
}): Promise<ResolvedSource | null> {
  try {
    const blobUrl = await getOfflineBlobUrlGated(track.id);
    if (blobUrl) return { src: blobUrl, offline: true };
  } catch { /* fall through to streaming */ }
  return track.url ? { src: track.url, offline: false } : null;
}

/**
 * Seeks to a saved position once metadata is available.
 *
 * iOS Safari and some Android WebViews reject `currentTime` writes before
 * `loadedmetadata` (and for blob sources metadata can already be present, in
 * which case we seek immediately). Returns a cleanup function.
 */
export function applyResumePosition(
  audio: Pick<HTMLAudioElement, "addEventListener" | "removeEventListener" | "readyState"> & {
    currentTime: number;
  },
  seconds: number,
): () => void {
  if (!Number.isFinite(seconds) || seconds <= RESUME_MIN_SECONDS) return () => {};
  const seek = () => {
    try { audio.currentTime = seconds; } catch { /* noop */ }
  };
  if (audio.readyState >= 1) {
    seek();
    return () => {};
  }
  const onLoaded = () => {
    seek();
    audio.removeEventListener("loadedmetadata", onLoaded);
  };
  audio.addEventListener("loadedmetadata", onLoaded);
  return () => audio.removeEventListener("loadedmetadata", onLoaded);
}
