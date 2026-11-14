import Hls from "hls.js";
import type { Station, Track } from "../types/radio";

export interface AudioEngineState {
  isPlaying: boolean;
  currentStation: Station | null;
  currentTrack: Track | null;
  volume: number;
  currentTime: number;
  duration: number;
  buffered: number;
  error: string | null;
  isLoading: boolean;
}

type AudioEngineListener = (state: AudioEngineState) => void;

class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private hls: Hls | null = null;
  private state: AudioEngineState = {
    isPlaying: false,
    currentStation: null,
    currentTrack: null,
    volume: 1,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    error: null,
    isLoading: false,
  };
  private listeners: Set<AudioEngineListener> = new Set();
  private mediaSessionSupported: boolean = false;
  private visibilityHandler: (() => void) | null = null;
  private initialized: boolean = false;

  private ensureInitialized(): void {
    if (this.initialized || typeof window === "undefined") return;

    this.audio = new Audio();
    this.audio.preload = "metadata";
    this.audio.crossOrigin = "anonymous";
    this.mediaSessionSupported = "mediaSession" in navigator;
    this.setupAudioEvents();
    this.setupMediaSession();
    this.setupVisibilityHandler();
    this.initialized = true;
  }

  // Get current state without initializing (for SSR)
  getState(): AudioEngineState {
    return { ...this.state };
  }

  private setupAudioEvents(): void {
    if (!this.audio) return;
    this.audio.addEventListener("play", () => this.updateState({ isPlaying: true }));
    this.audio.addEventListener("pause", () => this.updateState({ isPlaying: false }));
    this.audio.addEventListener("timeupdate", () =>
      this.updateState({ currentTime: this.audio!.currentTime }),
    );
    this.audio.addEventListener("durationchange", () =>
      this.updateState({ duration: this.audio!.duration }),
    );
    this.audio.addEventListener("progress", () => this.updateBuffered());
    this.audio.addEventListener("waiting", () => this.updateState({ isLoading: true }));
    this.audio.addEventListener("canplay", () => this.updateState({ isLoading: false }));
    this.audio.addEventListener("error", () => this.handleError());
    this.audio.addEventListener("ended", () => this.handleEnded());
    this.audio.addEventListener("volumechange", () =>
      this.updateState({ volume: this.audio!.volume }),
    );
  }

  private setupMediaSession(): void {
    if (!this.mediaSessionSupported || !this.audio) return;

    navigator.mediaSession.setActionHandler("play", () => this.play());
    navigator.mediaSession.setActionHandler("pause", () => this.pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => this.previous());
    navigator.mediaSession.setActionHandler("nexttrack", () => this.next());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) this.seek(details.seekTime);
    });
  }

  private setupVisibilityHandler(): void {
    if (typeof window === "undefined") return;

    this.visibilityHandler = () => {
      if (document.hidden && this.state.isPlaying) {
        // Optionally pause when tab is hidden
        // this.pause();
      }
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  private updateBuffered(): void {
    if (!this.audio) return;
    const buffered = this.audio.buffered;
    if (buffered.length > 0) {
      const end = buffered.end(buffered.length - 1);
      this.updateState({ buffered: end });
    }
  }

  private handleError(): void {
    const error = this.audio?.error?.message || "Unknown audio error";
    this.updateState({ error, isLoading: false });
    this.cleanupHls();
  }

  private handleEnded(): void {
    this.updateState({ isPlaying: false, currentTime: 0 });
    // Could auto-play next station here
  }

  private updateState(partial: Partial<AudioEngineState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private cleanupHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  private updateMediaSessionMetadata(track: Track | null, station: Station): void {
    if (!this.mediaSessionSupported) return;

    if (track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || station.name,
        artwork: track.artworkUrl
          ? [{ src: track.artworkUrl, sizes: "512x512", type: "image/png" }]
          : station.logoUrl
            ? [{ src: station.logoUrl, sizes: "512x512", type: "image/png" }]
            : [],
      });
    } else {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: station.name,
        artist: "",
        album: "",
        artwork: station.logoUrl
          ? [{ src: station.logoUrl, sizes: "512x512", type: "image/png" }]
          : [],
      });
    }
    navigator.mediaSession.playbackState = this.state.isPlaying ? "playing" : "paused";
  }

  subscribe(listener: AudioEngineListener): () => void {
    this.ensureInitialized();
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async play(station?: Station): Promise<void> {
    this.ensureInitialized();

    if (station && station !== this.state.currentStation) {
      await this.loadStation(station);
    }

    try {
      await this.audio!.play();
      this.updateState({ isPlaying: true });
      if (this.state.currentTrack) {
        this.updateMediaSessionMetadata(this.state.currentTrack, this.state.currentStation!);
      }
    } catch (error) {
      this.updateState({ error: "Playback failed: " + (error as Error).message });
    }
  }

  pause(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.updateState({ isPlaying: false });
    if (this.mediaSessionSupported) {
      navigator.mediaSession.playbackState = "paused";
    }
  }

  toggle(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  async loadStation(station: Station): Promise<void> {
    this.ensureInitialized();
    this.cleanupHls();
    this.updateState({
      currentStation: station,
      currentTrack: null,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      error: null,
      isLoading: true,
    });

    try {
      if (Hls.isSupported()) {
        this.hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          startLevel: -1,
          capLevelToPlayerSize: true,
        });

        this.hls.loadSource(station.streamUrl);
        this.hls.attachMedia(this.audio!);

        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.updateState({ isLoading: false });
        });

        this.hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            this.updateState({
              error: `HLS Error: ${data.type} - ${data.details}`,
              isLoading: false,
            });
          }
        });

        this.hls.on(Hls.Events.LEVEL_SWITCHED, (_, _data) => {
          // Quality changed
        });
      } else if (this.audio!.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari)
        this.audio!.src = station.streamUrl;
        this.updateState({ isLoading: false });
      } else {
        throw new Error("HLS not supported");
      }

      this.updateMediaSessionMetadata(null, station);
    } catch (error) {
      this.updateState({
        error: "Failed to load station: " + (error as Error).message,
        isLoading: false,
      });
    }
  }

  setVolume(volume: number): void {
    if (!this.audio) return;
    this.audio.volume = Math.max(0, Math.min(1, volume));
    this.updateState({ volume: this.audio.volume });
  }

  seek(time: number): void {
    if (!this.audio) return;
    this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, time));
  }

  previous(): void {
    // Implement previous track/station logic
  }

  next(): void {
    // Implement next track/station logic
  }

  updateTrack(track: Track | null): void {
    this.updateState({ currentTrack: track });
    if (this.state.currentStation) {
      this.updateMediaSessionMetadata(track, this.state.currentStation);
    }
  }

  destroy(): void {
    this.pause();
    this.cleanupHls();
    if (this.audio) {
      this.audio.src = "";
    }
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    }
    this.listeners.clear();
    this.updateState({
      isPlaying: false,
      currentStation: null,
      currentTrack: null,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      error: null,
      isLoading: false,
    });
  }
}

export const audioEngine = new AudioEngine();
