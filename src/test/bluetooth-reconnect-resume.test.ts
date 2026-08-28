/**
 * Offline surah playback must survive a Bluetooth disconnect/reconnect on both
 * iOS and Android:
 *  - iOS resets the media element (readyState 0, currentTime 0) → the position
 *    must be re-applied after `loadedmetadata`.
 *  - Android keeps `currentTime` but pauses → we must re-assert and resume.
 */
import { describe, it, expect, vi } from "vitest";
import { createBluetoothResume, type RouteAudio } from "@/lib/bluetoothResume";

interface FakeAudio extends RouteAudio {
  emit(type: string): void;
  playCalls: number;
  pauseCalls: number;
  setPaused(v: boolean): void;
  setReadyState(v: number): void;
}

function fakeAudio(opts: { currentTime: number; readyState: number; paused?: boolean }): FakeAudio {
  const listeners = new Map<string, Set<() => void>>();
  let paused = opts.paused ?? false;
  let readyState = opts.readyState;
  const audio: FakeAudio = {
    currentTime: opts.currentTime,
    get readyState() { return readyState; },
    get paused() { return paused; },
    playCalls: 0,
    pauseCalls: 0,
    play() { audio.playCalls++; paused = false; },
    pause() { audio.pauseCalls++; paused = true; },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type) { [...(listeners.get(type) ?? [])].forEach((fn) => fn()); },
    setPaused(v) { paused = v; },
    setReadyState(v) { readyState = v; },
  };
  return audio;
}

describe("Bluetooth disconnect/reconnect resume", () => {
  it("Android: keeps position and resumes playback on reconnect", () => {
    const audio = fakeAudio({ currentTime: 412.5, readyState: 4 });
    const saved: number[] = [];
    const events: string[] = [];
    const ctl = createBluetoothResume(audio, {
      platform: "android",
      savePosition: (s) => saved.push(s),
      onEvent: (e) => events.push(e),
    });

    ctl.handleRouteLost();
    expect(ctl.wasPlaying).toBe(true);
    expect(audio.pauseCalls).toBe(1);
    expect(saved).toEqual([412.5]);

    // Android typically keeps currentTime; re-asserting is a no-op seek.
    ctl.handleRouteRestored();
    expect(audio.currentTime).toBeCloseTo(412.5);
    expect(audio.playCalls).toBe(1);
    expect(events).toEqual(["route_lost", "route_restored"]);
  });

  it("iOS: re-seeks after loadedmetadata when the element was reset to 0", () => {
    const audio = fakeAudio({ currentTime: 300, readyState: 4 });
    const ctl = createBluetoothResume(audio, { platform: "ios" });

    ctl.handleRouteLost();
    // iOS tears the route down: element reset, metadata gone.
    audio.currentTime = 0;
    audio.setReadyState(0);

    ctl.handleRouteRestored();
    // Cannot seek yet — iOS rejects currentTime writes before metadata.
    expect(audio.currentTime).toBe(0);
    audio.emit("loadedmetadata");
    expect(audio.currentTime).toBe(300);
    expect(audio.playCalls).toBe(1);
  });

  it("does not auto-resume when the user was already paused before the drop", () => {
    const audio = fakeAudio({ currentTime: 120, readyState: 4, paused: true });
    const ctl = createBluetoothResume(audio, { platform: "ios" });
    ctl.handleRouteLost();
    expect(ctl.wasPlaying).toBe(false);
    ctl.handleRouteRestored();
    expect(audio.playCalls).toBe(0);
    expect(audio.currentTime).toBe(120);
  });

  it("falls back to the persisted position when the element zeroed before disconnect", () => {
    const audio = fakeAudio({ currentTime: 0, readyState: 4 });
    audio.setPaused(false);
    const ctl = createBluetoothResume(audio, {
      platform: "ios",
      getSavedPosition: () => 87,
    });
    ctl.handleRouteLost();
    expect(ctl.position).toBe(0);
    ctl.handleRouteRestored();
    expect(audio.currentTime).toBe(87);
    expect(audio.playCalls).toBe(1);
  });

  it("survives repeated disconnect/reconnect cycles without drifting", () => {
    const audio = fakeAudio({ currentTime: 50, readyState: 4 });
    const ctl = createBluetoothResume(audio, { platform: "android" });
    for (let i = 0; i < 3; i++) {
      ctl.handleRouteLost();
      ctl.handleRouteRestored();
    }
    expect(audio.currentTime).toBeCloseTo(50);
    expect(audio.playCalls).toBe(3);
  });

  it("ignores route changes with no measurable position (early failures)", () => {
    const audio = fakeAudio({ currentTime: 0, readyState: 0 });
    const play = vi.spyOn(audio, "play");
    const ctl = createBluetoothResume(audio, { platform: "web" });
    ctl.handleRouteLost();
    ctl.handleRouteRestored();
    expect(audio.currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(1); // was playing, nothing to seek
  });
});
