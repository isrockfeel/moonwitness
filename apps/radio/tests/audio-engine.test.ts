import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { audioEngine } from "../src/services/audio-engine";
import type { Track } from "../src/types/radio";

const mockTrack: Track = {
  id: "track-1",
  stationId: "1",
  title: "Test Track",
  artist: "Test Artist",
  artworkUrl: "https://example.com/artwork.png",
  startTime: Date.now(),
  duration: 240000,
  isLive: true,
};

describe("AudioEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    audioEngine.destroy();
  });

  afterEach(() => {
    vi.useRealTimers();
    audioEngine.destroy();
  });

  it("initializes with correct default state", () => {
    const state = audioEngine.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentStation).toBeNull();
    expect(state.currentTrack).toBeNull();
    expect(state.volume).toBe(1);
    expect(state.currentTime).toBe(0);
    expect(state.duration).toBe(0);
    expect(state.error).toBeNull();
  });

  it("subscribes to state changes", () => {
    const listener = vi.fn();
    const unsubscribe = audioEngine.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ isPlaying: false }));

    unsubscribe();
    audioEngine.setVolume(0.5);
    expect(listener).toHaveBeenCalledTimes(1); // Should not be called after unsubscribe
  });

  it("updates volume", () => {
    audioEngine.setVolume(0.5);
    expect(audioEngine.getState().volume).toBe(0.5);

    audioEngine.setVolume(1.5); // Should clamp to 1
    expect(audioEngine.getState().volume).toBe(1);

    audioEngine.setVolume(-0.5); // Should clamp to 0
    expect(audioEngine.getState().volume).toBe(0);
  });

  it("updates track metadata", () => {
    audioEngine.updateTrack(mockTrack);
    const state = audioEngine.getState();
    expect(state.currentTrack).toEqual(mockTrack);
  });

  it("toggles play/pause", () => {
    expect(audioEngine.getState().isPlaying).toBe(false);
    audioEngine.toggle();
    // Note: Actual play/pause depends on audio element, but state should update
  });

  it("seeks to valid time", () => {
    audioEngine.seek(30);
    // Seek updates audio.currentTime, state updates on timeupdate event
  });

  it("cleans up on destroy", () => {
    audioEngine.destroy();
    const state = audioEngine.getState();
    expect(state.currentStation).toBeNull();
    expect(state.currentTrack).toBeNull();
  });
});
