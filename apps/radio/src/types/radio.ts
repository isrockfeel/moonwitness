export interface Station {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl?: string;
  streamUrl: string;
  streamType: 'hls' | 'dash';
  metadataUrl?: string;
  genre: string[];
  language: string;
  country: string;
  isActive: boolean;
  sortOrder: number;
  socialLinks?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface Track {
  id: string;
  stationId: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  startTime: number;
  duration?: number;
  isLive: boolean;
  externalUrls?: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
  };
}

export interface ListenerCount {
  stationId: string;
  count: number;
  timestamp: number;
}

export interface StationWithMeta extends Station {
  currentTrack?: Track;
  listenerCount?: number;
  isFavorite?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  meta?: {
    timestamp: number;
    cached?: boolean;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}