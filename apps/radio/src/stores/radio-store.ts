import { create } from 'zustand';
import type { Station, Track } from '../types/radio';
import { audioEngine, type AudioEngineState } from '../services/audio-engine';

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

export const useRadioStore = create<RadioState>()(
  (set, get) => ({
    // Initial state
    stations: [],
    currentStation: null,
    favoriteStationIds: [],
    searchQuery: '',
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
        if (searchQuery && !station.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedGenre && !station.genre.includes(selectedGenre)) return false;
        if (selectedCountry && station.country !== selectedCountry) return false;
        return true;
      });
    },
    isFavorite: (stationId: string) => get().favoriteStationIds.includes(stationId),
  })
);

// Subscribe to audio engine state changes - only on client side
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure DOM is ready and avoid SSR issues
  setTimeout(() => {
    audioEngine.subscribe((state) => {
      useRadioStore.setState({ audioState: state });
    });
  }, 0);
}