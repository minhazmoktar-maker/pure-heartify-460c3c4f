/**
 * Bluetooth / audio-route resilience for the Qur'an player.
 *
 * When a Bluetooth headset or car unit disconnects, the OS tears the audio
 * route down: the `<audio>` element is paused and — on iOS — the media element
 * is frequently reset (`readyState` drops back to 0 and `currentTime` to 0).
 * On reconnect, the transport command from the device (AVRCP `play`) reaches us
 * through Media Session, so we must restore the exact position ourselves.
 *
 * This module is DOM-light on purpose so both the iOS and the Android
 * behaviours can be simulated in unit tests.
 */
import { applyResumePosition, type ResumableAudio } from "@/lib/offlinePlayback";

export type AudioPlatform = "ios" | "android" | "web";

export interface RouteAudio extends ResumableAudio {
  readonly paused: boolean;
  play(): Promise<void> | void;
  pause(): void;
}

export interface BluetoothResumeOptions {
  platform: AudioPlatform;
  /** Persist the position so a full app kill still resumes correctly. */
  savePosition?: (seconds: number) => void;
  /** Fallback position when the element was reset before we could read it. */
  getSavedPosition?: () => number;
  onEvent?: (event: "route_lost" | "route_restored", data: Record<string, unknown>) => void;
}

export interface BluetoothResumeController {
  /** Call when the audio route goes away (headset off, car off, BT drop). */
  handleRouteLost(): void;
  /** Call when a route comes back (device reconnects / transport play). */
  handleRouteRestored(): void;
  /** Last known good position in seconds. */
  readonly position: number;
  /** Whether playback should auto-resume once the route returns. */
  readonly wasPlaying: boolean;
  detach(): void;
}

export function createBluetoothResume(
  audio: RouteAudio,
  opts: BluetoothResumeOptions,
): BluetoothResumeController {
  let position = 0;
  let wasPlaying = false;
  let detachSeek: () => void = () => {};

  return {
    get position() { return position; },
    get wasPlaying() { return wasPlaying; },

    handleRouteLost() {
      const t = Number(audio.currentTime);
      // iOS may already have zeroed the element; keep the last non-zero value.
      if (Number.isFinite(t) && t > 0) {
        position = t;
        opts.savePosition?.(t);
      }
      wasPlaying = !audio.paused;
      if (wasPlaying) {
        try { audio.pause(); } catch { /* noop */ }
      }
      opts.onEvent?.("route_lost", { position, wasPlaying, platform: opts.platform });
    },

    handleRouteRestored() {
      const target = position > 0 ? position : (opts.getSavedPosition?.() ?? 0);
      detachSeek();
      // Android WebView usually keeps `currentTime`; iOS resets it, so always
      // re-assert the position (guarded on `loadedmetadata` when not ready).
      detachSeek = target > 0 ? applyResumePosition(audio, target) : () => {};
      if (wasPlaying) {
        try { void audio.play(); } catch { /* the OS will retry on next command */ }
      }
      opts.onEvent?.("route_restored", { position: target, resumed: wasPlaying, platform: opts.platform });
    },

    detach() { detachSeek(); },
  };
}

/**
 * Wires the controller to real route changes. `mediaDevices.devicechange` is
 * the only cross-platform signal available inside a WebView: a drop in the
 * number of `audiooutput` devices means the Bluetooth sink went away.
 */
export function attachBluetoothResilience(
  audio: RouteAudio,
  opts: BluetoothResumeOptions,
): () => void {
  const controller = createBluetoothResume(audio, opts);
  const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  if (!md?.addEventListener || !md.enumerateDevices) return () => controller.detach();

  let outputs = -1;
  const count = async () => {
    try {
      const devices = await md.enumerateDevices();
      return devices.filter((d) => d.kind === "audiooutput").length;
    } catch { return outputs; }
  };

  const onChange = async () => {
    const now = await count();
    if (outputs >= 0 && now < outputs) controller.handleRouteLost();
    else if (outputs >= 0 && now > outputs) controller.handleRouteRestored();
    outputs = now;
  };

  void count().then((n) => { outputs = n; });
  md.addEventListener("devicechange", onChange);
  return () => {
    md.removeEventListener("devicechange", onChange);
    controller.detach();
  };
}
