import { create } from "zustand";
import type { Station, Track } from "../types/radio";
import { audioEngine, type AudioEngineState } from "../services/audio-engine";

interface RadioState {
  // Station state
  stations: Station[];
  currentStation: Station | null;
  favoriteStationIds: string[];
  searchQuery: string;
  selectedGenre: string | null;
  selectedCountry: string | null;

  // Audio state (synced from audioEngine)
  audioState: AudioEngineState;

  // UI state
  isPlayerExpanded: boolean;
  isStationDrawerOpen: boolean;
  isSettingsOpen: boolean;

  // Actions
  setStations: (stations: Station[]) => void;
  setCurrentStation: (station: Station | null) => void;
  toggleFavorite: (stationId: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedGenre: (genre: string | null) => void;
  setSelectedCountry: (country: string | null) => void;
  setPlayerExpanded: (expanded: boolean) => void;
  setStationDrawerOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;

  // Audio actions (delegate to audioEngine)
  play: (station?: Station) => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
  updateTrack: (track: Track | null) => void;

  // Computed
  getFilteredStations: () => Station[];
  isFavorite: (stationId: string) => boolean;
}

const initialAudioState: AudioEngineState = {
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

const createStore = () =>
  create<RadioState>()((set, get) => ({
    // Initial state - same on server and client
    stations: [],
    currentStation: null,
    favoriteStationIds: [],
    searchQuery: "",
    selectedGenre: null,
    selectedCountry: null,
    audioState: initialAudioState,
    isPlayerExpanded: false,
    isStationDrawerOpen: false,
    isSettingsOpen: false,

    // Station actions
    setStations: (stations) => set({ stations }),
    setCurrentStation: (station) => set({ currentStation: station }),
    toggleFavorite: (stationId) =>
      set((state) => ({
        favoriteStationIds: state.favoriteStationIds.includes(stationId)
          ? state.favoriteStationIds.filter((id) => id !== stationId)
          : [...state.favoriteStationIds, stationId],
      })),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSelectedGenre: (genre) => set({ selectedGenre: genre }),
    setSelectedCountry: (country) => set({ selectedCountry: country }),

    // UI actions
    setPlayerExpanded: (expanded) => set({ isPlayerExpanded: expanded }),
    setStationDrawerOpen: (open) => set({ isStationDrawerOpen: open }),
    setSettingsOpen: (open) => set({ isSettingsOpen: open }),

    // Audio actions
    play: async (station) => {
      await audioEngine.play(station);
      if (station) set({ currentStation: station });
    },
    pause: () => audioEngine.pause(),
    togglePlay: () => audioEngine.toggle(),
    setVolume: (volume) => audioEngine.setVolume(volume),
    seek: (time) => audioEngine.seek(time),
    updateTrack: (track) => audioEngine.updateTrack(track),

    // Computed
    getFilteredStations: () => {
      const { stations, searchQuery, selectedGenre, selectedCountry } = get();
      return stations.filter((station) => {
        if (!station.isActive) return false;
        if (searchQuery && !station.name.toLowerCase().includes(searchQuery.toLowerCase()))
          return false;
        if (selectedGenre && !station.genre.includes(selectedGenre)) return false;
        if (selectedCountry && station.country !== selectedCountry) return false;
        return true;
      });
    },
    isFavorite: (stationId: string) => get().favoriteStationIds.includes(stationId),
  }));

// Store instances - completely separate for SSR and client
let clientStoreInstance: ReturnType<typeof createStore> | null = null;
let audioEngineUnsubscribe: (() => void) | null = null;

// SSR store - fresh instance each time with no subscriptions
function createSSRStore() {
  return createStore();
}

// Client store - singleton with audio engine subscription
function createClientStore() {
  if (!clientStoreInstance) {
    clientStoreInstance = createStore();
    // Subscribe to audio engine state changes after store is created
    // Use setTimeout to ensure this runs after hydration
    setTimeout(() => {
      audioEngineUnsubscribe = audioEngine.subscribe((state) => {
        clientStoreInstance!.setState((prev) => {
          // Only update if audio state actually changed (deep comparison)
          const prevAudio = prev.audioState;
          if (
            prevAudio.isPlaying === state.isPlaying &&
            prevAudio.currentStation === state.currentStation &&
            prevAudio.currentTrack === state.currentTrack &&
            prevAudio.volume === state.volume &&
            prevAudio.currentTime === state.currentTime &&
            prevAudio.duration === state.duration &&
            prevAudio.buffered === state.buffered &&
            prevAudio.error === state.error &&
            prevAudio.isLoading === state.isLoading
          ) {
            return prev;
          }
          return { audioState: state };
        });
      });
    }, 0);
  }
  return clientStoreInstance;
}

// Get store - SSR gets fresh instance, client gets singleton
export function getStore() {
  if (typeof window === "undefined") {
    return createSSRStore();
  }
  return createClientStore();
}

// Export a flag to check if we're on client
export function isClientSide() {
  return typeof window !== "undefined";
}

// Export cleanup function for testing
export function cleanupStore() {
  if (audioEngineUnsubscribe) {
    audioEngineUnsubscribe();
    audioEngineUnsubscribe = null;
  }
  clientStoreInstance = null;
}

// Export a hook that returns the store
export function useRadioStore(): RadioState;
export function useRadioStore<T>(selector: (state: RadioState) => T): T;
export function useRadioStore<T>(selector?: (state: RadioState) => T): T | RadioState {
  const store = getStore();
  return selector ? store(selector) : store();
}

